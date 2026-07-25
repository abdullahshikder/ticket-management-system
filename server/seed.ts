import { getDb, generateId, generateTicketNumber } from './db.js';

const db = getDb();

// Seed users
const internalUserId = generateId();
const adminUserId = generateId();
const reporterUserId = generateId();

db.prepare(`INSERT OR IGNORE INTO issue_users (id, full_name, email, phone, team, role) VALUES (?, ?, ?, ?, ?, ?)`)
  .run(internalUserId, 'Rahim Uddin', 'rahim@pathao.com', '01711111111', 'Engineering', 'internal');

db.prepare(`INSERT OR IGNORE INTO issue_users (id, full_name, email, phone, team, role) VALUES (?, ?, ?, ?, ?, ?)`)
  .run(adminUserId, 'Farzana Ahmed', 'farzana@pathao.com', '01722222222', 'Product', 'admin');

db.prepare(`INSERT OR IGNORE INTO issue_users (id, full_name, email, phone, team, role) VALUES (?, ?, ?, ?, ?, ?)`)
  .run(reporterUserId, 'Kamal Hossain', 'kamal@merchant.com', '01733333333', 'Merchant Operations', 'reporter');

// Get default status and priority IDs
const newStatus = (db.prepare("SELECT id FROM statuses WHERE code = 'new'").get() as any)?.id || 'st-new';
const inProgress = (db.prepare("SELECT id FROM statuses WHERE code = 'in_progress'").get() as any)?.id || 'st-progress';
const resolved = (db.prepare("SELECT id FROM statuses WHERE code = 'resolved'").get() as any)?.id || 'st-resolved';
const highPriority = (db.prepare("SELECT id FROM priorities WHERE code = 'high'").get() as any)?.id || 'p-high';
const mediumPriority = (db.prepare("SELECT id FROM priorities WHERE code = 'medium'").get() as any)?.id || 'p-medium';
const lowPriority = (db.prepare("SELECT id FROM priorities WHERE code = 'low'").get() as any)?.id || 'p-low';

// Get some product areas, features, issue types
const orderArea = db.prepare("SELECT id FROM product_areas WHERE name = 'Order Management'").get() as any;
const productArea = db.prepare("SELECT id FROM product_areas WHERE name = 'Product and Inventory'").get() as any;
const paymentArea = db.prepare("SELECT id FROM product_areas WHERE name = 'Payment and Settlement'").get() as any;

const orderCreateFeature = orderArea ? db.prepare("SELECT id FROM features WHERE product_area_id = ? AND name = 'Order creation'").get(orderArea.id) as any : null;
const productAddFeature = productArea ? db.prepare("SELECT id FROM features WHERE product_area_id = ? AND name = 'Add product'").get(productArea.id) as any : null;
const paymentFeature = paymentArea ? db.prepare("SELECT id FROM features WHERE product_area_id = ? AND name LIKE '%settlement%'").get(paymentArea.id) as any : null;

const btnNotWorkingType = orderCreateFeature ? db.prepare("SELECT id FROM issue_types WHERE feature_id = ? AND name = 'Button not working'").get(orderCreateFeature.id) as any : null;
const incorrectInfoType = productAddFeature ? db.prepare("SELECT id FROM issue_types WHERE feature_id = ? AND name = 'Incorrect information'").get(productAddFeature.id) as any : null;
const syncIssueType = paymentFeature ? db.prepare("SELECT id FROM issue_types WHERE feature_id = ? AND name = 'Data not syncing'").get(paymentFeature.id) as any : null;

