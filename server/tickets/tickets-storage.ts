import { getSupabaseAdmin } from '../supabaseAdmin';
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

const supabase = getSupabaseAdmin();

export class TicketsStorage {
  // ============ ORGANIZERS ============
  async createOrganizer(data: InsertTicketsOrganizer): Promise<TicketsOrganizer> {
    const { data: organizer, error } = await supabase
      .from('tickets_organizers')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return organizer;
  }

  async getOrganizerById(id: string): Promise<TicketsOrganizer | null> {
    const { data, error } = await supabase
      .from('tickets_organizers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data || null;
  }

  async getOrganizerByUserId(userId: string): Promise<TicketsOrganizer | null> {
    const { data, error } = await supabase
      .from('tickets_organizers')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async updateOrganizerStripeAccount(id: string, stripeAccountId: string): Promise<TicketsOrganizer> {
    const { data, error } = await supabase
      .from('tickets_organizers')
      .update({ 
        stripe_account_id: stripeAccountId, 
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // ============ EVENTS ============
  async createEvent(data: InsertTicketsEvent): Promise<TicketsEvent> {
    // Generate unique slug
    const baseSlug = slugify(data.title, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;
    
    while (true) {
      const { data: existing } = await supabase
        .from('tickets_events')
        .select('id')
        .eq('slug', slug)
        .single();
      
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const { data: event, error } = await supabase
      .from('tickets_events')
      .insert({ ...data, slug })
      .select()
      .single();
    
    if (error) throw error;
    return event;
  }

  async getEventById(id: string): Promise<TicketsEvent | null> {
    const { data, error } = await supabase
      .from('tickets_events')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async getEventBySlug(slug: string): Promise<TicketsEvent | null> {
    const { data, error } = await supabase
      .from('tickets_events')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async getEventsByOrganizer(organizerId: string): Promise<TicketsEvent[]> {
    const { data, error } = await supabase
      .from('tickets_events')
      .select('*')
      .eq('organizer_id', organizerId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async getPublicEvents(city?: string): Promise<TicketsEvent[]> {
    let query = supabase
      .from('tickets_events')
      .select('*')
      .eq('status', 'published')
      .gte('start_at', new Date().toISOString());
    
    if (city) {
      query = query.eq('city', city);
    }
    
    const { data, error } = await query.order('start_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  async updateEvent(id: string, data: Partial<InsertTicketsEvent>): Promise<TicketsEvent> {
    const { data: updated, error } = await supabase
      .from('tickets_events')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return updated;
  }

  // ============ TIERS ============
  async createTier(data: InsertTicketsTier): Promise<TicketsTier> {
    const { data: tier, error } = await supabase
      .from('tickets_tiers')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return tier;
  }

  async getTiersByEvent(eventId: string): Promise<TicketsTier[]> {
    const { data, error } = await supabase
      .from('tickets_tiers')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  async getTierById(id: string): Promise<TicketsTier | null> {
    const { data, error } = await supabase
      .from('tickets_tiers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async updateTier(id: string, data: Partial<InsertTicketsTier>): Promise<TicketsTier> {
    const { data: updated, error } = await supabase
      .from('tickets_tiers')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return updated;
  }

  async deleteTier(id: string): Promise<void> {
    const { error } = await supabase
      .from('tickets_tiers')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // ============ ORDERS ============
  async createOrder(data: InsertTicketsOrder): Promise<TicketsOrder> {
    const { data: order, error } = await supabase
      .from('tickets_orders')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return order;
  }

  async getOrderById(id: string): Promise<TicketsOrder | null> {
    const { data, error } = await supabase
      .from('tickets_orders')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async getOrdersByEvent(eventId: string): Promise<TicketsOrder[]> {
    const { data, error } = await supabase
      .from('tickets_orders')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async getOrdersByBuyerEmail(email: string): Promise<TicketsOrder[]> {
    const { data, error } = await supabase
      .from('tickets_orders')
      .select('*')
      .eq('buyer_email', email)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async updateOrder(id: string, data: Partial<InsertTicketsOrder>): Promise<TicketsOrder> {
    const { data: updated, error } = await supabase
      .from('tickets_orders')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return updated;
  }

  // ============ ORDER ITEMS ============
  async createOrderItem(data: InsertTicketsOrderItem): Promise<TicketsOrderItem> {
    const { data: item, error } = await supabase
      .from('tickets_order_items')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return item;
  }

  async getOrderItems(orderId: string): Promise<TicketsOrderItem[]> {
    const { data, error } = await supabase
      .from('tickets_order_items')
      .select('*')
      .eq('order_id', orderId);
    
    if (error) throw error;
    return data || [];
  }

  // ============ TICKETS ============
  async createTicket(data: InsertTicketsTicket): Promise<TicketsTicket> {
    // Generate unique QR token
    const qrToken = `TKT-${nanoid(32)}`;
    const serial = `${data.tierId.slice(0, 8)}-${nanoid(8)}`.toUpperCase();
    
    const { data: ticket, error } = await supabase
      .from('tickets_tickets')
      .insert({ ...data, qr_token: qrToken, serial })
      .select()
      .single();
    
    if (error) throw error;
    return ticket;
  }

  async getTicketByQrToken(qrToken: string): Promise<TicketsTicket | null> {
    const { data, error } = await supabase
      .from('tickets_tickets')
      .select('*')
      .eq('qr_token', qrToken)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async getTicketsByOrderItem(orderItemId: string): Promise<TicketsTicket[]> {
    const { data, error } = await supabase
      .from('tickets_tickets')
      .select('*')
      .eq('order_item_id', orderItemId);
    
    if (error) throw error;
    return data || [];
  }

  async updateTicketStatus(
    id: string, 
    status: 'valid' | 'used' | 'refunded' | 'canceled',
    usedAt?: Date,
    scannedBy?: string
  ): Promise<TicketsTicket> {
    const updateData: any = { status };
    if (usedAt) updateData.used_at = usedAt.toISOString();
    if (scannedBy) updateData.scanned_by = scannedBy;
    
    const { data, error } = await supabase
      .from('tickets_tickets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // ============ DISCOUNTS ============
  async createDiscount(data: InsertTicketsDiscount): Promise<TicketsDiscount> {
    const { data: discount, error } = await supabase
      .from('tickets_discounts')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return discount;
  }

  async getDiscountByCode(eventId: string, code: string): Promise<TicketsDiscount | null> {
    const { data, error } = await supabase
      .from('tickets_discounts')
      .select('*')
      .eq('event_id', eventId)
      .eq('code', code)
      .eq('status', 'active')
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    
    // Check expiry
    const now = new Date();
    if (data.starts_at && new Date(data.starts_at) > now) return null;
    if (data.ends_at && new Date(data.ends_at) < now) return null;
    if (data.max_uses && data.used_count >= data.max_uses) return null;
    
    return data;
  }

  async incrementDiscountUsage(id: string): Promise<void> {
    const { data: discount, error: fetchError } = await supabase
      .from('tickets_discounts')
      .select('used_count')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    const { error: updateError } = await supabase
      .from('tickets_discounts')
      .update({ used_count: (discount.used_count || 0) + 1 })
      .eq('id', id);
    
    if (updateError) throw updateError;
  }

  // ============ WEBHOOKS ============
  async createWebhook(data: InsertTicketsWebhook): Promise<void> {
    const { error } = await supabase
      .from('tickets_webhooks')
      .insert(data);
    
    if (error) throw error;
  }

  async getUnprocessedWebhooks(): Promise<any[]> {
    const { data, error } = await supabase
      .from('tickets_webhooks')
      .select('*')
      .eq('status', 'pending')
      .lte('retry_count', 3)
      .order('created_at', { ascending: true })
      .limit(10);
    
    if (error) throw error;
    return data || [];
  }

  async markWebhookProcessed(id: string, errorMsg?: string): Promise<void> {
    const { data: webhook, error: fetchError } = await supabase
      .from('tickets_webhooks')
      .select('retry_count')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    const updateData: any = {
      status: errorMsg ? 'failed' : 'processed',
      processed_at: new Date().toISOString(),
      retry_count: (webhook.retry_count || 0) + 1
    };
    
    if (errorMsg) {
      updateData.error = errorMsg;
    }
    
    const { error: updateError } = await supabase
      .from('tickets_webhooks')
      .update(updateData)
      .eq('id', id);
    
    if (updateError) throw updateError;
  }

  // ============ AUDIT ============
  async createAuditLog(data: InsertTicketsAudit): Promise<void> {
    const { error } = await supabase
      .from('tickets_audit')
      .insert(data);
    
    if (error) throw error;
  }

  // ============ ANALYTICS ============
  async getEventMetrics(eventId: string): Promise<{
    totalOrders: number;
    totalRevenueCents: number;
    totalTicketsSold: number;
    ticketsByTier: Record<string, number>;
  }> {
    const orders = await this.getOrdersByEvent(eventId);
    const paidOrders = orders.filter(o => o.status === 'paid');
    
    const totalOrders = paidOrders.length;
    const totalRevenueCents = paidOrders.reduce((sum, o) => sum + o.totalCents, 0);
    
    // Get ticket counts by tier
    const ticketsByTier: Record<string, number> = {};
    let totalTicketsSold = 0;
    
    for (const order of paidOrders) {
      const items = await this.getOrderItems(order.id);
      for (const item of items) {
        ticketsByTier[item.tierId] = (ticketsByTier[item.tierId] || 0) + item.quantity;
        totalTicketsSold += item.quantity;
      }
    }
    
    return {
      totalOrders,
      totalRevenueCents,
      totalTicketsSold,
      ticketsByTier
    };
  }

  // ============ INVENTORY ============
  async checkTierAvailability(tierId: string, quantity: number): Promise<boolean> {
    const tier = await this.getTierById(tierId);
    if (!tier || !tier.capacity) return true; // No capacity limit
    
    // Count sold tickets for this tier
    const { data: orders, error } = await supabase
      .from('tickets_order_items')
      .select(`
        quantity,
        tickets_orders!inner(status)
      `)
      .eq('tier_id', tierId)
      .in('tickets_orders.status', ['paid', 'pending']);
    
    if (error) throw error;
    
    const soldCount = (orders || []).reduce((sum, item: any) => sum + item.quantity, 0);
    return (soldCount + quantity) <= tier.capacity;
  }
}

// Export singleton instance
export const ticketsStorage = new TicketsStorage();