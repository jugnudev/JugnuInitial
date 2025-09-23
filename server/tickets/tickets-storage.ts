import { ticketsDB } from './tickets-supabase';
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

export class TicketsStorage {
  // ============ ORGANIZERS ============
  async createOrganizer(data: InsertTicketsOrganizer): Promise<TicketsOrganizer> {
    return ticketsDB.createOrganizer(data);
  }

  async getOrganizerById(id: string): Promise<TicketsOrganizer | null> {
    return ticketsDB.getOrganizerById(id);
  }

  async getOrganizerByUserId(userId: string): Promise<TicketsOrganizer | null> {
    return ticketsDB.getOrganizerByUserId(userId);
  }

  async updateOrganizerStripeAccount(id: string, stripeAccountId: string): Promise<TicketsOrganizer> {
    return ticketsDB.updateOrganizerStripeAccount(id, stripeAccountId);
  }

  // ============ EVENTS ============
  async createEvent(data: InsertTicketsEvent): Promise<TicketsEvent> {
    return ticketsDB.createEvent(data);
  }

  async getEventById(id: string): Promise<TicketsEvent | null> {
    return ticketsDB.getEventById(id);
  }

  async getEventBySlug(slug: string): Promise<TicketsEvent | null> {
    return ticketsDB.getEventBySlug(slug);
  }

  async getPublicEvents(): Promise<TicketsEvent[]> {
    return ticketsDB.getPublicEvents();
  }

  async getEventsByOrganizer(organizerId: string): Promise<TicketsEvent[]> {
    return ticketsDB.getEventsByOrganizer(organizerId);
  }

  async updateEvent(id: string, data: Partial<InsertTicketsEvent>): Promise<TicketsEvent> {
    return ticketsDB.updateEvent(id, data);
  }

  async deleteEvent(id: string): Promise<void> {
    // Soft delete by archiving
    await ticketsDB.updateEvent(id, { status: 'archived' });
  }

  // ============ TIERS ============
  async createTier(data: InsertTicketsTier): Promise<TicketsTier> {
    return ticketsDB.createTier(data);
  }

  async getTiersByEvent(eventId: string): Promise<TicketsTier[]> {
    return ticketsDB.getTiersByEvent(eventId);
  }

  async getTierById(id: string): Promise<TicketsTier | null> {
    return ticketsDB.getTierById(id);
  }

  async updateTier(id: string, data: Partial<InsertTicketsTier>): Promise<TicketsTier> {
    return ticketsDB.updateTier(id, data);
  }

  async deleteTier(id: string): Promise<void> {
    return ticketsDB.deleteTier(id);
  }

  async checkTierAvailability(tierId: string, quantity: number): Promise<boolean> {
    // Validate quantity is within tier limits
    const tier = await this.getTierById(tierId);
    if (!tier) return false;
    
    if (tier.maxPerOrder && quantity > tier.maxPerOrder) {
      return false;
    }
    
    // Check inventory if tier has capacity limit
    if (tier.capacity) {
      // Count sold tickets for this tier
      const soldCount = await ticketsDB.getTierSoldCount(tierId);
      const available = tier.capacity - soldCount;
      if (available < quantity) {
        return false;
      }
    }
    
    return true;
  }

  // ============ ORDERS ============
  async createOrder(data: InsertTicketsOrder): Promise<TicketsOrder> {
    return ticketsDB.createOrder(data);
  }

  async createOrderItem(data: InsertTicketsOrderItem): Promise<TicketsOrderItem> {
    return ticketsDB.createOrderItem(data);
  }

  async createTicket(data: InsertTicketsTicket): Promise<TicketsTicket> {
    return ticketsDB.createTicket(data);
  }

  async getOrderById(id: string): Promise<TicketsOrder | null> {
    return ticketsDB.getOrderById(id);
  }

  async getOrderByCheckoutSession(sessionId: string): Promise<TicketsOrder | null> {
    return ticketsDB.getOrderByCheckoutSession(sessionId);
  }

  async getOrderByPaymentIntent(paymentIntentId: string): Promise<TicketsOrder | null> {
    return ticketsDB.getOrderByPaymentIntent(paymentIntentId);
  }

  async getOrdersByEvent(eventId: string): Promise<TicketsOrder[]> {
    return ticketsDB.getOrdersByEvent(eventId);
  }

  async getOrdersByBuyer(email: string): Promise<TicketsOrder[]> {
    return ticketsDB.getOrdersByBuyer(email);
  }

  async getEventMetrics(eventId: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    totalTickets: number;
    ticketsByStatus: Record<string, number>;
    salesByTier: Array<{ tierName: string; soldCount: number; revenue: number }>;
  }> {
    return ticketsDB.getEventMetrics(eventId);
  }

