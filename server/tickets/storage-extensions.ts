import type { 
  InsertTicketsTicket,
  InsertTicketsOrder,
  InsertTicketsAudit,
  TicketsTicket,
  TicketsOrder
} from '@shared/schema';
import { pool } from './tickets-db';
import { getSupabaseAdmin } from '../supabaseAdmin';

export class StorageExtensions {
  
  // ============ TICKET REFUND OPERATIONS ============
  async updateTicket(id: string, data: any): Promise<TicketsTicket> {
    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(data)) {
      // Convert camelCase to snake_case
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      fields.push(`${snakeKey} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
    
    fields.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE tickets_tickets 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }
  
  // ============ ORDER OPERATIONS ============
  async getOrdersByEvent(eventId: string): Promise<TicketsOrder[]> {
    const query = `
      SELECT * FROM tickets_orders 
      WHERE event_id = $1
      ORDER BY placed_at DESC
    `;
    const result = await pool.query(query, [eventId]);
    return result.rows;
  }
  
  async getOrdersByBuyer(email: string): Promise<TicketsOrder[]> {
    const query = `
      SELECT * FROM tickets_orders 
      WHERE buyer_email = $1 AND status = 'paid'
      ORDER BY placed_at DESC
    `;
    const result = await pool.query(query, [email]);
    return result.rows;
  }
  
  async getOrdersByUserId(userId: string): Promise<TicketsOrder[]> {
    // First get user email from Supabase (main DB)
    const user = await this.getUserById(userId);
    if (!user || !user.email) {
      return [];
    }
    
    // Then query orders by email from ticketing DB
    const query = `
      SELECT * FROM tickets_orders
      WHERE buyer_email = $1 AND status = 'paid'
      ORDER BY placed_at DESC
    `;
    const result = await pool.query(query, [user.email]);
    return result.rows;
  }
  
  // ============ TICKET OPERATIONS ============
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
    const query = `
      SELECT * FROM tickets_tickets 
      WHERE order_item_id = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [orderItemId]);
    return result.rows;
  }
  
  async getTicketById(id: string): Promise<TicketsTicket | null> {
    const query = 'SELECT * FROM tickets_tickets WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
  
  // ============ AUDIT LOGGING ============
  async createAuditLog(data: InsertTicketsAudit): Promise<void> {
    const query = `
      INSERT INTO tickets_audit (
        actor_type, actor_id, action, target_type, target_id,
        meta_json, ip_address, user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    const values = [
      data.actorType,
      data.actorId || null,
      data.action,
      data.targetType || null,
      data.targetId || null,
      data.metaJson || null,
      data.ipAddress || null,
      data.userAgent || null
    ];
    await pool.query(query, values);
  }
  
  // ============ EMAIL COMMUNICATION ============
  async createEmailCommunication(data: any): Promise<any> {
    const query = `
      INSERT INTO tickets_email_communications (
        event_id, organizer_id, subject, message, template_id,
        recipient_emails, recipient_filter, scheduled_for, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [
      data.eventId,
      data.organizerId,
      data.subject,
      data.message,
      data.templateId || null,
      data.recipientEmails,
      data.recipientFilter || null,
      data.scheduledFor || null,
      data.status || 'draft'
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }
  
  async updateEmailCommunication(id: string, data: any): Promise<any> {
    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(data)) {
      // Convert camelCase to snake_case
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      fields.push(`${snakeKey} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
    
    fields.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE tickets_email_communications 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }
  
  async getEmailCommunicationsByEvent(eventId: string): Promise<any[]> {
    const query = `
      SELECT * FROM tickets_email_communications 
      WHERE event_id = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [eventId]);
    return result.rows;
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
    const query = `
      INSERT INTO tickets_analytics_cache (event_id, date, metric_type, metric_data)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (event_id, date, metric_type)
      DO UPDATE SET metric_data = $4, created_at = NOW()
    `;
    await pool.query(query, [eventId, date, metricType, data]);
  }
  
  async getAnalyticsCache(eventId: string, date: string, metricType: string): Promise<any | null> {
    const query = `
      SELECT * FROM tickets_analytics_cache 
      WHERE event_id = $1 AND date = $2 AND metric_type = $3
    `;
    const result = await pool.query(query, [eventId, date, metricType]);
    return result.rows[0] || null;
  }
}

export const storageExtensions = new StorageExtensions();