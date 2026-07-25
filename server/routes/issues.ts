import { Router, Request, Response } from 'express';
import multer from 'multer';
import { getDb, generateTicketNumber, generateId } from '../db';
import { initStorage, validateFile, storeFile, generateStorageKey, computeChecksum, getFileUrl, generateThumbnail, deleteFile, fileExists } from '../storage';

const router = Router();
initStorage();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

function getReqUser(req: Request): { id: string; role: string } | null {
  const userId = req.headers['x-user-id'] as string;
  const userRole = req.headers['x-user-role'] as string;
  if (!userId) return null;
  return { id: userId, role: userRole || 'reporter' };
}

function ensureUser(db: ReturnType<typeof getDb>, userId: string, role: string, name?: string) {
  db.prepare('INSERT OR IGNORE INTO issue_users (id, full_name, email, role) VALUES (?, ?, ?, ?)')
    .run(userId, name || role || 'User', `${userId}@pathao.com`, role);
}

function requireAuth(req: Request, res: Response): { id: string; role: string } | null {
  const user = getReqUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  const db = getDb();
  ensureUser(db, user.id, user.role);
  return user;
}

function requireRole(req: Request, res: Response, roles: string[]): { id: string; role: string } | null {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (!roles.includes(user.role)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return null;
  }
  return user;
}

