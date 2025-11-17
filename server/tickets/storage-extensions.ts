import type { 
  InsertTicketsTicket,
  InsertTicketsOrder,
  InsertTicketsAudit,
  TicketsTicket,
  TicketsOrder
} from '@shared/schema';
import { getSupabaseAdmin } from '../supabaseAdmin';
import { pool } from './tickets-db';

export class StorageExtensions {
  
  // Helper: Convert camelCase to snake_case
  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
  
  // Helper: Convert snake_case to camelCase
  private toCamelCase(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.toCamelCase(item));
    }
    
    if (obj instanceof Date || typeof obj !== 'object') {
      return obj;
    }
    
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = this.toCamelCase(value);
    }
    return result;
  }
  
  // ============ TICKET REFUND OPERATIONS ============
  async updateTicket(id: string, data: any): Promise<TicketsTicket> {
    const supabase = getSupabaseAdmin();
    
    // Convert camelCase keys to snake_case
    const snakeCaseData: any = {};
    for (const [key, value] of Object.entries(data)) {
      snakeCaseData[this.toSnakeCase(key)] = value;
    }
    
    const { data: result, error } = await supabase
      .from('tickets_tickets')
      .update({ ...snakeCaseData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update ticket: ${error.message}`);
    return result;
  }
  
  // ============ ORDER OPERATIONS ============
  async getOrdersByEvent(eventId: string): Promise<TicketsOrder[]> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('tickets_orders')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to get orders by event: ${error.message}`);
    return data || [];
  }
  
  async getOrdersByBuyer(email: string): Promise<TicketsOrder[]> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('tickets_orders')
      .select('*')
      .eq('buyer_email', email)
      .eq('status', 'paid')
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to get orders: ${error.message}`);
    return data || [];
  }
  
  async getOrdersByUserId(userId: string): Promise<TicketsOrder[]> {
    // First get user email from Supabase (main DB)
    const user = await this.getUserById(userId);
    if (!user || !user.email) {
      return [];
    }
    
    // Then query orders by email using Supabase client
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('tickets_orders')
      .select('*')
      .eq('buyer_email', user.email)
      .eq('status', 'paid')
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to get user orders: ${error.message}`);
    return data || [];
  }
  
  // ============ TICKET OPERATIONS ============
  // TODO: Migrate to SQL view or Supabase RPC (complex 3-table JOIN)
  async getTicketsByEvent(eventId: string): Promise<TicketsTicket[]> {
    const query = `
      SELECT t.* FROM tickets_tickets t
      JOIN tickets_order_items oi ON oi.id = t.order_item_id
      JOIN tickets_orders o ON o.id = oi.order_id
      WHERE o.event_id = $1
      ORDER BY t.created_at DESC
    `;
    const result = await pool.query(query, [eventId]);
    return result.rows;
  }
  
  async getTicketsByOrderItem(orderItemId: string): Promise<TicketsTicket[]> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('tickets_tickets')
      .select('*')
      .eq('order_item_id', orderItemId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to get tickets by order item: ${error.message}`);
    return data || [];
  }
  
  async getTicketById(id: string): Promise<TicketsTicket | null> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('tickets_tickets')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get ticket by id: ${error.message}`);
    }
    return data ? this.toCamelCase(data) : null;
  }
  
  // ============ AUDIT LOGGING ============
  async createAuditLog(data: InsertTicketsAudit): Promise<void> {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('tickets_audit')
      .insert({
        actor_type: data.actorType,
        actor_id: data.actorId || null,
        action: data.action,
        target_type: data.targetType || null,
        target_id: data.targetId || null,
        meta_json: data.metaJson || null,
        ip_address: data.ipAddress || null,
        user_agent: data.userAgent || null
      });
    
    if (error) throw new Error(`Failed to create audit log: ${error.message}`);
  }
  
  // ============ EMAIL COMMUNICATION ============
  async createEmailCommunication(data: any): Promise<any> {
    const supabase = getSupabaseAdmin();
    const { data: result, error } = await supabase
      .from('tickets_email_communications')
      .insert({
        event_id: data.eventId,
        organizer_id: data.organizerId,
        subject: data.subject,
        message: data.message,
        template_id: data.templateId || null,
        recipient_emails: data.recipientEmails,
        recipient_filter: data.recipientFilter || null,
        scheduled_for: data.scheduledFor || null,
        status: data.status || 'draft'
      })
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create email communication: ${error.message}`);
    return result;
  }
  
  async updateEmailCommunication(id: string, data: any): Promise<any> {
    const supabase = getSupabaseAdmin();
    
    // Convert camelCase to snake_case
    const snakeCaseData: any = {};
    for (const [key, value] of Object.entries(data)) {
      snakeCaseData[this.toSnakeCase(key)] = value;
    }
    
    const { data: result, error } = await supabase
      .from('tickets_email_communications')
      .update({ ...snakeCaseData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update email communication: ${error.message}`);
    return result;
  }
  
  async getEmailCommunicationsByEvent(eventId: string): Promise<any[]> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('tickets_email_communications')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to get email communications: ${error.message}`);
    return data || [];
  }
  
  // ============ USER OPERATIONS ============
  async getUserById(userId: string): Promise<any | null> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }
    
    return data;
  }
  
  // ============ ANALYTICS CACHE ============
  async updateAnalyticsCache(eventId: string, date: string, metricType: string, data: any): Promise<void> {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('tickets_analytics_cache')
      .upsert({
        event_id: eventId,
        date: date,
        metric_type: metricType,
        metric_data: data,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'event_id,date,metric_type'
      });
    
    if (error) throw new Error(`Failed to update analytics cache: ${error.message}`);
  }
  
  async getAnalyticsCache(eventId: string, date: string, metricType: string): Promise<any | null> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('tickets_analytics_cache')
      .select('*')
      .eq('event_id', eventId)
      .eq('date', date)
      .eq('metric_type', metricType)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get analytics cache: ${error.message}`);
    }
    return data;
  }
}

export const storageExtensions = new StorageExtensions();