// Create sample tickets
const sampleTickets = [
  {
    title: 'Order status not updating after delivery confirmation',
    description: 'After marking an order as delivered, the status remains "In Transit" for several hours. This is causing confusion for both merchants and customers.',
    expected_behaviour: 'Order status should update to "Delivered" immediately after delivery confirmation.',
    actual_behaviour: 'Order status stays "In Transit" for 2-4 hours before updating.',
    business_impact: 'Customers are calling merchants asking about delivery status. COD settlements are delayed.',
    product_area_id: orderArea?.id || null,
    feature_id: orderCreateFeature?.id || null,
    issue_type_id: btnNotWorkingType?.id || null,
    status_id: inProgress,
    priority_id: highPriority,
    suggested_priority_id: highPriority,
    assigned_to: internalUserId,
    merchant_name: 'Rahim Fashion',
    merchant_id: 'M-8022',
    platform: 'Web Dashboard',
    browser: 'Chrome 120',
    operating_system: 'Windows 11',
    issue_frequency: 'always',
    workaround_available: 0,
    affected_user_count: 15,
  },
  {
    title: 'Product images not loading in storefront',
    description: 'When viewing products in the online store, images fail to load for approximately 30% of products. The image URLs return 404 errors.',
    expected_behaviour: 'All product images should display correctly in the storefront.',
    actual_behaviour: 'Broken image placeholders shown for many products.',
    business_impact: 'Customers cannot see products properly, leading to reduced sales.',
    product_area_id: productArea?.id || null,
    feature_id: productAddFeature?.id || null,
    issue_type_id: incorrectInfoType?.id || null,
    status_id: newStatus,
    priority_id: mediumPriority,
    suggested_priority_id: mediumPriority,
    assigned_to: null,
    merchant_name: 'Desi Cart',
    merchant_id: 'M-9012',
    platform: 'Storefront',
    browser: 'Safari 17',
    operating_system: 'macOS 14',
    issue_frequency: 'often',
    workaround_available: 1,
    affected_user_count: 8,
  },
  {
    title: 'COD settlement report showing incorrect amounts',
    description: 'The weekly COD settlement report shows different amounts than what was actually collected. The difference is approximately 2-3% lower.',
    expected_behaviour: 'Settlement report should match actual COD collection amounts.',
    actual_behaviour: 'Settlement amounts are consistently lower than actual collections.',
    business_impact: 'Merchants are receiving less than expected settlement amounts.',
    product_area_id: paymentArea?.id || null,
    feature_id: paymentFeature?.id || null,
    issue_type_id: syncIssueType?.id || null,
    status_id: resolved,
    priority_id: highPriority,
    suggested_priority_id: highPriority,
    assigned_to: internalUserId,
    merchant_name: 'Tech Bazaar',
    merchant_id: 'M-7011',
    platform: 'Web Dashboard',
    browser: 'Firefox 122',
    operating_system: 'Windows 10',
    issue_frequency: 'always',
    workaround_available: 0,
    affected_user_count: 45,
    resolution_summary: 'Fixed a rounding error in the settlement calculation. The fix has been deployed and verified.',
    resolved_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

for (const t of sampleTickets) {
  const ticketId = generateId();
  const ticketNumber = generateTicketNumber(db);

  db.prepare(`
    INSERT INTO tickets (id, ticket_number, title, description, expected_behaviour, actual_behaviour,
      business_impact, product_area_id, feature_id, issue_type_id, reporter_id,
      merchant_name, merchant_id, status_id, priority_id, suggested_priority_id,
      assigned_to, affected_user_count, issue_frequency, workaround_available,
      platform, browser, operating_system, resolution_summary, resolved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    ticketId, ticketNumber, t.title, t.description, t.expected_behaviour, t.actual_behaviour,
    t.business_impact, t.product_area_id, t.feature_id, t.issue_type_id, reporterUserId,
    t.merchant_name, t.merchant_id, t.status_id, t.priority_id, t.suggested_priority_id,
    t.assigned_to, t.affected_user_count, t.issue_frequency, t.workaround_available,
    t.platform, t.browser, t.operating_system, t.resolution_summary || '', t.resolved_at || null
  );

  const eventType = t.status_id === resolved ? 'resolved' : 'created';
  db.prepare(`INSERT INTO ticket_history (id, ticket_id, actor_id, event_type, old_value, new_value) VALUES (?, ?, ?, ?, '', ?)`)
    .run(generateId(), ticketId, reporterUserId, eventType, ticketNumber);

  if (t.assigned_to) {
    db.prepare(`INSERT INTO ticket_history (id, ticket_id, actor_id, event_type, old_value, new_value) VALUES (?, ?, ?, 'assigned', '', ?)`)
      .run(generateId(), ticketId, internalUserId, t.assigned_to);
  }

  if (t.status_id === inProgress) {
    db.prepare(`INSERT INTO ticket_history (id, ticket_id, actor_id, event_type, old_value, new_value) VALUES (?, ?, ?, 'status_changed', ?, ?)`)
      .run(generateId(), ticketId, internalUserId, 'st-new', inProgress);
  }

  if (t.resolved_at) {
    db.prepare(`INSERT INTO ticket_history (id, ticket_id, actor_id, event_type, old_value, new_value) VALUES (?, ?, ?, 'status_changed', ?, ?)`)
      .run(generateId(), ticketId, internalUserId, inProgress, resolved);
  }
}

console.log('Seed data created successfully!');
console.log(`- Internal User ID: ${internalUserId}`);
console.log(`- Admin User ID: ${adminUserId}`);
console.log(`- Reporter User ID: ${reporterUserId}`);
console.log('Run with: npx tsx server/seed.ts');