function recordHistory(db: ReturnType<typeof getDb>, ticketId: string, actorId: string, eventType: string, oldValue: string, newValue: string, metadata: Record<string, unknown> = {}) {
  db.prepare(
    'INSERT INTO ticket_history (id, ticket_id, actor_id, event_type, old_value, new_value, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(generateId(), ticketId, actorId, eventType, oldValue, newValue, JSON.stringify(metadata));
}

function getTicketDetail(db: ReturnType<typeof getDb>, ticketId: string) {
  const ticket = db.prepare(`
    SELECT t.*, 
      s.name as status_name, s.code as status_code, s.colour as status_colour,
      p.name as priority_name, p.code as priority_code, p.colour as priority_colour,
      sp.name as suggested_priority_name,
      r.full_name as reporter_name, r.email as reporter_email, r.phone as reporter_phone, r.team as reporter_team,
      a.full_name as assignee_name,
      pa.name as product_area_name,
      f.name as feature_name,
      it.name as issue_type_name
    FROM tickets t
    LEFT JOIN statuses s ON t.status_id = s.id
    LEFT JOIN priorities p ON t.priority_id = p.id
    LEFT JOIN priorities sp ON t.suggested_priority_id = sp.id
    LEFT JOIN issue_users r ON t.reporter_id = r.id
    LEFT JOIN issue_users a ON t.assigned_to = a.id
    LEFT JOIN product_areas pa ON t.product_area_id = pa.id
    LEFT JOIN features f ON t.feature_id = f.id
    LEFT JOIN issue_types it ON t.issue_type_id = it.id
    WHERE t.id = ? AND t.deleted_at IS NULL
  `).get(ticketId);

  if (!ticket) return null;

  const attachments = db.prepare('SELECT * FROM ticket_attachments WHERE ticket_id = ?').all(ticketId);

  const comments = db.prepare(`
    SELECT c.*, u.full_name as author_name, u.role as author_role
    FROM ticket_comments c
    LEFT JOIN issue_users u ON c.author_id = u.id
    WHERE c.ticket_id = ? AND c.deleted_at IS NULL
    ORDER BY c.created_at ASC
  `).all(ticketId);

  const history = db.prepare(`
    SELECT h.*, u.full_name as actor_name
    FROM ticket_history h
    LEFT JOIN issue_users u ON h.actor_id = u.id
    WHERE h.ticket_id = ?
    ORDER BY h.created_at ASC
  `).all(ticketId);

  const customValues = db.prepare(`
    SELECT v.*, f.label as field_label, f.field_type, f.field_key
    FROM ticket_custom_field_values v
    JOIN custom_fields f ON v.custom_field_id = f.id
    WHERE v.ticket_id = ?
  `).all(ticketId);

  return { ...ticket as Record<string, unknown>, attachments, comments, history, custom_values: customValues };
}

// ─── Public / Reporter Endpoints ───────────────────────────────────────

router.get('/form-config', (_req: Request, res: Response) => {
  const db = getDb();
  const areas = db.prepare('SELECT * FROM product_areas WHERE active = 1 ORDER BY display_order').all();
  const allFeatures = db.prepare('SELECT * FROM features WHERE active = 1 ORDER BY display_order').all();
  const allIssueTypes = db.prepare('SELECT * FROM issue_types WHERE active = 1 ORDER BY display_order').all();
  const statuses = db.prepare('SELECT * FROM statuses WHERE active = 1 ORDER BY display_order').all();
  const priorities = db.prepare('SELECT * FROM priorities WHERE active = 1 ORDER BY weight DESC').all();
  const sections = db.prepare('SELECT * FROM form_sections WHERE active = 1 ORDER BY display_order').all();
  const customFields = db.prepare('SELECT * FROM custom_fields WHERE active = 1 ORDER BY display_order').all();

  const fieldOptions = customFields.length > 0
    ? db.prepare(`SELECT * FROM custom_field_options WHERE custom_field_id IN (${customFields.map(() => '?').join(',')}) AND active = 1 ORDER BY display_order`)
      .all(...customFields.map((f: any) => f.id))
    : [];

  res.json({ areas, features: allFeatures, issueTypes: allIssueTypes, statuses, priorities, sections, customFields, fieldOptions });
});

router.get('/categories', (_req: Request, res: Response) => {
  const db = getDb();
  const areas = db.prepare('SELECT * FROM product_areas WHERE active = 1 ORDER BY display_order').all();
  const features = db.prepare('SELECT * FROM features WHERE active = 1 ORDER BY display_order').all();
  const issueTypes = db.prepare('SELECT * FROM issue_types WHERE active = 1 ORDER BY display_order').all();
  res.json({ areas, features, issueTypes });
});

router.get('/features/:areaId', (req: Request, res: Response) => {
  const db = getDb();
  const features = db.prepare('SELECT * FROM features WHERE product_area_id = ? AND active = 1 ORDER BY display_order').all(req.params.areaId);
  res.json(features);
});

router.get('/issue-types/:featureId', (req: Request, res: Response) => {
  const db = getDb();
  const types = db.prepare('SELECT * FROM issue_types WHERE feature_id = ? AND active = 1 ORDER BY display_order').all(req.params.featureId);
  res.json(types);
});

router.post('/tickets', (req: Request, res: Response) => {
  const db = getDb();
  const user = getReqUser(req);

  if (user) {
    db.prepare('INSERT OR IGNORE INTO issue_users (id, full_name, email, phone, team, role) VALUES (?, ?, ?, ?, ?, ?)')
      .run(user.id, req.body.reporter_name || '', req.body.reporter_email || '', req.body.reporter_phone || '', req.body.reporter_team || '', user.role);
  }

  const { idempotencyKey, ...data } = req.body;

  if (idempotencyKey) {
    const existing = db.prepare("SELECT id FROM ticket_history WHERE event_type = 'created' AND metadata = ?").get(JSON.stringify({ idempotencyKey })) as { id: string } | undefined;
    if (existing) {
      const existingTicket = db.prepare('SELECT id, ticket_number FROM tickets WHERE id = ?').get(existing.id.replace('hist-', ''));
      if (existingTicket) {
        return res.json({ ticket: getTicketDetail(db, (existingTicket as any).id), duplicate: true });
      }
    }
  }

  const ticketId = generateId();
  const ticketNumber = generateTicketNumber(db);
  const statusId = data.status_id || 'st-new';

  const suggestedPriorityId = data.suggested_priority_id || null;
  const priorityId = data.priority_id || null;

  db.prepare(`
    INSERT INTO tickets (id, ticket_number, title, description, expected_behaviour, actual_behaviour,
      business_impact, product_area_id, feature_id, issue_type_id, reporter_id,
      merchant_name, merchant_id, merchant_phone, status_id, priority_id, suggested_priority_id,
      affected_user_count, issue_frequency, workaround_available, first_noticed_at,
      platform, browser, device_type, operating_system, app_version, issue_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    ticketId, ticketNumber, data.title || '', data.description || '', data.expected_behaviour || '',
    data.actual_behaviour || '', data.business_impact || '',
    data.product_area_id || null, data.feature_id || null, data.issue_type_id || null,
    user?.id || data.reporter_id || null,
    data.merchant_name || '', data.merchant_id || '', data.merchant_phone || '',
    statusId, priorityId, suggestedPriorityId,
    data.affected_user_count || null, data.issue_frequency || '', data.workaround_available !== undefined ? (data.workaround_available ? 1 : 0) : null,
    data.first_noticed_at || null, data.platform || '', data.browser || '',
    data.device_type || '', data.operating_system || '', data.app_version || '', data.issue_url || ''
  );

  const histMetadata: Record<string, unknown> = {};
  if (idempotencyKey) histMetadata.idempotencyKey = idempotencyKey;
  recordHistory(db, ticketId, user?.id || 'system', 'created', '', ticketNumber, histMetadata);

  if (user) {
    db.prepare(`UPDATE issue_users SET full_name = COALESCE(NULLIF(?, ''), full_name), phone = COALESCE(NULLIF(?, ''), phone), team = COALESCE(NULLIF(?, ''), team) WHERE id = ?`)
      .run(data.reporter_name || '', data.reporter_phone || '', data.reporter_team || '', user.id);
  }

  if (data.custom_fields && Array.isArray(data.custom_fields)) {
    const insert = db.prepare('INSERT OR REPLACE INTO ticket_custom_field_values (id, ticket_id, custom_field_id, value_json) VALUES (?, ?, ?, ?)');
    for (const cf of data.custom_fields) {
      insert.run(generateId(), ticketId, cf.field_id, JSON.stringify(cf.value));
    }
  }

  const ticket = getTicketDetail(db, ticketId);
  res.status(201).json({ ticket });
});

router.post('/tickets/check-duplicates', (req: Request, res: Response) => {
  const db = getDb();
  const { product_area_id, feature_id, issue_type_id, merchant_id, title } = req.body;

  let query = "SELECT id, ticket_number, title, status_id, created_at FROM tickets WHERE deleted_at IS NULL AND status_id IN ('st-new', 'st-review', 'st-info', 'st-confirmed', 'st-assigned', 'st-progress')";
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (product_area_id) { conditions.push('product_area_id = ?'); params.push(product_area_id); }
  if (feature_id) { conditions.push('feature_id = ?'); params.push(feature_id); }
  if (issue_type_id) { conditions.push('issue_type_id = ?'); params.push(issue_type_id); }
  if (merchant_id) { conditions.push('merchant_id = ?'); params.push(merchant_id); }
  if (title) {
    const words = title.split(' ').filter((w: string) => w.length > 3).slice(0, 5);
    if (words.length > 0) {
      const likeConditions = words.map(() => "title LIKE ?");
      conditions.push(`(${likeConditions.join(' OR ')})`);
      words.forEach((w: string) => params.push(`%${w}%`));
    }
  }

  if (conditions.length === 0) return res.json({ duplicates: [] });

  query += ' AND (' + conditions.join(' AND ') + ')';
  query += ' ORDER BY created_at DESC LIMIT 5';

  const duplicates = db.prepare(query).all(...params);

  const statusMap: Record<string, string> = {};
  const statuses = db.prepare('SELECT id, name FROM statuses').all() as { id: string; name: string }[];
  for (const s of statuses) statusMap[s.id] = s.name;

  const result = (duplicates as any[]).map(d => ({
    id: d.id,
    ticket_number: d.ticket_number,
    title: d.title,
    status: statusMap[d.status_id] || 'Unknown',
    created_at: d.created_at,
  }));

  res.json({ duplicates: result });
});

router.get('/tickets/my', (req: Request, res: Response) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const db = getDb();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;
  const search = req.query.search as string || '';

  let query = `
    SELECT t.id, t.ticket_number, t.title, t.created_at, t.updated_at,
      s.name as status_name, s.code as status_code, s.colour as status_colour,
      p.name as priority_name, p.colour as priority_colour,
      pa.name as product_area_name
    FROM tickets t
    LEFT JOIN statuses s ON t.status_id = s.id
    LEFT JOIN priorities p ON t.priority_id = p.id
    LEFT JOIN product_areas pa ON t.product_area_id = pa.id
    WHERE t.reporter_id = ? AND t.deleted_at IS NULL
  `;
  const params: unknown[] = [user.id];

  if (search) {
    query += ' AND (t.title LIKE ? OR t.ticket_number LIKE ? OR t.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const tickets = db.prepare(query).all(...params);

  const countResult = db.prepare(`
    SELECT COUNT(*) as total FROM tickets WHERE reporter_id = ? AND deleted_at IS NULL
  `).get(user.id) as { total: number };

  res.json({ tickets, total: countResult.total, page, limit });
});

router.get('/tickets/:ticketId', (req: Request, res: Response) => {
  const user = getReqUser(req);
  const db = getDb();
  const ticket = getTicketDetail(db, req.params.ticketId);

  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  if (user && (user as any).role === 'reporter') {
    const t = ticket as any;
    const isOwner = t.reporter_id === user.id;
    if (!isOwner) return res.status(403).json({ error: 'Access denied' });

    t.comments = (t.comments as any[]).filter((c: any) => c.visibility === 'reporter');
  }

  res.json({ ticket });
});

router.post('/tickets/:ticketId/comments', (req: Request, res: Response) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const db = getDb();
  const ticket = db.prepare('SELECT id, reporter_id FROM tickets WHERE id = ? AND deleted_at IS NULL').get(req.params.ticketId) as any;
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const visibility = user.role === 'reporter' ? 'reporter' : (req.body.visibility || 'internal');

  if (user.role === 'reporter' && ticket.reporter_id !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const commentId = generateId();
  db.prepare('INSERT INTO ticket_comments (id, ticket_id, author_id, content, visibility) VALUES (?, ?, ?, ?, ?)')
    .run(commentId, req.params.ticketId, user.id, req.body.content, visibility);

  const comment = db.prepare(`
    SELECT c.*, u.full_name as author_name, u.role as author_role
    FROM ticket_comments c
    LEFT JOIN issue_users u ON c.author_id = u.id
    WHERE c.id = ?
  `).get(commentId);

  recordHistory(db, req.params.ticketId, user.id, 'comment_added', '', visibility, { comment_id: commentId });

  res.status(201).json({ comment });
});

// ─── File Upload ───────────────────────────────────────────────────────

router.post('/uploads/presign', upload.single('file'), async (req: Request, res: Response) => {
  const user = requireAuth(req, res);
  if (!user) return;

  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const validation = validateFile(req.file.mimetype, req.file.size, req.file.originalname);
  if (!validation.valid) return res.status(400).json({ error: validation.error });

  const storageKey = generateStorageKey(req.file.originalname);
  storeFile(req.file.buffer, storageKey);
  const checksum = computeChecksum(req.file.buffer);
  const fileUrl = getFileUrl(storageKey);
  const thumbUrl = generateThumbnail(storageKey, req.file.mimetype);

  res.json({
    storage_key: storageKey,
    url: fileUrl,
    thumbnail_url: thumbUrl,
    original_name: req.file.originalname,
    mime_type: req.file.mimetype,
    file_size: req.file.size,
    checksum,
  });
});

router.post('/tickets/:ticketId/attachments', (req: Request, res: Response) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const db = getDb();
  const ticket = db.prepare('SELECT id, reporter_id FROM tickets WHERE id = ? AND deleted_at IS NULL').get(req.params.ticketId) as any;
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  if (user.role === 'reporter' && ticket.reporter_id !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { storage_key, original_name, mime_type, file_size, checksum } = req.body;
  if (!storage_key) return res.status(400).json({ error: 'storage_key required' });

  const attachId = generateId();
  db.prepare(`
    INSERT INTO ticket_attachments (id, ticket_id, uploaded_by, original_file_name, storage_key, file_type, mime_type, file_size, checksum)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(attachId, req.params.ticketId, user.id, original_name || '', storage_key, mime_type?.split('/')[0] || '', mime_type || '', file_size || 0, checksum || '');

  recordHistory(db, req.params.ticketId, user.id, 'attachment_added', '', original_name || '', { attachment_id: attachId });

  const attachment = db.prepare('SELECT * FROM ticket_attachments WHERE id = ?').get(attachId);
  res.status(201).json({ attachment });
});

// ─── Internal / Admin Endpoints ────────────────────────────────────────

router.get('/admin/tickets', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['internal', 'admin']);
  if (!user) return;

  const db = getDb();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 25;
  const offset = (page - 1) * limit;

  const { search, status, priority, product_area, feature, owner, reporter_team, merchant, date_from, date_to, has_attachment, unassigned, overdue, duplicate } = req.query;

  let where = 'WHERE t.deleted_at IS NULL';
  const params: unknown[] = [];

  if (search) { where += ' AND (t.title LIKE ? OR t.ticket_number LIKE ? OR t.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (status) { where += ' AND t.status_id IN (' + (status as string).split(',').map(() => '?').join(',') + ')'; (status as string).split(',').forEach(s => params.push(s)); }
  if (priority) { where += ' AND t.priority_id IN (' + (priority as string).split(',').map(() => '?').join(',') + ')'; (priority as string).split(',').forEach(p => params.push(p)); }
  if (product_area) { where += ' AND t.product_area_id = ?'; params.push(product_area); }
  if (feature) { where += ' AND t.feature_id = ?'; params.push(feature); }
  if (owner) { where += ' AND t.assigned_to = ?'; params.push(owner); }
  if (reporter_team) { where += ' AND EXISTS (SELECT 1 FROM issue_users u WHERE u.id = t.reporter_id AND u.team = ?)'; params.push(reporter_team); }
  if (merchant) { where += ' AND (t.merchant_name LIKE ? OR t.merchant_id LIKE ?)'; params.push(`%${merchant}%`, `%${merchant}%`); }
  if (date_from) { where += ' AND t.created_at >= ?'; params.push(date_from); }
  if (date_to) { where += ' AND t.created_at <= ?'; params.push(date_to); }
  if (has_attachment === 'true') { where += ' AND EXISTS (SELECT 1 FROM ticket_attachments a WHERE a.ticket_id = t.id)'; }
  if (unassigned === 'true') { where += ' AND t.assigned_to IS NULL'; }
  if (duplicate === 'true') { where += ' AND t.duplicate_of_ticket_id IS NOT NULL'; }

  const countQuery = `SELECT COUNT(*) as total FROM tickets t ${where}`;
  const totalResult = db.prepare(countQuery).get(...params) as { total: number };

  const dataQuery = `
    SELECT t.id, t.ticket_number, t.title, t.created_at, t.updated_at, t.merchant_name,
      s.name as status_name, s.code as status_code, s.colour as status_colour,
      p.name as priority_name, p.code as priority_code, p.colour as priority_colour,
      pa.name as product_area_name,
      r.full_name as reporter_name,
      a.full_name as assignee_name,
      (SELECT COUNT(*) FROM ticket_attachments att WHERE att.ticket_id = t.id) as attachment_count,
      (julianday('now') - julianday(t.created_at)) as age_days
    FROM tickets t
    LEFT JOIN statuses s ON t.status_id = s.id
    LEFT JOIN priorities p ON t.priority_id = p.id
    LEFT JOIN product_areas pa ON t.product_area_id = pa.id
    LEFT JOIN issue_users r ON t.reporter_id = r.id
    LEFT JOIN issue_users a ON t.assigned_to = a.id
    ${where}
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);
  const tickets = db.prepare(dataQuery).all(...params);

  res.json({ tickets, total: totalResult.total, page, limit });
});

router.get('/admin/tickets/export', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['internal', 'admin']);
  if (!user) return;

  const db = getDb();
  const tickets = db.prepare(`
    SELECT t.ticket_number, t.title, t.description, t.created_at, t.updated_at,
      s.name as status, p.name as priority,
      pa.name as product_area, f.name as feature, it.name as issue_type,
      r.full_name as reporter, a.full_name as assignee,
      t.merchant_name, t.merchant_id,
      t.platform, t.browser, t.operating_system
    FROM tickets t
    LEFT JOIN statuses s ON t.status_id = s.id
    LEFT JOIN priorities p ON t.priority_id = p.id
    LEFT JOIN product_areas pa ON t.product_area_id = pa.id
    LEFT JOIN features f ON t.feature_id = f.id
    LEFT JOIN issue_types it ON t.issue_type_id = it.id
    LEFT JOIN issue_users r ON t.reporter_id = r.id
    LEFT JOIN issue_users a ON t.assigned_to = a.id
    WHERE t.deleted_at IS NULL
    ORDER BY t.created_at DESC
  `).all();

  const headers = ['Ticket ID', 'Title', 'Description', 'Status', 'Priority', 'Product Area', 'Feature', 'Issue Type', 'Reporter', 'Assignee', 'Merchant', 'Merchant ID', 'Platform', 'Browser', 'OS', 'Created', 'Updated'];
  const csvRows = [headers.join(',')];
  for (const t of tickets as any[]) {
    csvRows.push([
      escapeCsv(t.ticket_number), escapeCsv(t.title), escapeCsv(t.description),
      escapeCsv(t.status), escapeCsv(t.priority), escapeCsv(t.product_area),
      escapeCsv(t.feature), escapeCsv(t.issue_type), escapeCsv(t.reporter),
      escapeCsv(t.assignee), escapeCsv(t.merchant_name), escapeCsv(t.merchant_id),
      escapeCsv(t.platform), escapeCsv(t.browser), escapeCsv(t.operating_system),
      escapeCsv(t.created_at), escapeCsv(t.updated_at),
    ].join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=tickets-export.csv');
  res.send(csvRows.join('\n'));
});

function escapeCsv(val: string | null | undefined): string {
  if (!val) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

router.get('/admin/tickets/:ticketId', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['internal', 'admin']);
  if (!user) return;

  const db = getDb();
  const ticket = getTicketDetail(db, req.params.ticketId);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  res.json({ ticket });
});

router.patch('/admin/tickets/:ticketId', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['internal', 'admin']);
  if (!user) return;

  const db = getDb();
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? AND deleted_at IS NULL').get(req.params.ticketId) as any;
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const allowed = ['title', 'description', 'expected_behaviour', 'actual_behaviour', 'business_impact',
    'product_area_id', 'feature_id', 'issue_type_id', 'merchant_name', 'merchant_id', 'merchant_phone',
    'affected_user_count', 'issue_frequency', 'workaround_available', 'first_noticed_at',
    'platform', 'browser', 'device_type', 'operating_system', 'app_version', 'issue_url',
    'resolution_summary'];

  const updates: string[] = [];
  const params: unknown[] = [];
  const changes: { field: string; old: string; new: string }[] = [];

  for (const field of allowed) {
    if (req.body[field] !== undefined && req.body[field] !== (ticket as any)[field]) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
      changes.push({ field, old: String((ticket as any)[field] ?? ''), new: String(req.body[field] ?? '') });
    }
  }

  if (updates.length > 0) {
    updates.push('updated_at = datetime(\'now\')');
    params.push(req.params.ticketId);
    db.prepare(`UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    for (const change of changes) {
      recordHistory(db, req.params.ticketId, user.id, `${change.field}_changed`, change.old, change.new);
    }
  }

  const updated = getTicketDetail(db, req.params.ticketId);
  res.json({ ticket: updated });
});

