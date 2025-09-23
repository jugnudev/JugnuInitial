import { Pool } from 'pg';
import type { 
  InsertTicketsOrganizer,
  InsertTicketsEvent,
  InsertTicketsTier,
  InsertTicketsOrder,
  InsertTicketsOrderItem,
  InsertTicketsTicket,
  InsertTicketsDiscount,
  InsertTicketsWebhook,
  InsertTicketsAudit,
  TicketsOrganizer,
  TicketsEvent,
  TicketsTier,
  TicketsOrder,
  TicketsOrderItem,
  TicketsTicket,
  TicketsDiscount
} from '@shared/schema';
import { nanoid } from 'nanoid';
import slugify from 'slugify';

// Create a pool using DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export class TicketsDB {
  // ============ ORGANIZERS ============
  async createOrganizer(data: InsertTicketsOrganizer): Promise<TicketsOrganizer> {
    const query = `
      INSERT INTO tickets_organizers (user_id, business_name, business_email, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [data.userId, data.businessName, data.businessEmail, data.status || 'pending'];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getOrganizerById(id: string): Promise<TicketsOrganizer | null> {
    const query = 'SELECT * FROM tickets_organizers WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async getOrganizerByUserId(userId: string): Promise<TicketsOrganizer | null> {
    const query = 'SELECT * FROM tickets_organizers WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  async updateOrganizerStripeAccount(id: string, stripeAccountId: string): Promise<TicketsOrganizer> {
    const query = `
      UPDATE tickets_organizers 
      SET stripe_account_id = $1, status = 'active', updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [stripeAccountId, id]);
    return result.rows[0];
  }

  // ============ EVENTS ============
  async createEvent(data: InsertTicketsEvent): Promise<TicketsEvent> {
    // Generate unique slug
    const baseSlug = slugify(data.title, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;
    
    while (true) {
      const checkQuery = 'SELECT id FROM tickets_events WHERE slug = $1';
      const existing = await pool.query(checkQuery, [slug]);
      
      if (existing.rows.length === 0) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const query = `
      INSERT INTO tickets_events (
        organizer_id, slug, title, summary, description, venue, 
        city, province, start_at, end_at, status, cover_url,
        fee_structure, tax_settings
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    const values = [
      data.organizerId, slug, data.title, data.summary || null, 
      data.description || null, data.venue || null,
      data.city || 'Vancouver', data.province || 'BC', 
      data.startAt, data.endAt || null, 
      data.status || 'draft', data.coverUrl || null,
      data.feeStructure || { type: 'buyer_pays', serviceFeePercent: 5 },
      data.taxSettings || { collectTax: true, gstPercent: 5, pstPercent: 7 }
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getEventById(id: string): Promise<TicketsEvent | null> {
    const query = 'SELECT * FROM tickets_events WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async getEventBySlug(slug: string): Promise<TicketsEvent | null> {
    const query = 'SELECT * FROM tickets_events WHERE slug = $1';
    const result = await pool.query(query, [slug]);
    return result.rows[0] || null;
  }

  async getPublicEvents(): Promise<TicketsEvent[]> {
    const query = `
      SELECT * FROM tickets_events 
      WHERE status = 'published' 
      AND start_at > NOW()
      ORDER BY start_at ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async getEventsByOrganizer(organizerId: string): Promise<TicketsEvent[]> {
    const query = `
      SELECT * FROM tickets_events 
      WHERE organizer_id = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [organizerId]);
    return result.rows;
  }

  async updateEvent(id: string, data: Partial<InsertTicketsEvent>): Promise<TicketsEvent> {
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
      UPDATE tickets_events 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // ============ TIERS ============
  async createTier(data: InsertTicketsTier): Promise<TicketsTier> {
    const query = `
      INSERT INTO tickets_tiers (
        event_id, name, price_cents, capacity, max_per_order,
        sales_start_at, sales_end_at, sort_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      data.eventId, data.name, data.priceCents, 
      data.capacity || null, data.maxPerOrder || 10,
      data.salesStartAt || null, data.salesEndAt || null,
      data.sortOrder || 0
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getTiersByEvent(eventId: string): Promise<TicketsTier[]> {
    const query = `
      SELECT 
        t.*,
        COALESCE(COUNT(tk.id), 0)::integer as sold_count
      FROM tickets_tiers t
      LEFT JOIN tickets_tickets tk ON tk.tier_id = t.id 
        AND tk.status IN ('valid', 'used')
      WHERE t.event_id = $1
      GROUP BY t.id
      ORDER BY t.sort_order ASC, t.price_cents ASC
    `;
    const result = await pool.query(query, [eventId]);
    return result.rows;
  }

  async getTierById(id: string): Promise<TicketsTier | null> {
    const query = 'SELECT * FROM tickets_tiers WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async getTierSoldCount(tierId: string): Promise<number> {
    const query = `
      SELECT COUNT(*)::integer as count
      FROM tickets_tickets
      WHERE tier_id = $1 AND status IN ('valid', 'used')
    `;
    const result = await pool.query(query, [tierId]);
    return result.rows[0].count || 0;
  }

  async updateTier(id: string, data: Partial<InsertTicketsTier>): Promise<TicketsTier> {
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
      UPDATE tickets_tiers 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async deleteTier(id: string): Promise<void> {
    // Check if tier has any sold tickets
    const soldCount = await this.getTierSoldCount(id);
    if (soldCount > 0) {
      throw new Error('Cannot delete tier with sold tickets');
    }
    
    const query = 'DELETE FROM tickets_tiers WHERE id = $1';
    await pool.query(query, [id]);
  }

  async getEventMetrics(eventId: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    totalTickets: number;
    ticketsByStatus: Record<string, number>;
    salesByTier: Array<{ tierName: string; soldCount: number; revenue: number }>;
  }> {
    // Get total orders and revenue
    const orderMetricsQuery = `
      SELECT 
        COUNT(*)::integer as total_orders,
        COALESCE(SUM(total_cents), 0)::bigint as total_revenue
      FROM tickets_orders 
      WHERE event_id = $1 AND status = 'paid'
    `;
    const orderMetrics = await pool.query(orderMetricsQuery, [eventId]);

    // Get ticket counts by status
    const ticketStatusQuery = `
      SELECT 
        t.status,
        COUNT(*)::integer as count
      FROM tickets_tickets t
      JOIN tickets_tiers tier ON tier.id = t.tier_id
      WHERE tier.event_id = $1
      GROUP BY t.status
    `;
    const ticketStatusResult = await pool.query(ticketStatusQuery, [eventId]);
    
    const ticketsByStatus: Record<string, number> = {};
    let totalTickets = 0;
    ticketStatusResult.rows.forEach(row => {
      ticketsByStatus[row.status] = row.count;
      totalTickets += row.count;
    });

    // Get sales by tier
    const tierSalesQuery = `
      SELECT 
        tier.name as tier_name,
        COUNT(t.id)::integer as sold_count,
        COALESCE(SUM(oi.unit_price_cents * oi.quantity), 0)::bigint as revenue
      FROM tickets_tiers tier
      LEFT JOIN tickets_tickets t ON t.tier_id = tier.id AND t.status IN ('valid', 'used')
      LEFT JOIN tickets_order_items oi ON oi.tier_id = tier.id
      LEFT JOIN tickets_orders o ON o.id = oi.order_id AND o.status = 'paid'
      WHERE tier.event_id = $1
      GROUP BY tier.id, tier.name
      ORDER BY tier.sort_order ASC, tier.price_cents ASC
    `;
    const tierSalesResult = await pool.query(tierSalesQuery, [eventId]);

    return {
      totalOrders: orderMetrics.rows[0].total_orders,
      totalRevenue: Number(orderMetrics.rows[0].total_revenue),
      totalTickets,
      ticketsByStatus,
      salesByTier: tierSalesResult.rows.map(row => ({
        tierName: row.tier_name,
        soldCount: row.sold_count,
        revenue: Number(row.revenue)
      }))
    };
  }

  async getOrdersByEvent(eventId: string): Promise<TicketsOrder[]> {
    const query = `
      SELECT * FROM tickets_orders 
      WHERE event_id = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [eventId]);
    return result.rows;
  }

  async getOrdersByBuyer(email: string): Promise<TicketsOrder[]> {
    const query = `
      SELECT * FROM tickets_orders 
      WHERE buyer_email = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [email]);
    return result.rows;
  }

  // ============ ORDERS ============
  async createOrder(data: InsertTicketsOrder & { id?: string }): Promise<TicketsOrder> {
    const id = data.id || nanoid();
    const query = `
      INSERT INTO tickets_orders (
        id, event_id, buyer_email, buyer_name, buyer_phone,
        status, subtotal_cents, fees_cents, tax_cents, total_cents,
        stripe_checkout_session_id, discount_code, discount_amount_cents
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    const values = [
      id, data.eventId, data.buyerEmail, data.buyerName || null, 
      data.buyerPhone || null, data.status || 'pending',
      data.subtotalCents, data.feesCents || 0, data.taxCents || 0,
      data.totalCents, data.stripeCheckoutSessionId || null,
      data.discountCode || null, data.discountAmountCents || 0
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async createOrderItem(data: InsertTicketsOrderItem): Promise<TicketsOrderItem> {
    const query = `
      INSERT INTO tickets_order_items (
        order_id, tier_id, quantity, unit_price_cents,
        tax_cents, fees_cents
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      data.orderId, data.tierId, data.quantity,
      data.unitPriceCents, data.taxCents || 0, data.feesCents || 0
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async createTicket(data: InsertTicketsTicket): Promise<TicketsTicket> {
    const query = `
      INSERT INTO tickets_tickets (
        order_item_id, tier_id, serial, qr_token, status
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      data.orderItemId, data.tierId, data.serial,
      data.qrToken, data.status || 'valid'
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getOrderByCheckoutSession(sessionId: string): Promise<TicketsOrder | null> {
    const query = 'SELECT * FROM tickets_orders WHERE stripe_checkout_session_id = $1';
    const result = await pool.query(query, [sessionId]);
    return result.rows[0] || null;
  }

  async markOrderPaid(orderId: string, paymentIntentId: string): Promise<TicketsOrder> {
    const query = `
      UPDATE tickets_orders 
      SET status = 'paid', stripe_payment_intent_id = $1, placed_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [paymentIntentId, orderId]);
    return result.rows[0];
  }

  async getTicketsByOrderItem(orderItemId: string): Promise<TicketsTicket[]> {
    const query = 'SELECT * FROM tickets_tickets WHERE order_item_id = $1';
    const result = await pool.query(query, [orderItemId]);
    return result.rows;
  }

  async getTicketByQR(qrToken: string): Promise<TicketsTicket | null> {
    const query = 'SELECT * FROM tickets_tickets WHERE qr_token = $1';
    const result = await pool.query(query, [qrToken]);
    return result.rows[0] || null;
  }

  async updateTicket(id: string, data: Partial<InsertTicketsTicket>): Promise<TicketsTicket> {
    const fields = [];
    const values = [];
    let valueIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        // Convert camelCase to snake_case for database
        const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        fields.push(`${dbKey} = $${valueIndex}`);
        values.push(value);
        valueIndex++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);

    const query = `
      UPDATE tickets_tickets 
      SET ${fields.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING *
    `;
    values.push(id);

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getOrderItemById(id: string): Promise<TicketsOrderItem | null> {
    const query = 'SELECT * FROM tickets_order_items WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // ============ INVENTORY MANAGEMENT ============
  async getTierSoldCount(tierId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count 
      FROM tickets_tickets 
      WHERE tier_id = $1 AND status IN ('valid', 'used')
    `;
    const result = await pool.query(query, [tierId]);
    return parseInt(result.rows[0].count) || 0;
  }

  async getTierReservedCount(tierId: string): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(quantity), 0) as reserved 
      FROM tickets_capacity_reservations 
      WHERE tier_id = $1 AND expires_at > NOW()
    `;
    const result = await pool.query(query, [tierId]);
    return parseInt(result.rows[0].reserved) || 0;
  }

  async createCapacityReservation(data: {
    tierId: string;
    quantity: number;
    reservationId: string;
    expiresAt: Date;
  }): Promise<void> {
    const query = `
      INSERT INTO tickets_capacity_reservations (tier_id, quantity, reservation_id, expires_at)
      VALUES ($1, $2, $3, $4)
    `;
    await pool.query(query, [data.tierId, data.quantity, data.reservationId, data.expiresAt]);
  }

  async deleteCapacityReservation(reservationId: string): Promise<void> {
    const query = 'DELETE FROM tickets_capacity_reservations WHERE reservation_id = $1';
    await pool.query(query, [reservationId]);
  }

  async releaseExpiredReservations(tierId: string, quantity: number): Promise<void> {
    const query = `
      DELETE FROM tickets_capacity_reservations 
      WHERE tier_id = $1 AND expires_at < NOW()
      AND reservation_id IN (
        SELECT reservation_id 
        FROM tickets_capacity_reservations 
        WHERE tier_id = $1 AND expires_at < NOW()
        ORDER BY created_at 
        LIMIT $2
      )
    `;
    await pool.query(query, [tierId, quantity]);
  }

  async cleanupExpiredReservations(): Promise<void> {
    const query = 'DELETE FROM tickets_capacity_reservations WHERE expires_at < NOW()';
    await pool.query(query);
  }

  // ============ DISCOUNTS ============
  async getDiscountByCode(eventId: string, code: string): Promise<TicketsDiscount | null> {
    const query = `
      SELECT * FROM tickets_discounts 
      WHERE event_id = $1 AND code = $2 AND status = 'active'
      AND (starts_at IS NULL OR starts_at <= NOW())
      AND (ends_at IS NULL OR ends_at >= NOW())
      AND (max_uses IS NULL OR used_count < max_uses)
    `;
    const result = await pool.query(query, [eventId, code]);
    return result.rows[0] || null;
  }

  async incrementDiscountUsage(discountId: string): Promise<void> {
    const query = `
      UPDATE tickets_discounts 
      SET used_count = used_count + 1
      WHERE id = $1
    `;
    await pool.query(query, [discountId]);
  }

  // ============ WEBHOOKS ============
  async createWebhook(data: InsertTicketsWebhook & { id?: string }): Promise<void> {
    const query = `
      INSERT INTO tickets_webhooks (id, kind, payload_json, status)
      VALUES ($1, $2, $3, $4)
    `;
    const values = [
      data.id || nanoid(), 
      data.kind, 
      JSON.stringify(data.payloadJson),
      data.status || 'pending'
    ];
    await pool.query(query, values);
  }

  async markWebhookProcessed(id: string, error?: string): Promise<void> {
    const query = error
      ? `UPDATE tickets_webhooks SET status = 'failed', error = $1, processed_at = NOW() WHERE id = $2`
      : `UPDATE tickets_webhooks SET status = 'processed', processed_at = NOW() WHERE id = $1`;
    
    const values = error ? [error, id] : [id];
    await pool.query(query, values);
  }

  // ============ AUDIT ============
  async createAudit(data: InsertTicketsAudit): Promise<void> {
    const query = `
      INSERT INTO tickets_audit (
        actor_type, actor_id, action, target_type, target_id,
        meta_json, ip_address, user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    const values = [
      data.actorType, data.actorId || null, data.action,
      data.targetType || null, data.targetId || null,
      data.metaJson ? JSON.stringify(data.metaJson) : null,
      data.ipAddress || null, data.userAgent || null
    ];
    await pool.query(query, values);
  }
}

// Export singleton instance
export const ticketsDB = new TicketsDB();