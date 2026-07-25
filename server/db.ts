import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'data', 'merchant.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
      CREATE TABLE IF NOT EXISTS merchant_config (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS parcels (
        id TEXT PRIMARY KEY,
        hashed_id TEXT NOT NULL,
        recipient_name TEXT NOT NULL,
        recipient_phone TEXT NOT NULL,
        sender_address TEXT DEFAULT '',
        recipient_address TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        payment_type TEXT DEFAULT 'Cash on Delivery',
        cod_amount REAL DEFAULT 0,
        charge REAL DEFAULT 0,
        rider_name TEXT DEFAULT '',
        rider_phone TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS issue_users (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL UNIQUE,
        phone TEXT DEFAULT '',
        team TEXT DEFAULT '',
        role TEXT NOT NULL DEFAULT 'reporter' CHECK(role IN ('reporter','internal','admin')),
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
        auth_provider TEXT DEFAULT 'email',
        external_id TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS statuses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        code TEXT NOT NULL UNIQUE,
        colour TEXT NOT NULL DEFAULT '#6b7280',
        display_order INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS priorities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        code TEXT NOT NULL UNIQUE,
        weight INTEGER NOT NULL DEFAULT 0,
        colour TEXT NOT NULL DEFAULT '#6b7280',
        active INTEGER NOT NULL DEFAULT 1
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS product_areas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        display_order INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS features (
        id TEXT PRIMARY KEY,
        product_area_id TEXT NOT NULL REFERENCES product_areas(id),
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        display_order INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        UNIQUE(product_area_id, name)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS issue_types (
        id TEXT PRIMARY KEY,
        feature_id TEXT NOT NULL REFERENCES features(id),
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        display_order INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        UNIQUE(feature_id, name)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS form_sections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        display_order INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS custom_fields (
        id TEXT PRIMARY KEY,
        field_key TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        help_text TEXT DEFAULT '',
        field_type TEXT NOT NULL DEFAULT 'text' CHECK(field_type IN ('text','textarea','number','email','phone','date','datetime','select','multiselect','radio','checkbox','url','file','info','yesno','user')),
        required INTEGER NOT NULL DEFAULT 0,
        configuration_json TEXT DEFAULT '{}',
        validation_json TEXT DEFAULT '{}',
        display_order INTEGER NOT NULL DEFAULT 0,
        section_id TEXT REFERENCES form_sections(id),
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS custom_field_options (
        id TEXT PRIMARY KEY,
        custom_field_id TEXT NOT NULL REFERENCES custom_fields(id),
        label TEXT NOT NULL,
        value TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        ticket_number TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        expected_behaviour TEXT DEFAULT '',
        actual_behaviour TEXT DEFAULT '',
        business_impact TEXT DEFAULT '',
        product_area_id TEXT REFERENCES product_areas(id),
        feature_id TEXT REFERENCES features(id),
        issue_type_id TEXT REFERENCES issue_types(id),
        reporter_id TEXT REFERENCES issue_users(id),
        merchant_name TEXT DEFAULT '',
        merchant_id TEXT DEFAULT '',
        merchant_phone TEXT DEFAULT '',
        status_id TEXT NOT NULL REFERENCES statuses(id),
        priority_id TEXT REFERENCES priorities(id),
        suggested_priority_id TEXT REFERENCES priorities(id),
        assigned_to TEXT REFERENCES issue_users(id),
        duplicate_of_ticket_id TEXT REFERENCES tickets(id),
        affected_user_count INTEGER DEFAULT NULL,
        issue_frequency TEXT DEFAULT '',
        workaround_available INTEGER DEFAULT NULL,
        first_noticed_at TEXT DEFAULT NULL,
        platform TEXT DEFAULT '',
        browser TEXT DEFAULT '',
        device_type TEXT DEFAULT '',
        operating_system TEXT DEFAULT '',
        app_version TEXT DEFAULT '',
        issue_url TEXT DEFAULT '',
        resolution_summary TEXT DEFAULT '',
        resolved_at TEXT DEFAULT NULL,
        closed_at TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        deleted_at TEXT DEFAULT NULL
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS ticket_attachments (
        id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL REFERENCES tickets(id),
        uploaded_by TEXT REFERENCES issue_users(id),
        original_file_name TEXT NOT NULL,
        storage_key TEXT NOT NULL,
        file_type TEXT NOT NULL DEFAULT '',
        mime_type TEXT NOT NULL DEFAULT '',
        file_size INTEGER NOT NULL DEFAULT 0,
        checksum TEXT DEFAULT '',
        preview_storage_key TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS ticket_comments (
        id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL REFERENCES tickets(id),
        author_id TEXT REFERENCES issue_users(id),
        content TEXT NOT NULL,
        visibility TEXT NOT NULL DEFAULT 'internal' CHECK(visibility IN ('internal','reporter')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        deleted_at TEXT DEFAULT NULL
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS ticket_history (
        id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL REFERENCES tickets(id),
        actor_id TEXT REFERENCES issue_users(id),
        event_type TEXT NOT NULL,
        old_value TEXT DEFAULT '',
        new_value TEXT DEFAULT '',
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS ticket_custom_field_values (
        id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL REFERENCES tickets(id),
        custom_field_id TEXT NOT NULL REFERENCES custom_fields(id),
        value_json TEXT NOT NULL DEFAULT '""',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(ticket_id, custom_field_id)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS notification_logs (
        id TEXT PRIMARY KEY,
        ticket_id TEXT REFERENCES tickets(id),
        recipient TEXT NOT NULL,
        notification_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        provider_response TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS saved_views (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES issue_users(id),
        name TEXT NOT NULL,
        filter_json TEXT NOT NULL DEFAULT '{}',
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON tickets(ticket_number);
      CREATE INDEX IF NOT EXISTS idx_tickets_status_id ON tickets(status_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_priority_id ON tickets(priority_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_tickets_product_area_id ON tickets(product_area_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_feature_id ON tickets(feature_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_reporter_id ON tickets(reporter_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_merchant_id ON tickets(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
      CREATE INDEX IF NOT EXISTS idx_tickets_updated_at ON tickets(updated_at);
      CREATE INDEX IF NOT EXISTS idx_tickets_duplicate_of ON tickets(duplicate_of_ticket_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_deleted_at ON tickets(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_features_product_area_id ON features(product_area_id);
      CREATE INDEX IF NOT EXISTS idx_issue_types_feature_id ON issue_types(feature_id);
      CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON ticket_history(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_ticket_custom_field_values_ticket_id ON ticket_custom_field_values(ticket_id);
    `);

    seedDefaults();
  }
  return db;
}

function seedDefaults() {
  const statusCount = db.prepare('SELECT COUNT(*) as c FROM statuses').get() as { c: number };
  if (statusCount.c === 0) {
    const insert = db.prepare('INSERT INTO statuses (id, name, code, colour, display_order, active) VALUES (?, ?, ?, ?, ?, 1)');
    const statuses = [
      ['st-new', 'New', 'new', '#3b82f6', 0],
      ['st-review', 'Under Review', 'under_review', '#8b5cf6', 1],
      ['st-info', 'Information Required', 'information_required', '#f59e0b', 2],
      ['st-confirmed', 'Confirmed', 'confirmed', '#06b6d4', 3],
      ['st-assigned', 'Assigned', 'assigned', '#6366f1', 4],
      ['st-progress', 'In Progress', 'in_progress', '#2563eb', 5],
      ['st-testing', 'Ready for Testing', 'ready_for_testing', '#14b8a6', 6],
      ['st-resolved', 'Resolved', 'resolved', '#10b981', 7],
      ['st-closed', 'Closed', 'closed', '#6b7280', 8],
      ['st-reopened', 'Reopened', 'reopened', '#ef4444', 9],
      ['st-duplicate', 'Duplicate', 'duplicate', '#8b5cf6', 10],
      ['st-rejected', 'Rejected', 'rejected', '#6b7280', 11],
    ];
    for (const s of statuses) insert.run(...s);
  }

  const priorityCount = db.prepare('SELECT COUNT(*) as c FROM priorities').get() as { c: number };
  if (priorityCount.c === 0) {
    const insert = db.prepare('INSERT INTO priorities (id, name, code, weight, colour, active) VALUES (?, ?, ?, ?, ?, 1)');
    const priorities = [
      ['p-critical', 'Critical', 'critical', 4, '#ef4444'],
      ['p-high', 'High', 'high', 3, '#f59e0b'],
      ['p-medium', 'Medium', 'medium', 2, '#3b82f6'],
      ['p-low', 'Low', 'low', 1, '#6b7280'],
    ];
    for (const p of priorities) insert.run(...p);
  }

  const areaCount = db.prepare('SELECT COUNT(*) as c FROM product_areas').get() as { c: number };
  if (areaCount.c === 0) {
    const insert = db.prepare('INSERT INTO product_areas (id, name, description, display_order, active) VALUES (?, ?, ?, ?, 1)');
    const areas = [
      ['pa-order', 'Order Management', 'Order creation, processing, and management', 0],
      ['pa-product', 'Product and Inventory', 'Product catalog and inventory management', 1],
      ['pa-storefront', 'Storefront', 'Online store appearance and customer experience', 2],
      ['pa-courier', 'Courier Integration', 'Standard courier delivery integration', 3],
      ['pa-instant', 'Instant Delivery', 'Pathao Instant delivery service', 4],
      ['pa-daraz', 'Daraz Integration', 'Daraz marketplace integration', 5],
      ['pa-shop', 'Pathao Shop Integration', 'Pathao Shop marketplace', 6],
      ['pa-payment', 'Payment and Settlement', 'Payment processing and settlement', 7],
      ['pa-customer', 'Customer Management', 'Customer relationship management', 8],
      ['pa-analytics', 'Analytics', 'Reporting and analytics', 9],
      ['pa-login', 'Login and Registration', 'Authentication and account management', 10],
      ['pa-warehouse', 'Warehouse', 'Warehouse and fulfillment management', 11],
      ['pa-messaging', 'Messaging', 'Communication and notifications', 12],
      ['pa-other', 'Other', 'Other areas', 13],
    ];
    for (const a of areas) insert.run(...a);
  }

  const featCount = db.prepare('SELECT COUNT(*) as c FROM features').get() as { c: number };
  if (featCount.c === 0) {
    const featInsert = db.prepare('INSERT INTO features (id, product_area_id, name, description, display_order, active) VALUES (?, ?, ?, ?, ?, 1)');

    const orderFeatures: [string, string, string, string, number][] = [
      ['f-order-create', 'pa-order', 'Order creation', '', 0],
      ['f-order-confirm', 'pa-order', 'Order confirmation', '', 1],
      ['f-order-cancel', 'pa-order', 'Order cancellation', '', 2],
      ['f-order-delivery', 'pa-order', 'Delivery request', '', 3],
      ['f-order-status', 'pa-order', 'Order status', '', 4],
      ['f-order-details', 'pa-order', 'Order details', '', 5],
      ['f-order-bulk', 'pa-order', 'Bulk order processing', '', 6],
    ];
    for (const f of orderFeatures) featInsert.run(...f);

    const productFeatures: [string, string, string, string, number][] = [
      ['f-prod-add', 'pa-product', 'Add product', '', 0],
      ['f-prod-edit', 'pa-product', 'Edit product', '', 1],
      ['f-prod-delete', 'pa-product', 'Delete product', '', 2],
      ['f-prod-search', 'pa-product', 'Search products', '', 3],
      ['f-prod-inventory', 'pa-product', 'Inventory tracking', '', 4],
      ['f-prod-variants', 'pa-product', 'Product variants', '', 5],
      ['f-prod-import', 'pa-product', 'Bulk import/export', '', 6],
    ];
    for (const f of productFeatures) featInsert.run(...f);

    const storefrontFeatures: [string, string, string, string, number][] = [
      ['f-store-theme', 'pa-storefront', 'Theme customization', '', 0],
      ['f-store-banner', 'pa-storefront', 'Banners and promotions', '', 1],
      ['f-store-seo', 'pa-storefront', 'SEO settings', '', 2],
      ['f-store-domain', 'pa-storefront', 'Custom domain', '', 3],
      ['f-store-pages', 'pa-storefront', 'Store pages', '', 4],
    ];
    for (const f of storefrontFeatures) featInsert.run(...f);

    const courierFeatures: [string, string, string, string, number][] = [
      ['f-courier-booking', 'pa-courier', 'Parcel booking', '', 0],
      ['f-courier-tracking', 'pa-courier', 'Parcel tracking', '', 1],
      ['f-courier-rate', 'pa-courier', 'Rate calculation', '', 2],
      ['f-courier-area', 'pa-courier', 'Coverage area', '', 3],
    ];
    for (const f of courierFeatures) featInsert.run(...f);

    const instantFeatures: [string, string, string, string, number][] = [
      ['f-instant-request', 'pa-instant', 'Delivery request', '', 0],
      ['f-instant-tracking', 'pa-instant', 'Real-time tracking', '', 1],
      ['f-instant-pricing', 'pa-instant', 'Pricing estimation', '', 2],
    ];
    for (const f of instantFeatures) featInsert.run(...f);

    const issueTypeInsert = db.prepare('INSERT INTO issue_types (id, feature_id, name, description, display_order, active) VALUES (?, ?, ?, ?, ?, 1)');
    const allFeatures = db.prepare('SELECT id FROM features').all() as { id: string }[];
    const commonTypes = [
      ['btn-not-working', 'Button not working'],
      ['incorrect-info', 'Incorrect information'],
      ['missing-info', 'Missing information'],
      ['slow-loading', 'Slow loading'],
      ['permission-issue', 'Permission issue'],
      ['sync-issue', 'Data not syncing'],
      ['duplicate-data', 'Duplicate data'],
      ['unexpected-error', 'Unexpected error'],
      ['feature-unavailable', 'Feature unavailable'],
      ['other', 'Other'],
    ];
    for (const f of allFeatures) {
      for (let i = 0; i < commonTypes.length; i++) {
        issueTypeInsert.run(
          `it-${f.id}-${commonTypes[i][0]}`,
          f.id,
          commonTypes[i][1],
          '',
          i
        );
      }
    }
  }

  const sectionCount = db.prepare('SELECT COUNT(*) as c FROM form_sections').get() as { c: number };
  if (sectionCount.c === 0) {
    const sectionInsert = db.prepare('INSERT INTO form_sections (id, name, description, display_order, active) VALUES (?, ?, ?, ?, 1)');
    sectionInsert.run('sec-reporter', 'Reporter Information', 'Your contact details', 0);
    sectionInsert.run('sec-merchant', 'Merchant Information', 'Details about the affected merchant', 1);
    sectionInsert.run('sec-issue', 'Issue Information', 'Details about the issue', 2);
    sectionInsert.run('sec-impact', 'Urgency and Impact', 'Help us understand the impact', 3);
    sectionInsert.run('sec-evidence', 'Evidence', 'Upload supporting files', 4);
  }
}

export function generateTicketNumber(dbInstance: Database.Database): string {
  const year = new Date().getFullYear();
  const prefix = `PC-${year}-`;
  const last = dbInstance.prepare(
    "SELECT ticket_number FROM tickets WHERE ticket_number LIKE ? ORDER BY ticket_number DESC LIMIT 1"
  ).get(`${prefix}%`) as { ticket_number: string } | undefined;

  let nextNum = 1;
  if (last) {
    const parts = last.ticket_number.split('-');
    nextNum = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(nextNum).padStart(6, '0')}`;
}

export function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getConfig(key: string): string | undefined {
  const row = getDb().prepare('SELECT value FROM merchant_config WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value;
}

export function setConfig(key: string, value: string): void {
  getDb().prepare('INSERT OR REPLACE INTO merchant_config (key, value) VALUES (?, ?)').run(key, value);
}

export function deleteConfig(key: string): void {
  getDb().prepare('DELETE FROM merchant_config WHERE key = ?').run(key);
}