router.post('/admin/tickets/:ticketId/assign', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['internal', 'admin']);
  if (!user) return;

  const db = getDb();
  const ticket = db.prepare('SELECT id, assigned_to FROM tickets WHERE id = ? AND deleted_at IS NULL').get(req.params.ticketId) as any;
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const oldAssignee = ticket.assigned_to || '';
  const newAssignee = req.body.assignee_id || '';

  if (newAssignee) ensureUser(db, newAssignee, 'internal');
  db.prepare('UPDATE tickets SET assigned_to = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newAssignee || null, req.params.ticketId);
  recordHistory(db, req.params.ticketId, user.id, 'assigned', oldAssignee, newAssignee);

  const updated = getTicketDetail(db, req.params.ticketId);
  res.json({ ticket: updated });
});

router.post('/admin/tickets/:ticketId/status', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['internal', 'admin']);
  if (!user) return;

  const db = getDb();
  const ticket = db.prepare('SELECT id, status_id FROM tickets WHERE id = ? AND deleted_at IS NULL').get(req.params.ticketId) as any;
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const oldStatus = ticket.status_id;
  const newStatus = req.body.status_id;

  if (!newStatus) return res.status(400).json({ error: 'status_id required' });

  const statusExists = db.prepare('SELECT id, name FROM statuses WHERE id = ?').get(newStatus) as any;
  if (!statusExists) return res.status(400).json({ error: 'Invalid status' });

  db.prepare('UPDATE tickets SET status_id = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newStatus, req.params.ticketId);
  recordHistory(db, req.params.ticketId, user.id, 'status_changed', oldStatus, newStatus);

  if (newStatus === 'st-resolved') {
    db.prepare('UPDATE tickets SET resolved_at = datetime(\'now\') WHERE id = ?').run(req.params.ticketId);
  }
  if (newStatus === 'st-closed') {
    db.prepare('UPDATE tickets SET closed_at = datetime(\'now\') WHERE id = ?').run(req.params.ticketId);
  }
  if (newStatus === 'st-reopened') {
    db.prepare('UPDATE tickets SET resolved_at = NULL, closed_at = NULL WHERE id = ?').run(req.params.ticketId);
  }

  const updated = getTicketDetail(db, req.params.ticketId);
  res.json({ ticket: updated });
});

