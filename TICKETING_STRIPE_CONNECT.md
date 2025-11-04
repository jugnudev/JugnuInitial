# Ticketing with Stripe Connect - Implementation Guide

## Overview
The ticketing system has been converted from Merchant of Record (MoR) to **Stripe Connect** for direct-to-business payments. This means money flows directly to businesses' Stripe accounts, with the platform automatically collecting a fee.

## Architecture

### Stripe Connect Flow
1. **Business Onboarding**: Business accounts complete Stripe Connect Express onboarding
2. **Direct Payments**: Customer payments go directly to business's Stripe account
3. **Application Fees**: Platform automatically collects 5% fee (configurable via `platform_fee_bps`)
4. **Instant Settlement**: Businesses receive payments instantly (Stripe handles payouts)

### Database Schema Changes

#### tickets_organizers (Updated for Connect)
```sql
- stripe_account_id (text, unique) - Stripe Connect account ID
- stripe_onboarding_complete (boolean) - Has completed onboarding
- stripe_charges_enabled (boolean) - Can accept charges
- stripe_payouts_enabled (boolean) - Can receive payouts
- stripe_details_submitted (boolean) - Has submitted details
- platform_fee_bps (integer, default: 500) - Platform fee in basis points (500 = 5%)
- status ('pending' | 'active' | 'suspended') - Account status
```

#### tickets_orders (Simplified for Connect)
```sql
- application_fee_cents (integer) - Platform fee collected via Stripe Connect
- (removed: payout_id, payout_status, platform_fee_cents, net_to_organizer_cents)
```

## Integration with Communities

### User Flow
1. User creates business account and community
2. User navigates to Ticketing section in business dashboard
3. Clicks "Enable Ticketing" to start Stripe Connect onboarding
4. Completes Stripe Express onboarding (bank details, business info)
5. Once approved, can create ticketed events
6. Events appear in their community and public event listings
7. Customers purchase tickets, money goes directly to business

### API Endpoints

#### Connect Onboarding
- `POST /api/tickets/connect/onboarding` - Start or resume onboarding
- `GET /api/tickets/connect/status` - Check account status
- `POST /api/tickets/connect/dashboard-link` - Access Stripe Dashboard

#### Event Management (existing, now requires Connect)
- `POST /api/tickets/events` - Create event (requires active Connect account)
- `GET /api/tickets/events/organizer` - Get organizer's events
- `PATCH /api/tickets/events/:id` - Update event

#### Ticket Purchasing (updated for Connect)
- `POST /api/tickets/checkout/session` - Create checkout (uses Connect)
- `POST /api/tickets/checkout/payment-intent` - Create payment intent (uses Connect)

### Frontend Integration Points

1. **Business Dashboard** (`/business/ticketing/*`)
   - Onboarding status check
   - Event creation/management
   - Sales analytics
   - Stripe Dashboard link

2. **Community Portal** (`/community/:slug`)
   - Display upcoming events with ticket CTAs
   - Direct link to ticket purchase

3. **Public Events Page** (`/events`)
   - List all published events
   - Filter by city, category
   - Direct ticket purchase

## Payment Flow

### Checkout Session (Hosted)
```javascript
// If organizer has Connect account:
payment_intent_data: {
  application_fee_amount: pricing.feesCents, // 5% platform fee
  on_behalf_of: organizer.stripeAccountId, // Charge to business
  transfer_data: {
    destination: organizer.stripeAccountId
  }
}
```

### Payment Intent (Embedded)
```javascript
// Same parameters as checkout session
application_fee_amount: pricing.feesCents,
on_behalf_of: organizer.stripeAccountId,
transfer_data: { destination: organizer.stripeAccountId }
```

## Webhooks

### Connect Account Events
```
account.updated - Update organizer status when onboarding changes
```

### Payment Events  
```
payment_intent.succeeded - Mark order as paid
checkout.session.completed - Issue tickets
```

## Environment Variables

Required:
- `STRIPE_SECRET_KEY` - Platform Stripe secret key
- `STRIPE_CONNECT_WEBHOOK_SECRET` - For Connect webhooks

Optional:
- `ENABLE_TICKETING=true` - Enable ticketing feature
- `APP_URL` - Base URL for redirects

## Migration Notes

### For Existing Organizers
- Existing organizers need to complete Stripe Connect onboarding
- Old MoR payout fields are removed
- No automatic migration - manual onboarding required

### For New Organizers
- Must complete Connect onboarding before creating events
- Automatic status checking via webhooks
- Can access Stripe Dashboard for analytics

## Benefits Over MoR

1. **Compliance**: No money transmitter licensing needed
2. **Liability**: Platform doesn't hold customer funds
3. **Instant Payouts**: Businesses get paid immediately
4. **Simplicity**: Automatic fee collection via Stripe
5. **Scalability**: Easier to scale globally
6. **Transparency**: Businesses see all transactions in their Stripe Dashboard

## Testing

### Test Mode
1. Use Stripe test keys
2. Complete test onboarding with test bank details
3. Use test cards (4242 4242 4242 4242)
4. Verify fees are collected correctly

### Production Checklist
- [ ] Real Stripe keys configured
- [ ] Connect webhook endpoint verified
- [ ] Test onboarding flow end-to-end
- [ ] Verify application fees are correct (5%)
- [ ] Test refunds and disputes
- [ ] Confirm businesses can access Stripe Dashboard

## Support

### Common Issues
1. **Onboarding incomplete**: Check `stripe_onboarding_complete` flag
2. **Charges disabled**: Check `stripe_charges_enabled` flag
3. **Missing fees**: Verify `platform_fee_bps` is set correctly
4. **Webhook failures**: Check Connect webhook secret

### Debug Endpoints
- `GET /api/tickets/connect/status` - Check current status
- Stripe Dashboard → Connect → Accounts → View account details