  async markOrderPaid(orderId: string, paymentIntentId: string): Promise<TicketsOrder> {
    return ticketsDB.markOrderPaid(orderId, paymentIntentId);
  }

  async getOrderItems(orderId: string): Promise<TicketsOrderItem[]> {
    return ticketsDB.getOrderItems(orderId);
  }

  async getTicketsByOrderItem(orderItemId: string): Promise<TicketsTicket[]> {
    return ticketsDB.getTicketsByOrderItem(orderItemId);
  }

  async getTicketByQR(qrToken: string): Promise<TicketsTicket | null> {
    return ticketsDB.getTicketByQR(qrToken);
  }

  async updateTicket(id: string, data: Partial<InsertTicketsTicket>): Promise<TicketsTicket> {
    return ticketsDB.updateTicket(id, data);
  }

  async getOrderItemById(id: string): Promise<TicketsOrderItem | null> {
    return ticketsDB.getOrderItemById(id);
  }

  async validateTicket(qrToken: string): Promise<TicketsTicket | null> {
    return this.getTicketByQR(qrToken);
  }

  async markTicketUsed(ticketId: string, scannedBy?: string): Promise<void> {
    await this.updateTicket(ticketId, {
      status: 'used',
      checkedInAt: new Date(),
      checkedInBy: scannedBy || 'staff'
    });
  }

  async refundTicket(ticketId: string): Promise<void> {
    // Implementation needed
    throw new Error('Not implemented yet');
  }

  async updateOrder(orderId: string, data: Partial<InsertTicketsOrder>): Promise<TicketsOrder> {
    return ticketsDB.updateOrder(orderId, data);
  }

  // ============ DISCOUNTS ============
  async createDiscount(data: InsertTicketsDiscount): Promise<TicketsDiscount> {
    // Implementation needed
    throw new Error('Not implemented yet');
  }

  async getDiscountByCode(eventId: string, code: string): Promise<TicketsDiscount | null> {
    return ticketsDB.getDiscountByCode(eventId, code);
  }

  async updateDiscountUsage(discountId: string): Promise<void> {
    return ticketsDB.incrementDiscountUsage(discountId);
  }

  // ============ WEBHOOKS ============
  async createWebhook(data: InsertTicketsWebhook): Promise<void> {
    return ticketsDB.createWebhook(data);
  }

  async markWebhookProcessed(id: string, error?: string): Promise<void> {
    return ticketsDB.markWebhookProcessed(id, error);
  }

  async logWebhookEvent(data: {
    eventId: string;
    eventType: string;
    processed: boolean;
    error?: string;
    data: string;
  }): Promise<void> {
    return ticketsDB.createWebhook({
      eventId: data.eventId,
      eventType: data.eventType,
      processed: data.processed,
      error: data.error,
      data: data.data
    });
  }

  // ============ AUDIT ============
  async createAudit(data: InsertTicketsAudit): Promise<void> {
    return ticketsDB.createAudit(data);
  }

  // ============ INVENTORY MANAGEMENT ============
  async getAvailableCapacity(tierId: string): Promise<number | null> {
    // Check if tier has a capacity limit
    const tier = await this.getTierById(tierId);
    if (!tier || !tier.capacity) return null; // No limit
    
    // Count sold tickets for this tier
    const soldCount = await ticketsDB.getTierSoldCount(tierId);
    const reserved = await ticketsDB.getTierReservedCount(tierId);
    
    return Math.max(0, tier.capacity - soldCount - reserved);
  }

  async reserveCapacity(tierId: string, quantity: number, reservationId?: string): Promise<boolean> {
    try {
      // Use database transaction to safely reserve capacity
      const available = await this.getAvailableCapacity(tierId);
      if (available === null || available >= quantity) {
        // Create reservation record
        await ticketsDB.createCapacityReservation({
          tierId,
          quantity,
          reservationId: reservationId || nanoid(),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error reserving capacity:', error);
      return false;
    }
  }

  async releaseCapacity(tierId: string, quantity: number, reservationId?: string): Promise<void> {
    try {
      if (reservationId) {
        // Release specific reservation
        await ticketsDB.deleteCapacityReservation(reservationId);
      } else {
        // Release oldest reservations for this tier up to quantity
        await ticketsDB.releaseExpiredReservations(tierId, quantity);
      }
    } catch (error) {
      console.error('Error releasing capacity:', error);
    }
  }

  async cleanupExpiredReservations(): Promise<void> {
    try {
      await ticketsDB.cleanupExpiredReservations();
    } catch (error) {
      console.error('Error cleaning up expired reservations:', error);
    }
  }
}

export const ticketsStorage = new TicketsStorage();