router.post('/admin/tickets/:ticketId/priority', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['internal', 'admin']);
  if (!user) return;

  const db = getDb();
  const ticket = db.prepare('SELECT id, priority_id FROM tickets WHERE id = ? AND deleted_at IS NULL').get(req.params.ticketId) as any;
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const oldPriority = ticket.priority_id || '';
  const newPriority = req.body.priority_id;

  if (!newPriority) return res.status(400).json({ error: 'priority_id required' });

  db.prepare('UPDATE tickets SET priority_id = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newPriority, req.params.ticketId);
  recordHistory(db, req.params.ticketId, user.id, 'priority_changed', oldPriority, newPriority);

  const updated = getTicketDetail(db, req.params.ticketId);
  res.json({ ticket: updated });
});

router.post('/admin/tickets/:ticketId/duplicate', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['internal', 'admin']);
  if (!user) return;

  const db = getDb();
  const ticket = db.prepare('SELECT id FROM tickets WHERE id = ? AND deleted_at IS NULL').get(req.params.ticketId) as any;
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const primaryId = req.body.primary_ticket_id;
  if (!primaryId) return res.status(400).json({ error: 'primary_ticket_id required' });

  const primaryExists = db.prepare('SELECT id FROM tickets WHERE id = ? AND deleted_at IS NULL').get(primaryId);
  if (!primaryExists) return res.status(404).json({ error: 'Primary ticket not found' });

  db.prepare('UPDATE tickets SET duplicate_of_ticket_id = ?, status_id = \'st-duplicate\', updated_at = datetime(\'now\') WHERE id = ?')
    .run(primaryId, req.params.ticketId);
  recordHistory(db, req.params.ticketId, user.id, 'marked_duplicate', '', primaryId, { primary_ticket_id: primaryId });

  const updated = getTicketDetail(db, req.params.ticketId);
  res.json({ ticket: updated });
});

