import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Helper function to convert camelCase to snake_case for database inserts
const toSnakeCase = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  }
  
  if (obj instanceof Date || typeof obj !== 'object') {
    return obj;
  }
  
  return Object.keys(obj).reduce((result, key) => {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = toSnakeCase(obj[key]);
    return result;
  }, {} as any);
};
import type {
  TicketsOrganizer,
  TicketsEvent,
  TicketsTier,
  TicketsOrder,
  TicketsOrderItem,
  TicketsTicket,
  TicketsDiscount,
  TicketsWebhook,
  TicketsAudit,
  InsertTicketsOrganizer,
  InsertTicketsEvent,
  InsertTicketsTier,
  InsertTicketsOrder,
  InsertTicketsOrderItem,
  InsertTicketsTicket,
  InsertTicketsDiscount,
  InsertTicketsWebhook,
  InsertTicketsAudit
} from '@shared/schema';

// Initialize Supabase client with service role key for backend operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

export class TicketsSupabaseDB {
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
    return data;
  }

  async getOrganizerByEmail(email: string): Promise<TicketsOrganizer | null> {
    const { data, error } = await supabase
      .from('tickets_organizers')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getOrganizerByStripeAccount(stripeAccountId: string): Promise<TicketsOrganizer | null> {
    const { data, error } = await supabase
      .from('tickets_organizers')
      .select('*')
      .eq('stripe_account_id', stripeAccountId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updateOrganizer(id: string, data: Partial<InsertTicketsOrganizer>): Promise<TicketsOrganizer> {
    const { data: organizer, error } = await supabase
      .from('tickets_organizers')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return organizer;
  }

  // ============ EVENTS ============
  async createEvent(data: InsertTicketsEvent): Promise<TicketsEvent> {
    const { data: event, error } = await supabase
      .from('tickets_events')
      .insert(data)
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
    return data;
  }

  async getEventBySlug(slug: string): Promise<TicketsEvent | null> {
    const { data, error } = await supabase
      .from('tickets_events')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getPublicEvents(): Promise<TicketsEvent[]> {
    const { data, error } = await supabase
      .from('tickets_events')
      .select('*')
      .eq('status', 'published')
      .gt('start_at', new Date().toISOString())
      .order('start_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
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

  async updateEvent(id: string, data: Partial<InsertTicketsEvent>): Promise<TicketsEvent> {
    const { data: event, error } = await supabase
      .from('tickets_events')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return event;
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
    // Get tiers with sold count
    const { data: tiers, error: tiersError } = await supabase
      .from('tickets_tiers')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order', { ascending: true })
      .order('price_cents', { ascending: true });
    
    if (tiersError) throw tiersError;
    
    // Get sold counts for each tier
    const tiersWithCounts = await Promise.all((tiers || []).map(async (tier) => {
      const { count, error: countError } = await supabase
        .from('tickets_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('tier_id', tier.id)
        .in('status', ['valid', 'used']);
      
      if (countError) throw countError;
      
      return {
        ...tier,
        sold_count: count || 0
      };
    }));
    
    return tiersWithCounts;
  }

  async getTierById(id: string): Promise<TicketsTier | null> {
    const { data, error } = await supabase
      .from('tickets_tiers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getTierSoldCount(tierId: string): Promise<number> {
    const { count, error } = await supabase
      .from('tickets_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('tier_id', tierId)
      .in('status', ['valid', 'used']);
    
    if (error) throw error;
    return count || 0;
  }

  // ============ ORDERS ============
  async createOrder(data: InsertTicketsOrder & { id?: string }): Promise<TicketsOrder> {
    const orderId = data.id || randomUUID();
    const snakeCaseData = toSnakeCase({ ...data, id: orderId });
    
    console.log('Original order data:', data);
    console.log('Transformed snake_case data:', snakeCaseData);
    
    const { data: order, error } = await supabase
      .from('tickets_orders')
      .insert(snakeCaseData)
      .select()
      .single();
    
    if (error) {
      console.error('Order creation error:', error);
      throw error;
    }
    return order;
  }

  async createOrderItem(data: InsertTicketsOrderItem): Promise<TicketsOrderItem> {
    const snakeCaseData = toSnakeCase(data);
    
    const { data: item, error } = await supabase
      .from('tickets_order_items')
      .insert(snakeCaseData)
      .select()
      .single();
    
    if (error) throw error;
    return item;
  }

  async createTicket(data: InsertTicketsTicket): Promise<TicketsTicket> {
    const snakeCaseData = toSnakeCase(data);
    
    const { data: ticket, error } = await supabase
      .from('tickets_tickets')
      .insert(snakeCaseData)
      .select()
      .single();
    
    if (error) throw error;
    return ticket;
  }

  async getOrderByCheckoutSession(sessionId: string): Promise<TicketsOrder | null> {
    const { data, error } = await supabase
      .from('tickets_orders')
      .select('*')
      .eq('stripe_checkout_session_id', sessionId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async markOrderPaid(orderId: string, paymentIntentId: string): Promise<TicketsOrder> {
    const { data: order, error } = await supabase
      .from('tickets_orders')
      .update({
        status: 'paid',
        stripe_payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();
    
    if (error) throw error;
    return order;
  }

  // ============ DISCOUNTS ============
  async getDiscountByCode(eventId: string, code: string): Promise<TicketsDiscount | null> {
    const { data, error } = await supabase
      .from('tickets_discounts')
      .select('*')
      .eq('event_id', eventId)
      .eq('code', code)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async incrementDiscountUsage(discountId: string): Promise<void> {
    const { error } = await supabase.rpc('increment', {
      table_name: 'tickets_discounts',
      column_name: 'uses_count',
      row_id: discountId
    });
    
    // If RPC doesn't exist, fall back to manual update
    if (error && error.code === 'PGRST202') {
      const { data: discount } = await supabase
        .from('tickets_discounts')
        .select('uses_count')
        .eq('id', discountId)
        .single();
      
      if (discount) {
        await supabase
          .from('tickets_discounts')
          .update({ uses_count: (discount.uses_count || 0) + 1 })
          .eq('id', discountId);
      }
    } else if (error) {
      throw error;
    }
  }

  // ============ WEBHOOKS ============
  async createWebhook(data: InsertTicketsWebhook): Promise<void> {
    const { error } = await supabase
      .from('tickets_webhooks')
      .insert(data);
    
    if (error) throw error;
  }

  async markWebhookProcessed(id: string, error?: string): Promise<void> {
    const { error: updateError } = await supabase
      .from('tickets_webhooks')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        error: error || null
      })
      .eq('id', id);
    
    if (updateError) throw updateError;
  }

  // ============ AUDIT ============
  async createAudit(data: InsertTicketsAudit): Promise<void> {
    const { error } = await supabase
      .from('tickets_audit')
      .insert(data);
    
    if (error) throw error;
  }
}

export const ticketsDB = new TicketsSupabaseDB();