import api from './api';
import type { Ticket, TicketListItem, FormConfig, AnalyticsData, TicketComment } from '../types/issues';

function getHeaders() {
  const userId = localStorage.getItem('issue_user_id');
  const userRole = localStorage.getItem('issue_user_role');
  return userId ? { 'x-user-id': userId, 'x-user-role': userRole || 'reporter' } : {};
}

export const issueService = {
  async login(email: string, fullName?: string): Promise<{ user: { id: string; full_name: string; email: string; phone: string; team: string; role: string } }> {
    const { data } = await api.post('/auth/login', { email, full_name: fullName });
    return data;
  },

  async getFormConfig(): Promise<FormConfig> {
    const { data } = await api.get('/form-config', { headers: getHeaders() });
    return data;
  },

  async getCategories(): Promise<{ areas: any[]; features: any[]; issueTypes: any[] }> {
    const { data } = await api.get('/categories', { headers: getHeaders() });
    return data;
  },

  async getFeatures(areaId: string): Promise<any[]> {
    const { data } = await api.get(`/features/${areaId}`, { headers: getHeaders() });
    return data;
  },

  async getIssueTypes(featureId: string): Promise<any[]> {
    const { data } = await api.get(`/issue-types/${featureId}`, { headers: getHeaders() });
    return data;
  },

  async createTicket(formData: any): Promise<{ ticket: Ticket }> {
    const idempotencyKey = localStorage.getItem('issue_idempotency_key') || crypto.randomUUID();
    localStorage.setItem('issue_idempotency_key', idempotencyKey);
    const { data } = await api.post('/tickets', { ...formData, idempotencyKey }, { headers: getHeaders() });
    localStorage.removeItem('issue_idempotency_key');
    return data;
  },

  async checkDuplicates(params: { product_area_id?: string; feature_id?: string; issue_type_id?: string; merchant_id?: string; title?: string }): Promise<{ duplicates: any[] }> {
    const { data } = await api.post('/tickets/check-duplicates', params, { headers: getHeaders() });
    return data;
  },

  async getMyTickets(page = 1, limit = 20, search = ''): Promise<{ tickets: Ticket[]; total: number }> {
    const { data } = await api.get('/tickets/my', {
      params: { page, limit, search },
      headers: getHeaders(),
    });
    return data;
  },

  async getTicket(ticketId: string): Promise<{ ticket: Ticket }> {
    const { data } = await api.get(`/tickets/${ticketId}`, { headers: getHeaders() });
    return data;
  },

  async addComment(ticketId: string, content: string, visibility = 'reporter'): Promise<{ comment: TicketComment }> {
    const { data } = await api.post(`/tickets/${ticketId}/comments`, { content, visibility }, { headers: getHeaders() });
    return data;
  },

  async uploadFile(file: File): Promise<{ storage_key: string; url: string; thumbnail_url: string | null; original_name: string; mime_type: string; file_size: number; checksum: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/uploads/presign', formData, {
      headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async linkAttachment(ticketId: string, attachmentData: any): Promise<any> {
    const { data } = await api.post(`/tickets/${ticketId}/attachments`, attachmentData, { headers: getHeaders() });
    return data;
  },

  async getAdminTickets(params: Record<string, any>): Promise<{ tickets: TicketListItem[]; total: number; page: number; limit: number }> {
    const { data } = await api.get('/admin/tickets', { params, headers: getHeaders() });
    return data;
  },

  async getAdminTicket(ticketId: string): Promise<{ ticket: Ticket }> {
    const { data } = await api.get(`/admin/tickets/${ticketId}`, { headers: getHeaders() });
    return data;
  },

  async updateTicket(ticketId: string, updates: any): Promise<{ ticket: Ticket }> {
    const { data } = await api.patch(`/admin/tickets/${ticketId}`, updates, { headers: getHeaders() });
    return data;
  },

  async assignTicket(ticketId: string, assigneeId: string): Promise<{ ticket: Ticket }> {
    const { data } = await api.post(`/admin/tickets/${ticketId}/assign`, { assignee_id: assigneeId }, { headers: getHeaders() });
    return data;
  },

  async changeStatus(ticketId: string, statusId: string): Promise<{ ticket: Ticket }> {
    const { data } = await api.post(`/admin/tickets/${ticketId}/status`, { status_id: statusId }, { headers: getHeaders() });
    return data;
  },

  async changePriority(ticketId: string, priorityId: string): Promise<{ ticket: Ticket }> {
    const { data } = await api.post(`/admin/tickets/${ticketId}/priority`, { priority_id: priorityId }, { headers: getHeaders() });
    return data;
  },

  async markDuplicate(ticketId: string, primaryTicketId: string): Promise<{ ticket: Ticket }> {
    const { data } = await api.post(`/admin/tickets/${ticketId}/duplicate`, { primary_ticket_id: primaryTicketId }, { headers: getHeaders() });
    return data;
  },

  async reopenTicket(ticketId: string): Promise<{ ticket: Ticket }> {
    const { data } = await api.post(`/admin/tickets/${ticketId}/reopen`, {}, { headers: getHeaders() });
    return data;
  },

  async bulkUpdate(ticketIds: string[], updates: any): Promise<any> {
    const { data } = await api.post('/admin/tickets/bulk-update', { ticket_ids: ticketIds, ...updates }, { headers: getHeaders() });
    return data;
  },

  async exportTickets(): Promise<Blob> {
    const response = await api.get('/admin/tickets/export', { headers: getHeaders(), responseType: 'blob' });
    return response.data;
  },

  async getAnalytics(): Promise<AnalyticsData> {
    const { data } = await api.get('/admin/analytics', { headers: getHeaders() });
    return data;
  },

  async getUsers(): Promise<{ users: any[] }> {
    const { data } = await api.get('/admin/users', { headers: getHeaders() });
    return data;
  },

  async getAdminUsers(): Promise<{ users: any[] }> {
    const { data } = await api.get('/admin/users/manage', { headers: getHeaders() });
    return data;
  },

  async createUser(userData: any): Promise<any> {
    const { data } = await api.post('/admin/users', userData, { headers: getHeaders() });
    return data;
  },

  async updateUser(userId: string, userData: any): Promise<any> {
    const { data } = await api.put(`/admin/users/${userId}`, userData, { headers: getHeaders() });
    return data;
  },

  // Config CRUD helpers
  async getConfigItems(resource: string): Promise<{ data: any[] }> {
    const { data } = await api.get(`/admin/${resource}`, { headers: getHeaders() });
    return data;
  },

  async createConfigItem(resource: string, item: any): Promise<any> {
    const { data } = await api.post(`/admin/${resource}`, item, { headers: getHeaders() });
    return data;
  },

  async updateConfigItem(resource: string, id: string, item: any): Promise<any> {
    const { data } = await api.put(`/admin/${resource}/${id}`, item, { headers: getHeaders() });
    return data;
  },

  async deleteConfigItem(resource: string, id: string): Promise<any> {
    const { data } = await api.delete(`/admin/${resource}/${id}`, { headers: getHeaders() });
    return data;
  },
};