router.post('/admin/tickets/:ticketId/reopen', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['internal', 'admin']);
  if (!user) return;

  const db = getDb();
  const ticket = db.prepare('SELECT id, status_id FROM tickets WHERE id = ? AND deleted_at IS NULL').get(req.params.ticketId) as any;
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  db.prepare('UPDATE tickets SET status_id = \'st-reopened\', resolved_at = NULL, closed_at = NULL, updated_at = datetime(\'now\') WHERE id = ?')
    .run(req.params.ticketId);
  recordHistory(db, req.params.ticketId, user.id, 'reopened', ticket.status_id, 'st-reopened');

  const updated = getTicketDetail(db, req.params.ticketId);
  res.json({ ticket: updated });
});

router.post('/admin/tickets/bulk-update', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['internal', 'admin']);
  if (!user) return;

  const db = getDb();
  const { ticket_ids, status_id, priority_id, assignee_id } = req.body;

  if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) {
    return res.status(400).json({ error: 'ticket_ids array required' });
  }

  const placeholders = ticket_ids.map(() => '?').join(',');
  const updates: string[] = [];
  const params: unknown[] = [];

  if (status_id) { updates.push('status_id = ?'); params.push(status_id); }
  if (priority_id) { updates.push('priority_id = ?'); params.push(priority_id); }
  if (assignee_id !== undefined) { updates.push('assigned_to = ?'); params.push(assignee_id || null); }

  if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });

  updates.push("updated_at = datetime('now')");
  params.push(...ticket_ids);

  db.prepare(`UPDATE tickets SET ${updates.join(', ')} WHERE id IN (${placeholders})`).run(...params);

  for (const tid of ticket_ids) {
    recordHistory(db, tid, user.id, 'bulk_updated', '', JSON.stringify({ status_id, priority_id, assignee_id }));
  }

  res.json({ success: true, affected: ticket_ids.length });
});

