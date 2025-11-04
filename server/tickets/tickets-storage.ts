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

  async getOrganizerByEmail(email: string): Promise<TicketsOrganizer | null> {
    return ticketsDB.getOrganizerByEmail(email);
  }

  async getOrganizerByStripeAccountId(stripeAccountId: string): Promise<TicketsOrganizer | null> {
    return ticketsDB.getOrganizerByStripeAccountId(stripeAccountId);
  }

  async updateOrganizerStripeAccount(id: string, stripeAccountId: string): Promise<TicketsOrganizer> {
    return ticketsDB.updateOrganizerStripeAccount(id, stripeAccountId);
  }

  // REMOVED: updateOrganizerPayoutSettings - MoR-only method removed for Stripe Connect
  // Use updateOrganizer() to modify organizer settings instead

  async updateOrganizer(id: string, data: Partial<InsertTicketsOrganizer>): Promise<TicketsOrganizer> {
    return ticketsDB.updateOrganizer(id, data);
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

  async getOrdersByUserId(userId: string): Promise<TicketsOrder[]> {
    return ticketsDB.getOrdersByUserId(userId);
  }
  
  async getUserById(userId: string): Promise<any> {
    return ticketsDB.getUserById(userId);
  }
  
  async getTicketById(ticketId: string): Promise<TicketsTicket | null> {
    return ticketsDB.getTicketById(ticketId);
  }
  
  async getTicketsByOrderId(orderId: string): Promise<TicketsTicket[]> {
    return ticketsDB.getTicketsByOrderId(orderId);
  }
  
  async getOrderByChargeId(chargeId: string): Promise<TicketsOrder | null> {
    return ticketsDB.getOrderByChargeId(chargeId);
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
      usedAt: new Date(),
      scannedBy: scannedBy || 'staff'
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
    eventType: string;
    processed: boolean;
    error?: string;
    data: string;
  }): Promise<void> {
    return ticketsDB.createWebhook({
      kind: data.eventType,
      payloadJson: JSON.parse(data.data),
      status: data.processed ? 'processed' : 'pending',
      error: data.error
    });
  }

  // ============ AUDIT ============
  async createAudit(data: InsertTicketsAudit): Promise<void> {
    return ticketsDB.createAudit(data);
  }

  async createAuditLog(data: InsertTicketsAudit): Promise<void> {
    return ticketsDB.createAudit(data);
  }

  // ============ CHECK-IN OPERATIONS ============
  async getTicketByQrToken(qrToken: string): Promise<TicketsTicket | null> {
    return ticketsDB.getTicketByQrToken(qrToken);
  }

  async checkInTicket(ticketId: string, checkInBy: string): Promise<void> {
    return ticketsDB.checkInTicket(ticketId, checkInBy);
  }

  async getOrderItemById(id: string): Promise<TicketsOrderItem | null> {
    return ticketsDB.getOrderItemById(id);
  }

  async getEventAttendees(eventId: string, filters: { status?: string; search?: string }): Promise<any[]> {
    return ticketsDB.getEventAttendees(eventId, filters);
  }

  async getCheckInStats(eventId: string): Promise<{
    totalTickets: number;
    checkedIn: number;
    remaining: number;
    recentCheckIns: any[];
  }> {
    return ticketsDB.getCheckInStats(eventId);
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

  // ============ LEDGER & PAYOUT SYSTEM ============
  
  // Ledger operations
  async createLedgerEntry(data: {
    organizerId: string;
    orderId?: string;
    payoutId?: string;
    type: string;
    amountCents: number;
    description?: string;
    status?: string;
  }): Promise<void> {
    return ticketsDB.createLedgerEntry({
      organizerId: data.organizerId,
      orderId: data.orderId,
      payoutId: data.payoutId,
      type: data.type,
      amountCents: data.amountCents,
      currency: 'CAD',
      description: data.description
    });
  }

  async getLedgerEntryByOrderId(orderId: string): Promise<any | null> {
    return ticketsDB.getLedgerEntryByOrderId(orderId);
  }

  async getLedgerEntriesByOrganizer(organizerId: string): Promise<any[]> {
    return ticketsDB.getLedgerEntriesByOrganizer(organizerId);
  }

  async getOrganizerBalance(organizerId: string): Promise<number> {
    return ticketsDB.getOrganizerBalance(organizerId);
  }

  async getUnpaidLedgerEntries(organizerId: string): Promise<any[]> {
    return ticketsDB.getUnpaidLedgerEntries(organizerId);
  }

  // Payout operations - SECURE: Server-computed totals
  async createAndFinalizePayout(data: {
    organizerId: string;
    periodStart: Date;
    periodEnd: Date;
    method: string;
    reference?: string;
    notes?: string;
  }): Promise<any> {
    return ticketsDB.createAndFinalizePayout({
      organizerId: data.organizerId,
      periodStart: data.periodStart.toISOString(),
      periodEnd: data.periodEnd.toISOString(),
      method: data.method,
      reference: data.reference,
      notes: data.notes
    });
  }

  // Legacy create payout - deprecated
  async createPayout(data: {
    organizerId: string;
    periodStart: Date;
    periodEnd: Date;
    totalCents: number;
    method: string;
    reference?: string;
    notes?: string;
  }): Promise<any> {
    return ticketsDB.createPayout({
      organizerId: data.organizerId,
      periodStart: data.periodStart.toISOString().split('T')[0], // Convert to date string
      periodEnd: data.periodEnd.toISOString().split('T')[0],
      totalCents: data.totalCents,
      currency: 'CAD',
      method: data.method,
      reference: data.reference,
      status: 'draft',
      notes: data.notes
    });
  }

  async getPayoutsByOrganizer(organizerId: string): Promise<any[]> {
    return ticketsDB.getPayoutsByOrganizer(organizerId);
  }

  async updatePayoutStatus(payoutId: string, status: string, reference?: string): Promise<void> {
    return ticketsDB.updatePayoutStatus(payoutId, status, reference);
  }

  async markPayoutPaid(payoutId: string, reference: string): Promise<void> {
    return ticketsDB.markPayoutPaid(payoutId, reference);
  }

  async getAllPendingPayouts(): Promise<any[]> {
    return ticketsDB.getAllPendingPayouts();
  }

  // Analytics and aggregation
  async getOrganizerRevenueSummary(organizerId: string): Promise<{
    totalEarned: number;
    totalPaidOut: number;
    pendingBalance: number;
    lastPayoutDate?: Date;
  }> {
    const balance = await this.getOrganizerBalance(organizerId);
    const payouts = await this.getPayoutsByOrganizer(organizerId);
    
    const totalPaidOut = payouts
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.totalCents, 0);
    
    const totalEarned = balance + totalPaidOut;
    const lastPayout = payouts
      .filter(p => p.status === 'paid' && p.paidAt)
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())[0];

    return {
      totalEarned,
      totalPaidOut,
      pendingBalance: balance,
      lastPayoutDate: lastPayout?.paidAt ? new Date(lastPayout.paidAt) : undefined
    };
  }

  // ============ EXTENDED METHODS FOR REFUNDS & ANALYTICS ============
  // These methods are implemented in storage-extensions.ts
  async updateTicket(id: string, data: any): Promise<TicketsTicket> {
    const { storageExtensions } = await import('./storage-extensions');
    return storageExtensions.updateTicket(id, data);
  }

  async getOrdersByEvent(eventId: string): Promise<TicketsOrder[]> {
    const { storageExtensions } = await import('./storage-extensions');
    return storageExtensions.getOrdersByEvent(eventId);
  }

  async getOrdersByBuyer(email: string): Promise<TicketsOrder[]> {
    const { storageExtensions } = await import('./storage-extensions');
    return storageExtensions.getOrdersByBuyer(email);
  }

  async getOrdersByUserId(userId: string): Promise<TicketsOrder[]> {
    const { storageExtensions } = await import('./storage-extensions');
    return storageExtensions.getOrdersByUserId(userId);
  }

  async getTicketsByEvent(eventId: string): Promise<TicketsTicket[]> {
    const { storageExtensions } = await import('./storage-extensions');
    return storageExtensions.getTicketsByEvent(eventId);
  }

  async getTicketsByOrderItem(orderItemId: string): Promise<TicketsTicket[]> {
    const { storageExtensions } = await import('./storage-extensions');
    return storageExtensions.getTicketsByOrderItem(orderItemId);
  }

  async getTicketById(id: string): Promise<TicketsTicket | null> {
    const { storageExtensions } = await import('./storage-extensions');
    return storageExtensions.getTicketById(id);
  }

  async getUserById(userId: string): Promise<any | null> {
    const { storageExtensions } = await import('./storage-extensions');
    return storageExtensions.getUserById(userId);
  }

  async createAuditLog(data: InsertTicketsAudit): Promise<void> {
    const { storageExtensions } = await import('./storage-extensions');
    return storageExtensions.createAuditLog(data);
  }

  async createEmailCommunication(data: any): Promise<any> {
    const { storageExtensions } = await import('./storage-extensions');
    return storageExtensions.createEmailCommunication(data);
  }

  async updateEmailCommunication(id: string, data: any): Promise<any> {
    const { storageExtensions } = await import('./storage-extensions');
    return storageExtensions.updateEmailCommunication(id, data);
  }

  async getEmailCommunicationsByEvent(eventId: string): Promise<any[]> {
    const { storageExtensions } = await import('./storage-extensions');
    return storageExtensions.getEmailCommunicationsByEvent(eventId);
  }

  async updateAnalyticsCache(eventId: string, date: string, metricType: string, data: any): Promise<void> {
    const { storageExtensions } = await import('./storage-extensions');
    return storageExtensions.updateAnalyticsCache(eventId, date, metricType, data);
  }

  async getAnalyticsCache(eventId: string, date: string, metricType: string): Promise<any | null> {
    const { storageExtensions } = await import('./storage-extensions');
    return storageExtensions.getAnalyticsCache(eventId, date, metricType);
  }
}

export const ticketsStorage = new TicketsStorage();