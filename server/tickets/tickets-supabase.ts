import { getSupabaseAdmin } from '../supabaseAdmin';
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

// Helper function to convert snake_case to camelCase for database reads
const toCamelCase = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  
  if (obj instanceof Date || typeof obj !== 'object') {
    return obj;
  }
  
  return Object.keys(obj).reduce((result, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = toCamelCase(obj[key]);
    return result;
  }, {} as any);
};

import { nanoid } from 'nanoid';
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

// Initialize Supabase client using the same method as main system
let supabase: any = null;

const getSupabase = () => {
  if (!supabase) {
    supabase = getSupabaseAdmin();
    console.log('[Tickets] Initialized Supabase connection');
  }
  return supabase;
};

export class TicketsSupabaseDB {
  private client = getSupabase();

  // ============ ORGANIZERS ============
  async createOrganizer(data: InsertTicketsOrganizer): Promise<TicketsOrganizer> {
    console.log('[DEBUG] Creating organizer with data:', data);
    
    // Let the database auto-generate UUID - no manual ID needed
    const insertData = {
      user_id: data.userId,
      business_name: data.businessName,
      email: data.businessEmail,          // Fill the NOT NULL email column
      business_email: data.businessEmail, // Also fill business_email for consistency
      status: data.status || 'active'     // MoR model: organizers are active by default
    };
    
    console.log('[DEBUG] Inserting with snake_case data (auto UUID):', insertData);
    
    const { data: organizer, error: insertError } = await this.client
      .from('organizers')
      .insert(insertData)
      .select()
      .single();
    
    if (insertError) {
      console.log('[DEBUG] Direct insert failed:', insertError);
      throw insertError;
    }
    
    console.log('[DEBUG] Organizer created with ID:', organizer?.id);
    return organizer;
  }

  async getOrganizerById(id: string): Promise<TicketsOrganizer | null> {
    console.log('[DEBUG] getOrganizerById called with ID:', id);
    
    const { data, error } = await this.client
      .from('organizers')
      .select('*')
      .eq('id', id)
      .single();
    
    console.log('[DEBUG] getOrganizerById query result - data:', data);
    console.log('[DEBUG] getOrganizerById query result - error:', error);
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data;
  }

  async getOrganizerByUserId(userId: string): Promise<TicketsOrganizer | null> {
    console.log('[DEBUG] Attempting to find organizer for userId:', userId);
    console.log('[DEBUG] Using PostgREST cache workaround...');
    
    try {
      
      // Workaround: Fetch all organizers and filter client-side to bypass PostgREST cache issue
      const { data: allOrganizers, error } = await this.client
        .from('organizers')
        .select('*');
      
      if (error) {
        console.log('[DEBUG] Error fetching all organizers:', error);
        throw error;
      }
      
      console.log('[DEBUG] Fetched', allOrganizers?.length || 0, 'organizers, filtering for userId:', userId);
      const matchingOrganizer = allOrganizers?.find(org => org.user_id === userId) || null;
      console.log('[DEBUG] Found matching organizer:', matchingOrganizer ? 'yes' : 'no');
      
      return matchingOrganizer;
    } catch (error) {
      console.log('[DEBUG] Workaround failed:', error);
      throw error;
    }
  }