router.get('/admin/users', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['internal', 'admin']);
  if (!user) return;

  const db = getDb();
  const users = db.prepare('SELECT id, full_name, email, role, team, phone, status, created_at FROM issue_users ORDER BY full_name').all();
  res.json({ users });
});

router.get('/admin/analytics', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['internal', 'admin']);
  if (!user) return;

  const db = getDb();

  const total = (db.prepare("SELECT COUNT(*) as c FROM tickets WHERE deleted_at IS NULL").get() as any).c;
  const open = (db.prepare("SELECT COUNT(*) as c FROM tickets WHERE deleted_at IS NULL AND status_id NOT IN ('st-resolved','st-closed','st-duplicate','st-rejected')").get() as any).c;
  const resolved = (db.prepare("SELECT COUNT(*) as c FROM tickets WHERE deleted_at IS NULL AND status_id IN ('st-resolved','st-closed')").get() as any).c;

  const byArea = db.prepare(`
    SELECT pa.name, COUNT(*) as count FROM tickets t
    JOIN product_areas pa ON t.product_area_id = pa.id
    WHERE t.deleted_at IS NULL
    GROUP BY pa.name ORDER BY count DESC
  `).all();

  const byPriority = db.prepare(`
    SELECT p.name, p.colour, COUNT(*) as count FROM tickets t
    JOIN priorities p ON t.priority_id = p.id
    WHERE t.deleted_at IS NULL
    GROUP BY p.name ORDER BY count DESC
  `).all();

  const byStatus = db.prepare(`
    SELECT s.name, s.colour, COUNT(*) as count FROM tickets t
    JOIN statuses s ON t.status_id = s.id
    WHERE t.deleted_at IS NULL
    GROUP BY s.name ORDER BY count DESC
  `).all();

  const byAssignee = db.prepare(`
    SELECT u.full_name, COUNT(*) as count FROM tickets t
    LEFT JOIN issue_users u ON t.assigned_to = u.id
    WHERE t.deleted_at IS NULL
    GROUP BY u.full_name ORDER BY count DESC LIMIT 10
  `).all();

  const avgResolution = db.prepare(`
    SELECT AVG(julianday(COALESCE(t.resolved_at, t.closed_at, datetime('now'))) - julianday(t.created_at)) as avg_days
    FROM tickets t WHERE t.deleted_at IS NULL AND (t.resolved_at IS NOT NULL OR t.closed_at IS NOT NULL)
  `).get() as { avg_days: number | null };

  const reopened = (db.prepare("SELECT COUNT(*) as c FROM ticket_history WHERE event_type = 'reopened'").get() as any).c;
  const duplicated = (db.prepare("SELECT COUNT(*) as c FROM tickets WHERE deleted_at IS NULL AND duplicate_of_ticket_id IS NOT NULL").get() as any).c;

  const overTime = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM tickets WHERE deleted_at IS NULL AND created_at >= date('now', '-30 days')
    GROUP BY date(created_at) ORDER BY date
  `).all();

  const aging = db.prepare(`
    SELECT
      CASE
        WHEN julianday('now') - julianday(t.created_at) < 1 THEN '< 1 day'
        WHEN julianday('now') - julianday(t.created_at) < 3 THEN '1-3 days'
        WHEN julianday('now') - julianday(t.created_at) < 7 THEN '3-7 days'
        WHEN julianday('now') - julianday(t.created_at) < 14 THEN '1-2 weeks'
        ELSE '> 2 weeks'
      END as bucket, COUNT(*) as count
    FROM tickets t WHERE t.deleted_at IS NULL AND t.status_id NOT IN ('st-resolved','st-closed','st-duplicate','st-rejected')
    GROUP BY bucket ORDER BY MIN(julianday('now') - julianday(t.created_at))
  `).all();

  res.json({
    total, open, resolved,
    by_area: byArea,
    by_priority: byPriority,
    by_status: byStatus,
    by_assignee: byAssignee,
    avg_resolution_days: Math.round((avgResolution.avg_days || 0) * 10) / 10,
    reopened_count: reopened,
    duplicate_count: duplicated,
    new_over_time: overTime,
    aging_tickets: aging,
  });
});

// ─── Admin Configuration Endpoints ─────────────────────────────────────

function crudRoutes(prefix: string, table: string, allowedFields: string[], idField = 'id') {
  const r = Router();

  r.get('/', (_req: Request, res: Response) => {
    const db = getDb();
    const rows = db.prepare(`SELECT * FROM ${table} ORDER BY display_order`).all();
    res.json({ data: rows });
  });

  r.get('/:id', (req: Request, res: Response) => {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM ${table} WHERE ${idField} = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({ data: row });
  });

  r.post('/', (req: Request, res: Response) => {
    const user = requireRole(req, res, ['admin']);
    if (!user) return;

    const db = getDb();
    const id = generateId();
    const fields = [idField, ...allowedFields];
    const values = [id, ...allowedFields.map((f) => req.body[f] ?? '')];
    const placeholders = fields.map(() => '?').join(', ');

    try {
      db.prepare(`INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`).run(...values);
      const row = db.prepare(`SELECT * FROM ${table} WHERE ${idField} = ?`).get(id);
      res.status(201).json({ data: row });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  r.put('/:id', (req: Request, res: Response) => {
    const user = requireRole(req, res, ['admin']);
    if (!user) return;

    const db = getDb();
    const sets = allowedFields.filter(f => req.body[f] !== undefined).map(f => `${f} = ?`);
    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const values = allowedFields.filter(f => req.body[f] !== undefined).map(f => req.body[f]);
    values.push(req.params.id);

    try {
      db.prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE ${idField} = ?`).run(...values);
      const row = db.prepare(`SELECT * FROM ${table} WHERE ${idField} = ?`).get(req.params.id);
      res.json({ data: row });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  r.delete('/:id', (req: Request, res: Response) => {
    const user = requireRole(req, res, ['admin']);
    if (!user) return;

    const db = getDb();
    db.prepare(`DELETE FROM ${table} WHERE ${idField} = ?`).run(req.params.id);
    res.json({ success: true });
  });

  return r;
}

