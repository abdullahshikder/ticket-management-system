export interface IssueUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  team: string;
  role: 'reporter' | 'internal' | 'admin';
  status: 'active' | 'inactive';
  created_at: string;
}

export interface ProductArea {
  id: string;
  name: string;
  description: string;
  display_order: number;
  active: number;
}

export interface Feature {
  id: string;
  product_area_id: string;
  name: string;
  description: string;
  display_order: number;
  active: number;
}

export interface IssueType {
  id: string;
  feature_id: string;
  name: string;
  description: string;
  display_order: number;
  active: number;
}

export interface Status {
  id: string;
  name: string;
  code: string;
  colour: string;
  display_order: number;
  active: number;
}

export interface Priority {
  id: string;
  name: string;
  code: string;
  weight: number;
  colour: string;
  active: number;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  expected_behaviour: string;
  actual_behaviour: string;
  business_impact: string;
  product_area_id: string | null;
  feature_id: string | null;
  issue_type_id: string | null;
  reporter_id: string | null;
  merchant_name: string;
  merchant_id: string;
  merchant_phone: string;
  status_id: string;
  priority_id: string | null;
  suggested_priority_id: string | null;
  assigned_to: string | null;
  duplicate_of_ticket_id: string | null;
  affected_user_count: number | null;
  issue_frequency: string;
  workaround_available: number | null;
  first_noticed_at: string | null;
  platform: string;
  browser: string;
  device_type: string;
  operating_system: string;
  app_version: string;
  issue_url: string;
  resolution_summary: string;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  status_name: string;
  status_code: string;
  status_colour: string;
  priority_name: string;
  priority_code: string;
  priority_colour: string;
  suggested_priority_name: string | null;
  reporter_name: string;
  reporter_email: string;
  reporter_phone: string;
  reporter_team: string;
  assignee_name: string | null;
  product_area_name: string;
  feature_name: string;
  issue_type_name: string;
  attachments: TicketAttachment[];
  comments: TicketComment[];
  history: TicketHistory[];
  custom_values: TicketCustomFieldValue[];
}

export interface TicketListItem {
  id: string;
  ticket_number: string;
  title: string;
  created_at: string;
  updated_at: string;
  merchant_name: string;
  status_name: string;
  status_code: string;
  status_colour: string;
  priority_name: string;
  priority_code: string;
  priority_colour: string;
  product_area_name: string;
  reporter_name: string;
  assignee_name: string;
  attachment_count: number;
  age_days: number;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  uploaded_by: string;
  original_file_name: string;
  storage_key: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  checksum: string;
  preview_storage_key: string;
  created_at: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_id: string;
  content: string;
  visibility: 'internal' | 'reporter';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  author_name: string;
  author_role: string;
}

export interface TicketHistory {
  id: string;
  ticket_id: string;
  actor_id: string;
  event_type: string;
  old_value: string;
  new_value: string;
  metadata: string;
  created_at: string;
  actor_name: string;
}

export interface TicketCustomFieldValue {
  id: string;
  ticket_id: string;
  custom_field_id: string;
  value_json: string;
  created_at: string;
  field_label: string;
  field_type: string;
  field_key: string;
}

export interface FormSection {
  id: string;
  name: string;
  description: string;
  display_order: number;
  active: number;
}

export interface CustomField {
  id: string;
  field_key: string;
  label: string;
  help_text: string;
  field_type: string;
  required: number;
  configuration_json: string;
  validation_json: string;
  display_order: number;
  section_id: string;
  active: number;
}

export interface CustomFieldOption {
  id: string;
  custom_field_id: string;
  label: string;
  value: string;
  display_order: number;
  active: number;
}

export interface FormConfig {
  areas: ProductArea[];
  features: Feature[];
  issueTypes: IssueType[];
  statuses: Status[];
  priorities: Priority[];
  sections: FormSection[];
  customFields: CustomField[];
  fieldOptions: CustomFieldOption[];
}

export interface TicketFormData {
  title: string;
  description: string;
  expected_behaviour: string;
  actual_behaviour: string;
  business_impact: string;
  product_area_id: string;
  feature_id: string;
  issue_type_id: string;
  merchant_name: string;
  merchant_id: string;
  merchant_phone: string;
  reporter_name: string;
  reporter_email: string;
  reporter_phone: string;
  reporter_team: string;
  affected_user_count: number | null;
  issue_frequency: string;
  workaround_available: boolean | null;
  first_noticed_at: string;
  platform: string;
  browser: string;
  device_type: string;
  operating_system: string;
  app_version: string;
  issue_url: string;
  suggested_priority_id: string;
  [key: `cf_${string}`]: unknown;
}

export interface AnalyticsData {
  total: number;
  open: number;
  resolved: number;
  by_area: { name: string; count: number }[];
  by_priority: { name: string; colour: string; count: number }[];
  by_status: { name: string; colour: string; count: number }[];
  by_assignee: { full_name: string; count: number }[];
  avg_resolution_days: number;
  reopened_count: number;
  duplicate_count: number;
  new_over_time: { date: string; count: number }[];
  aging_tickets: { bucket: string; count: number }[];
}