  async getOrganizerByEmail(email: string): Promise<TicketsOrganizer | null> {
    const { data, error } = await this.client
      .from('organizers')
      .select('*')
      .eq('business_email', email)  // Use business_email column from organizers table
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getOrganizerByStripeAccount(stripeAccountId: string): Promise<TicketsOrganizer | null> {
    const { data, error } = await this.client
      .from('organizers')
      .select('*')
      .eq('stripe_account_id', stripeAccountId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Alias for getOrganizerByStripeAccount
  async getOrganizerByStripeAccountId(stripeAccountId: string): Promise<TicketsOrganizer | null> {
    return this.getOrganizerByStripeAccount(stripeAccountId);
  }

  async updateOrganizer(id: string, data: Partial<InsertTicketsOrganizer>): Promise<TicketsOrganizer> {
    const snakeCaseData = toSnakeCase(data);
    const { data: organizer, error } = await this.client
      .from('organizers')
      .update(snakeCaseData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return organizer;
  }

  // ============ EVENTS ============
  async createEvent(data: InsertTicketsEvent): Promise<TicketsEvent> {
    const snakeCaseData = toSnakeCase(data);
    const { data: event, error } = await this.client
      .from('tickets_events')
      .insert(snakeCaseData)
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(event);
  }

  async getEventById(id: string): Promise<TicketsEvent | null> {
    const { data, error } = await this.client
      .from('tickets_events')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? toCamelCase(data) : null;
  }

  async getEventBySlug(slug: string): Promise<TicketsEvent | null> {
    const { data, error } = await this.client
      .from('tickets_events')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? toCamelCase(data) : null;
  }

  async getPublicEvents(): Promise<TicketsEvent[]> {
    const { data, error } = await this.client
      .from('tickets_events')
      .select('*')
      .eq('status', 'published')
      .gt('start_at', new Date().toISOString())
      .order('start_at', { ascending: true });
    
    if (error) throw error;
    return data ? data.map(toCamelCase) : [];
  }

  async getEventsByOrganizer(organizerId: string): Promise<TicketsEvent[]> {
    const { data, error } = await this.client
      .from('tickets_events')
      .select('*')
      .eq('organizer_id', organizerId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data ? data.map(toCamelCase) : [];
  }

  async getPublishedEventsByOrganizer(organizerId: string): Promise<TicketsEvent[]> {
    const { data, error } = await this.client
      .from('tickets_events')
      .select('*')
      .eq('organizer_id', organizerId)
      .eq('status', 'published')
      .order('start_at', { ascending: true });
    
    if (error) throw error;
    return data ? data.map(toCamelCase) : [];
  }

  async updateEvent(id: string, data: Partial<InsertTicketsEvent>): Promise<TicketsEvent> {
    // Convert camelCase to snake_case for Supabase
    const snakeCaseData = toSnakeCase({
      ...data,
      updated_at: new Date().toISOString()
    });
    
    const { data: event, error } = await this.client
      .from('tickets_events')
      .update(snakeCaseData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(event);
  }

  async deleteEvent(id: string): Promise<void> {
    const { error } = await this.client
      .from('tickets_events')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // ============ TIERS ============
  async createTier(data: InsertTicketsTier): Promise<TicketsTier> {
    // Convert camelCase to snake_case for Supabase
    const dbData = {
      event_id: data.eventId,
      name: data.name,
      price_cents: data.priceCents,
      capacity: data.capacity,
      max_per_order: data.maxPerOrder,
      sales_start_at: data.salesStartAt,
      sales_end_at: data.salesEndAt,
      sort_order: data.sortOrder
    };
    
    const { data: tier, error } = await this.client
      .from('tickets_tiers')
      .insert(dbData)
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(tier);
  }

  async getTiersByEvent(eventId: string): Promise<TicketsTier[]> {
    // Get tiers with sold count
    const { data: tiers, error: tiersError } = await this.client
      .from('tickets_tiers')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order', { ascending: true })
      .order('price_cents', { ascending: true });
    
    if (tiersError) throw tiersError;
    
    // Get sold counts for each tier
    const tiersWithCounts = await Promise.all((tiers || []).map(async (tier) => {
      const { count, error: countError } = await this.client
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
    
    return tiersWithCounts.map(toCamelCase);
  }

  async getTierById(id: string): Promise<TicketsTier | null> {
    const { data, error } = await this.client
      .from('tickets_tiers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? toCamelCase(data) : null;
  }

  async getTierSoldCount(tierId: string): Promise<number> {
    const { count, error } = await this.client
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
    
    console.log('Creating order with ID:', orderId, 'for event:', data.eventId);
    console.log('Original data:', JSON.stringify(data, null, 2));
    console.log('Snake case data:', JSON.stringify(snakeCaseData, null, 2));
    
    const { data: order, error } = await this.client
      .from('tickets_orders')
      .insert(snakeCaseData)
      .select()
      .single();
    
    if (error) {
      console.error('Order creation error:', error);
      throw error;
    }
    
    console.log('Order created successfully:', JSON.stringify(order, null, 2));
    
    // Immediately verify the order exists by trying to fetch it
    console.log('Verifying order creation by fetching it back...');
    const verification = await this.getOrderById(orderId);
    if (verification) {
      console.log('Order verification successful:', verification.id);
    } else {
      console.error('Order verification failed! Order not found immediately after creation');
    }
    
    return order;
  }

  async createOrderItem(data: InsertTicketsOrderItem): Promise<TicketsOrderItem> {
    const snakeCaseData = toSnakeCase(data);
    
    const { data: item, error } = await this.client
      .from('tickets_order_items')
      .insert(snakeCaseData)
      .select()
      .single();
    
    if (error) throw error;
    return item;
  }

  async createTicket(data: InsertTicketsTicket): Promise<TicketsTicket> {
    const snakeCaseData = toSnakeCase(data);
    
    const { data: ticket, error } = await this.client
      .from('tickets_tickets')
      .insert(snakeCaseData)
      .select()
      .single();
    
    if (error) throw error;
    return ticket;
  }

  async getOrderByCheckoutSession(sessionId: string): Promise<TicketsOrder | null> {
    const { data, error } = await this.client
      .from('tickets_orders')
      .select('*')
      .eq('stripe_checkout_session_id', sessionId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? toCamelCase(data) : null;
  }

  async markOrderPaid(orderId: string, paymentIntentId: string): Promise<TicketsOrder> {
    const { data: order, error } = await this.client
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

  async getOrderById(orderId: string): Promise<TicketsOrder | null> {
    console.log('Fetching order from Supabase with ID:', orderId);
    
    const { data, error } = await this.client
      .from('tickets_orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (error) {
      console.log('Supabase error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      if (error.code !== 'PGRST116') {
        console.error('Non-404 error:', error);
        throw error;
      } else {
        console.log('Order not found in Supabase (PGRST116)');
      }
    } else {
      console.log('Order found in Supabase:', data);
    }
    
    return data ? toCamelCase(data) : null;
  }

  async getOrderByPaymentIntent(paymentIntentId: string): Promise<TicketsOrder | null> {
    console.log('Fetching order from Supabase with Payment Intent ID:', paymentIntentId);
    
    const { data, error } = await this.client
      .from('tickets_orders')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();
    
    if (error) {
      console.log('Supabase error details for Payment Intent lookup:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      if (error.code !== 'PGRST116') {
        console.error('Non-404 error in Payment Intent lookup:', error);
        throw error;
      } else {
        console.log('Order not found in Supabase by Payment Intent (PGRST116)');
      }
    } else {
      console.log('Order found in Supabase by Payment Intent:', data);
    }
    
    return data ? toCamelCase(data) : null;
  }

  async updateOrder(orderId: string, data: Partial<Omit<InsertTicketsOrder, 'id'>>): Promise<TicketsOrder> {
    const snakeCaseData = toSnakeCase({
      ...data,
      updated_at: new Date().toISOString()
    });

    const { data: order, error } = await this.client
      .from('tickets_orders')
      .update(snakeCaseData)
      .eq('id', orderId)
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(order);
  }

  async getOrderItems(orderId: string): Promise<TicketsOrderItem[]> {
    const { data, error } = await this.client
      .from('tickets_order_items')
      .select('*')
      .eq('order_id', orderId);
    
    if (error) throw error;
    return data ? data.map(item => toCamelCase(item)) : [];
  }

  async getTicketsByOrderItem(orderItemId: string): Promise<TicketsTicket[]> {
    const { data, error } = await this.client
      .from('tickets_tickets')
      .select('*')
      .eq('order_item_id', orderItemId);
    
    if (error) throw error;
    return data ? data.map(ticket => toCamelCase(ticket)) : [];
  }

  async getTicketByQR(qrToken: string): Promise<TicketsTicket | null> {
    const { data, error } = await this.client
      .from('tickets_tickets')
      .select('*')
      .eq('qr_token', qrToken)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? toCamelCase(data) : null;
  }

  async updateTicket(id: string, data: Partial<InsertTicketsTicket>): Promise<TicketsTicket> {
    const snakeCaseData = toSnakeCase({
      ...data,
      updated_at: new Date().toISOString()
    });

    const { data: ticket, error } = await this.client
      .from('tickets_tickets')
      .update(snakeCaseData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(ticket);
  }

  async getOrderItemById(id: string): Promise<TicketsOrderItem | null> {
    const { data, error } = await this.client
      .from('tickets_order_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? toCamelCase(data) : null;
  }

  // ============ MISSING ADMIN FUNCTIONS ============
  async updateOrganizerStripeAccount(id: string, stripeAccountId: string): Promise<TicketsOrganizer> {
    const { data, error } = await this.client
      .from('organizers')
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

  // REMOVED: updateOrganizerPayoutSettings - MoR-only method removed for Stripe Connect
  // Use updateOrganizer() to modify organizer settings instead

  async updateTier(id: string, data: Partial<InsertTicketsTier>): Promise<TicketsTier> {
    const snakeCaseData = toSnakeCase(data);

    const { data: tier, error } = await this.client
      .from('tickets_tiers')
      .update(snakeCaseData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return tier;
  }

  async deleteTier(id: string): Promise<void> {
    // Check if tier has any sold tickets first
    const { data: tickets, error: checkError } = await this.client
      .from('tickets_tickets')
      .select('id')
      .eq('tier_id', id)
      .eq('status', 'valid')
      .limit(1);

    if (checkError) throw checkError;
    
    if (tickets && tickets.length > 0) {
      throw new Error('Cannot delete tier with sold tickets');
    }
    
    const { error } = await this.client
      .from('tickets_tiers')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  async getEventMetrics(eventId: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    totalTickets: number;
    ticketsByStatus: Record<string, number>;
    salesByTier: Array<{ tierName: string; soldCount: number; revenue: number }>;
  }> {
    // Get basic metrics using SQL function calls
    const { data: orderMetrics, error: orderError } = await this.client.rpc('get_event_order_metrics', {
      event_id: eventId
    });

    // Fallback to manual queries if RPC doesn't exist
    if (orderError && orderError.code === 'PGRST202') {
      // Manual implementation
      const { data: orders } = await this.client
        .from('tickets_orders')
        .select('total_cents')
        .eq('event_id', eventId)
        .eq('status', 'paid');

      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_cents || 0), 0) || 0;

      // Get tickets by status
      const { data: tickets } = await this.client
        .from('tickets_tickets')
        .select('status, tickets_tiers!inner(event_id)')
        .eq('tickets_tiers.event_id', eventId);

      const ticketsByStatus: Record<string, number> = {};
      let totalTickets = 0;
      tickets?.forEach(ticket => {
        ticketsByStatus[ticket.status] = (ticketsByStatus[ticket.status] || 0) + 1;
        totalTickets++;
      });

      // Get sales by tier
      const { data: tiers } = await this.client
        .from('tickets_tiers')
        .select(`
          name,
          tickets_tickets(id),
          tickets_order_items(quantity, unit_price_cents, tickets_orders!inner(status))
        `)
        .eq('event_id', eventId);

      const salesByTier = tiers?.map(tier => ({
        tierName: tier.name,
        soldCount: tier.tickets_tickets?.length || 0,
        revenue: tier.tickets_order_items?.reduce((sum: number, item: any) => 
          item.tickets_orders.status === 'paid' ? sum + (item.quantity * item.unit_price_cents) : sum, 0) || 0
      })) || [];

      return {
        totalOrders,
        totalRevenue,
        totalTickets,
        ticketsByStatus,
        salesByTier
      };
    }

    if (orderError) throw orderError;
    return orderMetrics;
  }

  async getOrdersByEvent(eventId: string): Promise<TicketsOrder[]> {
    const { data, error } = await this.client
      .from('tickets_orders')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async getOrdersByBuyer(email: string): Promise<TicketsOrder[]> {
    const { data, error } = await this.client
      .from('tickets_orders')
      .select('*')
      .eq('buyer_email', email)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  // ============ INVENTORY MANAGEMENT ============
  async getTierSoldCount(tierId: string): Promise<number> {
    const { data, error } = await this.client
      .from('tickets_tickets')
      .select('id', { count: 'exact' })
      .eq('tier_id', tierId)
      .in('status', ['valid', 'used']); // Count valid and used tickets as sold
    
    if (error) throw error;
    return data?.length || 0;
  }

  async getTierReservedCount(tierId: string): Promise<number> {
    const { data, error } = await this.client
      .from('tickets_capacity_reservations')
      .select('quantity')
      .eq('tier_id', tierId)
      .gt('expires_at', new Date().toISOString());
    
    if (error && error.code !== 'PGRST116') throw error;
    return data?.reduce((sum, r) => sum + r.quantity, 0) || 0;
  }

  async createCapacityReservation(data: {
    tierId: string;
    quantity: number;
    reservationId: string;
    expiresAt: Date;
  }): Promise<void> {
    const { error } = await this.client
      .from('tickets_capacity_reservations')
      .insert({
        tier_id: data.tierId,
        quantity: data.quantity,
        reservation_id: data.reservationId,
        expires_at: data.expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });
    
    if (error) throw error;
  }

  async deleteCapacityReservation(reservationId: string): Promise<void> {
    const { error } = await this.client
      .from('tickets_capacity_reservations')
      .delete()
      .eq('reservation_id', reservationId);
    
    if (error) throw error;
  }

  async releaseExpiredReservations(tierId: string, quantity: number): Promise<void> {
    // Get expired reservations to release
    const { data: reservations, error: selectError } = await this.client
      .from('tickets_capacity_reservations')
      .select('reservation_id')
      .eq('tier_id', tierId)
      .lt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(quantity);

    if (selectError) throw selectError;

    if (reservations && reservations.length > 0) {
      const { error: deleteError } = await this.client
        .from('tickets_capacity_reservations')
        .delete()
        .in('reservation_id', reservations.map(r => r.reservation_id));

      if (deleteError) throw deleteError;
    }
  }

  async cleanupExpiredReservations(): Promise<void> {
    const { error } = await this.client
      .from('tickets_capacity_reservations')
      .delete()
      .lt('expires_at', new Date().toISOString());
    
    if (error) throw error;
  }

  // ============ DISCOUNTS ============
  async getDiscountByCode(eventId: string, code: string): Promise<TicketsDiscount | null> {
    const { data, error } = await this.client
      .from('tickets_discounts')
      .select('*')
      .eq('event_id', eventId)
      .eq('code', code)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async incrementDiscountUsage(discountId: string): Promise<void> {
    const { error } = await this.client.rpc('increment', {
      table_name: 'tickets_discounts',
      column_name: 'uses_count',
      row_id: discountId
    });
    
    // If RPC doesn't exist, fall back to manual update
    if (error && error.code === 'PGRST202') {
      const { data: discount } = await this.client
        .from('tickets_discounts')
        .select('uses_count')
        .eq('id', discountId)
        .single();
      
      if (discount) {
        await this.client
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
    const { error } = await this.client
      .from('tickets_webhooks')
      .insert(data);
    
    if (error) throw error;
  }

  async markWebhookProcessed(id: string, error?: string): Promise<void> {
    const { error: updateError } = await this.client
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
    // Convert camelCase to snake_case for Supabase
    const { error } = await this.client
      .from('tickets_audit')
      .insert({
        actor_type: data.actorType,
        actor_id: data.actorId,
        action: data.action,
        target_type: data.targetType,
        target_id: data.targetId,
        meta_json: data.metaJson,
        ip_address: data.ipAddress,
        user_agent: data.userAgent
      });
    
    if (error) throw error;
  }

  // ============ LEDGER & PAYOUT SYSTEM ============
  
  // Ledger operations
  async createLedgerEntry(data: {
    organizerId: string;
    orderId?: string;
    payoutId?: string;
    type: string;
    amountCents: number;
    currency?: string;
    description?: string;
  }): Promise<void> {
    const { error } = await this.client
      .from('tickets_ledger')
      .insert({
        organizer_id: data.organizerId,
        order_id: data.orderId,
        payout_id: data.payoutId,
        type: data.type,
        amount_cents: data.amountCents,
        currency: data.currency || 'CAD',
        description: data.description
      });
    
    if (error) throw error;
  }

  async getLedgerEntryByOrderId(orderId: string): Promise<any | null> {
    const { data, error } = await this.client
      .from('tickets_ledger')
      .select('*')
      .eq('order_id', orderId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getLedgerEntriesByOrganizer(organizerId: string): Promise<any[]> {
    const { data, error } = await this.client
      .from('tickets_ledger')
      .select('*')
      .eq('organizer_id', organizerId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async getOrganizerBalance(organizerId: string): Promise<number> {
    const { data, error } = await this.client
      .from('tickets_ledger')
      .select('amount_cents')
      .eq('organizer_id', organizerId)
      .is('payout_id', null); // Only unpaid entries
    
    if (error) throw error;
    
    return (data || []).reduce((sum, entry) => sum + entry.amount_cents, 0);
  }

  async getUnpaidLedgerEntries(organizerId: string): Promise<any[]> {
    const { data, error } = await this.client
      .from('tickets_ledger')
      .select('*')
      .eq('organizer_id', organizerId)
      .is('payout_id', null)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  // Payout operations - SECURE: Server-computed totals with atomic transactions
  async createAndFinalizePayout(data: {
    organizerId: string;
    periodStart: string;
    periodEnd: string;
    method: string;
    reference?: string;
    notes?: string;
  }): Promise<any> {
    // Check for existing payouts for this organizer and period to prevent duplicates
    const { data: existingPayouts, error: duplicateError } = await this.client
      .from('tickets_payouts')
      .select('id, status')
      .eq('organizer_id', data.organizerId)
      .eq('period_start', data.periodStart.split('T')[0])
      .eq('period_end', data.periodEnd.split('T')[0])
      .in('status', ['draft', 'ready', 'paid']);
    
    if (duplicateError) throw duplicateError;
    
    if (existingPayouts && existingPayouts.length > 0) {
      throw new Error(`Payout already exists for organizer ${data.organizerId} for period ${data.periodStart.split('T')[0]} to ${data.periodEnd.split('T')[0]}. Status: ${existingPayouts[0].status}`);
    }
    
    // Start transaction by computing unpaid ledger entries for the period
    const { data: unpaidEntries, error: ledgerError } = await this.client
      .from('tickets_ledger')
      .select('*')
      .eq('organizer_id', data.organizerId)
      .is('payout_id', null) // Only unpaid entries
      .gte('created_at', data.periodStart)
      .lte('created_at', data.periodEnd);
    
    if (ledgerError) throw ledgerError;
    
    if (!unpaidEntries || unpaidEntries.length === 0) {
      throw new Error('No unpaid ledger entries found for the specified period');
    }
    
    // Server-computed total - SECURE
    const totalCents = unpaidEntries.reduce((sum, entry) => sum + entry.amount_cents, 0);
    
    if (totalCents <= 0) {
      throw new Error('No positive balance to pay out');
    }
    
    // Create payout record
    const { data: payout, error: payoutError } = await this.client
      .from('tickets_payouts')
      .insert({
        organizer_id: data.organizerId,
        period_start: data.periodStart,
        period_end: data.periodEnd,
        total_cents: totalCents, // Server-computed, not caller-supplied
        currency: 'CAD',
        method: data.method,
        reference: data.reference,
        status: 'draft',
        notes: data.notes
      })
      .select()
      .single();
    
    if (payoutError) throw payoutError;
    
    // Link ledger entries to this payout atomically
    const { error: linkError } = await this.client
      .from('tickets_ledger')
      .update({ payout_id: payout.id })
      .in('id', unpaidEntries.map(e => e.id));
    
    if (linkError) {
      // Rollback: delete the payout if linking failed
      await this.client.from('tickets_payouts').delete().eq('id', payout.id);
      throw linkError;
    }
    
    return payout;
  }

  // Legacy create payout - deprecated in favor of createAndFinalizePayout
  async createPayout(data: {
    organizerId: string;
    periodStart: string;
    periodEnd: string;
    totalCents: number;
    currency?: string;
    method: string;
    reference?: string;
    status?: string;
    notes?: string;
  }): Promise<any> {
    console.warn('[DEPRECATED] createPayout with caller-supplied totalCents. Use createAndFinalizePayout for secure server-computed totals.');
    
    const { data: payout, error } = await this.client
      .from('tickets_payouts')
      .insert({
        organizer_id: data.organizerId,
        period_start: data.periodStart,
        period_end: data.periodEnd,
        total_cents: data.totalCents,
        currency: data.currency || 'CAD',
        method: data.method,
        reference: data.reference,
        status: data.status || 'draft',
        notes: data.notes
      })
      .select()
      .single();
    
    if (error) throw error;
    return payout;
  }

  async getPayoutsByOrganizer(organizerId: string): Promise<any[]> {
    const { data, error } = await this.client
      .from('tickets_payouts')
      .select('*')
      .eq('organizer_id', organizerId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async updatePayoutStatus(payoutId: string, status: string, reference?: string): Promise<void> {
    const updateData: any = { status };
    if (reference) updateData.reference = reference;
    if (status === 'paid') updateData.paid_at = new Date().toISOString();
    
    const { error } = await this.client
      .from('tickets_payouts')
      .update(updateData)
      .eq('id', payoutId);
    
    if (error) throw error;
  }

  async markPayoutPaid(payoutId: string, reference: string): Promise<void> {
    // Verify payout exists and get its details
    const { data: payout, error: payoutError } = await this.client
      .from('tickets_payouts')
      .select('*')
      .eq('id', payoutId)
      .single();
    
    if (payoutError) throw payoutError;
    if (!payout) throw new Error('Payout not found');
    if (payout.status === 'paid') throw new Error('Payout already marked as paid');
    
    // Update payout status to paid
    const { error: updateError } = await this.client
      .from('tickets_payouts')
      .update({
        status: 'paid',
        reference,
        paid_at: new Date().toISOString()
      })
      .eq('id', payoutId);
    
    if (updateError) throw updateError;

    // Verify all ledger entries are properly linked (should already be linked by createAndFinalizePayout)
    const { data: linkedEntries, error: checkError } = await this.client
      .from('tickets_ledger')
      .select('id')
      .eq('payout_id', payoutId);
    
    if (checkError) throw checkError;
    
    if (!linkedEntries || linkedEntries.length === 0) {
      // Rollback: reset payout status if no linked entries found
      await this.client
        .from('tickets_payouts')
        .update({ status: 'draft', paid_at: null, reference: null })
        .eq('id', payoutId);
      throw new Error('No ledger entries linked to this payout. Cannot mark as paid.');
    }
  }

  async getAllPendingPayouts(): Promise<any[]> {
    const { data, error } = await this.client
      .from('tickets_payouts')
      .select(`
        *,
        organizer:organizers(business_name)
      `)
      .in('status', ['draft', 'ready'])
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  // ============ ADDITIONAL METHODS FOR MY TICKETS ============
  async getOrdersByBuyer(email: string): Promise<TicketsOrder[]> {
    const { data, error } = await this.client
      .from('tickets_orders')
      .select('*')
      .eq('buyer_email', email)
      .eq('status', 'paid')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async getOrdersByUserId(userId: string): Promise<TicketsOrder[]> {
    const { data, error } = await this.client
      .from('tickets_orders')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'paid')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
  
  async getUserById(userId: string): Promise<any> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
  
  async getTicketById(ticketId: string): Promise<TicketsTicket | null> {
    const { data, error } = await this.client
      .from('tickets_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    if (data) {
      console.log('[getTicketById] Raw data from Supabase:', JSON.stringify(data, null, 2));
      const transformed = toCamelCase(data);
      console.log('[getTicketById] After toCamelCase:', JSON.stringify(transformed, null, 2));
      return transformed;
    }
    
    return null;
  }
  
  async getTicketsByOrderId(orderId: string): Promise<TicketsTicket[]> {
    const { data: orderItems, error: itemsError } = await this.client
      .from('tickets_order_items')
      .select('id')
      .eq('order_id', orderId);
    
    if (itemsError) throw itemsError;
    
    const orderItemIds = orderItems?.map(item => item.id) || [];
    
    if (orderItemIds.length === 0) return [];
    
    const { data, error } = await this.client
      .from('tickets_tickets')
      .select('*')
      .in('order_item_id', orderItemIds);
    
    if (error) throw error;
    return data || [];
  }
  
  async getOrderByChargeId(chargeId: string): Promise<TicketsOrder | null> {
    const { data, error } = await this.client
      .from('tickets_orders')
      .select('*')
      .eq('stripe_charge_id', chargeId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // ============ CHECK-IN OPERATIONS ============
  async getTicketByQrToken(qrToken: string): Promise<TicketsTicket | null> {
    const { data, error } = await this.client
      .from('tickets_tickets')
      .select('*')
      .eq('qr_token', qrToken)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async checkInTicket(ticketId: string, checkInBy: string): Promise<void> {
    const { error } = await this.client
      .from('tickets_tickets')
      .update({
        status: 'used',
        used_at: new Date().toISOString(),
        scanned_by: checkInBy
      })
      .eq('id', ticketId);
    
    if (error) throw error;
  }

  async getEventAttendees(eventId: string, filters: { status?: string; search?: string }): Promise<any[]> {
    // Build the query with joins
    let query = this.client
      .from('tickets_tickets')
      .select(`
        id:id,
        ticket_id:id,
        serial,
        qr_token,
        status,
        checked_in_at:used_at,
        scanned_by,
        notes,
        tags,
        is_vip,
        is_blocked,
        refunded_at,
        refund_reason,
        tier:tickets_tiers!inner(
          name,
          event_id
        ),
        order_item:tickets_order_items!inner(
          order:tickets_orders(
            buyer_email,
            buyer_name,
            buyer_phone,
            created_at
          )
        )
      `)
      .eq('tickets_tiers.event_id', eventId);
    
    // Apply status filter at query level
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    // Can only filter on direct fields, not nested ones
    // Search filtering will be done after fetch
    
    query = query.order('serial', { ascending: true });
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Flatten the nested structure to match expected format
    let results = (data || []).map((item: any) => ({
      ticketId: item.ticket_id,
      serial: item.serial,
      qrToken: item.qr_token,
      status: item.status,
      checkedInAt: item.checked_in_at,
      scannedBy: item.scanned_by,
      notes: item.notes,
      tags: item.tags,
      isVip: item.is_vip,
      isBlocked: item.is_blocked,
      refundedAt: item.refunded_at,
      refundReason: item.refund_reason,
      tierName: item.tier?.name,
      buyerEmail: item.order_item?.order?.buyer_email,
      buyerName: item.order_item?.order?.buyer_name,
      buyerPhone: item.order_item?.order?.buyer_phone,
      placedAt: item.order_item?.order?.created_at
    }));
    
    // Apply search filter in-memory if provided
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter((item: any) => 
        item.buyer_name?.toLowerCase().includes(searchLower) ||
        item.buyer_email?.toLowerCase().includes(searchLower) ||
        item.serial?.toLowerCase().includes(searchLower)
      );
    }
    
    return results;
  }

  async getCheckInStats(eventId: string): Promise<{
    totalTickets: number;
    checkedIn: number;
    remaining: number;
    recentCheckIns: any[];
  }> {
    // Get total and checked-in counts
    const { data: statsData, error: statsError } = await this.client
      .from('tickets_tickets')
      .select(`
        status,
        tier:tickets_tiers!inner(event_id)
      `)
      .eq('tickets_tiers.event_id', eventId)
      .in('status', ['valid', 'used']);
    
    if (statsError) throw statsError;
    
    const totalTickets = statsData?.length || 0;
    const checkedIn = statsData?.filter((t: any) => t.status === 'used').length || 0;
    
    // Get recent check-ins
    const { data: recentData, error: recentError } = await this.client
      .from('tickets_tickets')
      .select(`
        id,
        serial,
        used_at,
        scanned_by,
        tier:tickets_tiers!inner(
          name,
          event_id
        ),
        order_item:tickets_order_items!inner(
          order:tickets_orders(
            buyer_name,
            buyer_email
          )
        )
      `)
      .eq('tickets_tiers.event_id', eventId)
      .eq('status', 'used')
      .not('used_at', 'is', null)
      .order('used_at', { ascending: false })
      .limit(10);
    
    if (recentError) throw recentError;
    
    // Flatten the nested structure
    const recentCheckIns = (recentData || []).map((item: any) => ({
      id: item.id,
      serial: item.serial,
      used_at: item.used_at,
      scanned_by: item.scanned_by,
      tier_name: item.tier?.name,
      buyer_name: item.order_item?.order?.buyer_name,
      buyer_email: item.order_item?.order?.buyer_email
    }));
    
    return {
      totalTickets,
      checkedIn,
      remaining: totalTickets - checkedIn,
      recentCheckIns
    };
  }
}

export const ticketsDB = new TicketsSupabaseDB();