const productAreaFields = ['name', 'description', 'display_order', 'active'];
const featureFields = ['product_area_id', 'name', 'description', 'display_order', 'active'];
const issueTypeFields = ['feature_id', 'name', 'description', 'display_order', 'active'];
const statusFields = ['name', 'code', 'colour', 'display_order', 'active'];
const priorityFields = ['name', 'code', 'weight', 'colour', 'active'];
const customFieldFields = ['field_key', 'label', 'help_text', 'field_type', 'required', 'configuration_json', 'validation_json', 'display_order', 'section_id', 'active'];
const customFieldOptionFields = ['custom_field_id', 'label', 'value', 'display_order', 'active'];
const formSectionFields = ['name', 'description', 'display_order', 'active'];

router.use('/admin/product-areas', crudRoutes('/admin/product-areas', 'product_areas', productAreaFields));
router.use('/admin/features', crudRoutes('/admin/features', 'features', featureFields));
router.use('/admin/issue-types', crudRoutes('/admin/issue-types', 'issue_types', issueTypeFields));
router.use('/admin/statuses', crudRoutes('/admin/statuses', 'statuses', statusFields));
router.use('/admin/priorities', crudRoutes('/admin/priorities', 'priorities', priorityFields));
router.use('/admin/custom-fields', crudRoutes('/admin/custom-fields', 'custom_fields', customFieldFields));
router.use('/admin/custom-field-options', crudRoutes('/admin/custom-field-options', 'custom_field_options', customFieldOptionFields));
router.use('/admin/form-sections', crudRoutes('/admin/form-sections', 'form_sections', formSectionFields));

