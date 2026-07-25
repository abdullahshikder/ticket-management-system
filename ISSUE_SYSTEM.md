# Pathao Commerce Issue Reporting System

## Overview

A complete issue reporting system built into the Pathao Merchant Dashboard. Allows reporters to submit issues with evidence, internal teams to manage and track tickets, and administrators to configure the system.

## Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, react-router-dom v7
- **Backend**: Express.js, TypeScript, SQLite via better-sqlite3
- **File Storage**: Local filesystem (`/uploads/`) with S3-ready abstraction
- **Auth**: Header-based user identification (`x-user-id`, `x-user-role`)

## Database

All tables created in the existing `merchant.db` SQLite database:

### Core Tables
| Table | Purpose |
|-------|---------|
| `issue_users` | Users with roles (reporter, internal, admin) |
| `tickets` | Main issue tickets |
| `ticket_attachments` | File attachments per ticket |
| `ticket_comments` | Internal and reporter-facing comments |
| `ticket_history` | Audit log of all changes |
| `ticket_custom_field_values` | Responses to custom form fields |

### Configuration Tables
| Table | Purpose |
|-------|---------|
| `product_areas` | Product areas (Order Mgmt, Payments, etc.) |
| `features` | Features per product area |
| `issue_types` | Issue types per feature |
| `statuses` | Workflow statuses (New, In Progress, Resolved, etc.) |
| `priorities` | Priority levels (Critical, High, Medium, Low) |
| `custom_fields` | Database-driven form fields |
| `custom_field_options` | Dropdown/select options for custom fields |
| `form_sections` | Form layout sections |
| `notification_logs` | Notification delivery tracking |
| `saved_views` | Saved filter views for internal users |

### Ticket Number Format
`PC-YYYY-NNNNNN` (e.g., `PC-2026-000001`)

## Frontend Routes

| Route | Page | Access |
|-------|------|--------|
| `/issues/report` | Multi-step reporting form | Authenticated |
| `/issues/my` | Reporter's ticket list | Authenticated (reporter) |
| `/issues/:ticketId` | Reporter ticket detail | Ticket owner |
| `/issues/admin` | Internal dashboard with table | Internal/Admin |
| `/issues/admin/:ticketId` | Internal ticket detail | Internal/Admin |
| `/issues/admin/config` | Form configuration | Admin |
| `/issues/admin/users` | User management | Admin |
| `/issues/admin/analytics` | Analytics dashboard | Internal/Admin |

## API Endpoints

### Reporter Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/form-config` | Get form configuration data |
| GET | `/api/categories` | Get product areas, features, issue types |
| GET | `/api/features/:areaId` | Get features for a product area |
| GET | `/api/issue-types/:featureId` | Get issue types for a feature |
| POST | `/api/tickets` | Create a new ticket (with idempotency) |
| POST | `/api/tickets/check-duplicates` | Check for similar existing tickets |
| GET | `/api/tickets/my` | Get current user's tickets |
| GET | `/api/tickets/:ticketId` | Get ticket detail |
| POST | `/api/tickets/:ticketId/comments` | Add a comment |
| POST | `/api/uploads/presign` | Upload a file |
| POST | `/api/tickets/:ticketId/attachments` | Link uploaded file to ticket |

### Internal/Admin Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/tickets` | List all tickets (paginated, filterable) |
| GET | `/api/admin/tickets/:ticketId` | Get full ticket detail |
| PATCH | `/api/admin/tickets/:ticketId` | Update ticket fields |
| POST | `/api/admin/tickets/:ticketId/assign` | Assign owner |
| POST | `/api/admin/tickets/:ticketId/status` | Change status |
| POST | `/api/admin/tickets/:ticketId/priority` | Change priority |
| POST | `/api/admin/tickets/:ticketId/duplicate` | Mark as duplicate |
| POST | `/api/admin/tickets/:ticketId/reopen` | Reopen resolved/closed ticket |
| POST | `/api/admin/tickets/bulk-update` | Bulk update tickets |
| GET | `/api/admin/tickets/export` | Export to CSV |
| GET | `/api/admin/analytics` | Get analytics data |
| GET | `/api/admin/users` | List users |
| GET | `/api/admin/users/manage` | List users (admin) |
| POST | `/api/admin/users` | Create user (admin) |
| PUT | `/api/admin/users/:id` | Update user (admin) |

### Configuration Endpoints
RESTful CRUD for: `product-areas`, `features`, `issue-types`, `statuses`, `priorities`, `custom-fields`, `custom-field-options`, `form-sections`

## Authentication & Permissions

The system uses header-based auth (`x-user-id`, `x-user-role`). Three roles:

- **reporter**: Can submit issues, view own tickets, add comments
- **internal**: Can view all tickets, manage status/priority/assignment, add internal notes
- **admin**: All internal permissions + user management + form configuration

## File Upload

- Files stored in `/uploads/` directory
- Thumbnails generated for images
- Supported: images (10MB), PDFs/documents (20MB), videos (100MB)
- Executable files blocked
- SHA-256 checksum computed for each upload
- Limits configurable via `server/storage.ts`

## Reporting Form (Multi-step)

1. **Your Info** - Name, email, team, phone
2. **Merchant** - Merchant name, ID, phone (optional)
3. **Issue Details** - Title, product area → feature → issue type (cascading), description, platform/browser/OS/version
4. **Impact** - System usability, affected users, workaround, business impact, affected areas
5. **Evidence** - Drag-drop files, paste images, external link
6. **Review** - Summary, duplicate check, submit

Features:
- Idempotency keys prevent duplicate submissions
- Autosave draft to localStorage
- Duplicate detection before submission
- File upload with progress/retry

## Customization

Admins can configure using `/issues/admin/config`:
- Add/edit/disable product areas, features, issue types
- Configure statuses (name, code, colour, order)
- Configure priorities (name, weight, colour)
- Custom fields (database-driven, extendable)

## Test Credentials

After running the seed script:
- **Admin**: Farzana Ahmed (farzana@pathao.com) - role: `admin`
- **Internal**: Rahim Uddin (rahim@pathao.com) - role: `internal`
- **Reporter**: Kamal Hossain (kamal@merchant.com) - role: `reporter`

Use the "Login As" dropdown on the issue system pages to switch roles.

## Running Tests

```bash
# TypeScript compilation check
npm run lint

# Start development (server + client)
npm run dev
```

## Deployment

1. Build the frontend: `npm run build`
2. Set environment variables
3. Start the server: `npm run server` or `node dist/server/index.js`
4. The server serves the built frontend from `dist/`

For PostgreSQL migration: Replace `server/db.ts` with `@prisma/client` or `drizzle-orm`, update `DATABASE_URL` in environment.

## Database Backup

```bash
# SQLite
cp data/merchant.db data/backup-$(date +%Y%m%d).db

# For PostgreSQL (future):
pg_dump pathao_issues > backup-$(date +%Y%m%d).sql
```

## Security Notes

- All API endpoints validate user role before processing
- Reporters can only view their own tickets
- Internal notes are NEVER exposed to reporters
- File uploads are MIME-validated and size-limited
- Ticket ID enumeration is protected (UUID-based internal IDs)
- History records are append-only and not modifiable via UI
- Input validation on both frontend (Zod-equivalent) and backend