// User management
router.get('/admin/users/manage', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['admin']);
  if (!user) return;

  const db = getDb();
  const users = db.prepare('SELECT id, full_name, email, phone, team, role, status, created_at FROM issue_users ORDER BY full_name').all();
  res.json({ users });
});

router.post('/admin/users', (req: Request, res: Response) => {
  const admin = requireRole(req, res, ['admin']);
  if (!admin) return;

  const db = getDb();
  const id = generateId();
  const { full_name, email, phone, team, role } = req.body;

  try {
    db.prepare('INSERT INTO issue_users (id, full_name, email, phone, team, role) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, full_name || '', email, phone || '', team || '', role || 'reporter');
    const user = db.prepare('SELECT id, full_name, email, phone, team, role, status, created_at FROM issue_users WHERE id = ?').get(id);
    res.status(201).json({ user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/admin/users/:id', (req: Request, res: Response) => {
  const admin = requireRole(req, res, ['admin']);
  if (!admin) return;

  const db = getDb();
  const fields = ['full_name', 'email', 'phone', 'team', 'role', 'status'].filter(f => req.body[f] !== undefined);
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  const sets = fields.map(f => `${f} = ?`);
  const values = fields.map(f => req.body[f]);
  values.push(req.params.id);

  db.prepare(`UPDATE issue_users SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  const user = db.prepare('SELECT id, full_name, email, phone, team, role, status, created_at FROM issue_users WHERE id = ?').get(req.params.id);
  res.json({ user });
});

// Upload serving
router.get('/uploads/*', (req: Request, res: Response) => {
  const storageKey = req.params[0];
  if (!storageKey || !fileExists(storageKey)) return res.status(404).json({ error: 'File not found' });

  const filePath = require('../storage').getFilePath(storageKey);
  res.sendFile(filePath);
});

router.get('/uploads/thumbnails/*', (req: Request, res: Response) => {
  const thumbKey = req.params[0];
  const thumbPath = require('path').join(require('../storage').THUMB_DIR, thumbKey);
  if (!require('fs').existsSync(thumbPath)) return res.status(404).json({ error: 'Thumbnail not found' });
  res.sendFile(thumbPath);
});

export default router;
