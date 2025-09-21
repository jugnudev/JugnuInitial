# Ticketing System Test Guide

## 🎫 Test Event Created Successfully!

**Event Details:**
- **Title:** Diljit Dosanjh - Dil-Luminati Tour Vancouver
- **Date:** December 15, 2025 at 7:30 PM PST
- **Venue:** Rogers Arena, Vancouver
- **URL:** `/tickets/event/diljit-dosanjh-dil-luminati-tour-vancouver-weqx9i`

**Available Ticket Tiers:**
1. Early Bird Special - $59 (ends Nov 1)
2. General Admission - $79
3. VIP Floor Seats - $159
4. Platinum Experience - $299

**Discount Codes:**
- `EARLYBIRD` - 20% off (valid until Nov 15)
- `JUGNU10` - $10 off (unlimited uses)
- `VIP50` - $50 off (limited to 20 uses)

---

## 📋 Testing Steps

### 1. Browse Events (Public View)
1. Navigate to `/tickets` 
2. You should see the Diljit Dosanjh concert event card
3. The card should display:
   - Event image
   - Title and venue
   - Date (Dec 15, 2025)
   - Starting price ($59 - from Early Bird tier)
   - "View Event" button

### 2. View Event Details
1. Click "View Event" on the event card
2. Navigate to `/tickets/event/diljit-dosanjh-dil-luminati-tour-vancouver-weqx9i`
3. Verify you see:
   - Event cover image
   - Full event description
   - Venue and date/time details
   - All 4 ticket tiers with prices and availability

### 3. Select Tickets
1. On the event detail page, try the ticket selector:
   - Click + to increase quantity (max 8 for General Admission)
   - Click - to decrease quantity
   - Notice the order summary updates with subtotal
   - Service fees (5%) and taxes (GST 5% + PST 7%) are calculated

### 4. Test Discount Codes
1. Select some tickets (e.g., 2 General Admission = $158)
2. In the discount code field, enter: `EARLYBIRD`
3. Click "Apply"
4. Verify:
   - Success message appears
   - Discount amount shows (20% off)
   - Total is recalculated with discount

Try other codes:
- `JUGNU10` - Should give $10 off
- `VIP50` - Should give $50 off
- `INVALID` - Should show error message

### 5. Proceed to Checkout
1. After selecting tickets, click "Continue to Checkout"
2. You'll see the checkout form with fields for:
   - Name
   - Email
   - Phone
3. Fill in the form:
   - Name: Test User
   - Email: test@example.com
   - Phone: 604-555-0100
4. Review the order summary on the right

### 6. Stripe Checkout (Requires Stripe Keys)
**Note:** Full payment processing requires Stripe API keys to be configured

If Stripe is configured:
1. Click "Pay with Stripe"
2. You'll be redirected to Stripe Checkout
3. Use test card: 4242 4242 4242 4242
4. Complete the payment
5. You'll be redirected back with order confirmation

### 7. Organizer Dashboard
1. Navigate to `/tickets/organizer/dashboard`
2. Currently requires authentication setup
3. When authenticated, organizers can:
   - View their events
   - See sales analytics
   - Manage event details
   - Download attendee lists

### 8. Event Creation (Organizer Feature)
1. From organizer dashboard, click "Create New Event"
2. Fill in event details:
   - Title, description, venue
   - Date and time
   - Upload cover image
3. Add ticket tiers:
   - Name and price
   - Capacity limits
   - Sales period
4. Configure settings:
   - Refund policy
   - Tax collection
   - Service fee structure
5. Save as draft or publish immediately

### 9. QR Code Ticket Validation
Once orders are completed:
1. Tickets are generated with unique QR codes
2. Navigate to `/tickets/validate`
3. Scan or enter QR token
4. System validates and marks ticket as used

### 10. Analytics & Reporting
For event organizers:
1. Real-time sales tracking
2. Revenue breakdown
3. Ticket tier performance
4. Attendee demographics
5. Export data as CSV

---

## 🔧 Test Scenarios

### Capacity Testing
1. The Early Bird tier has 100 capacity
2. Try selecting more than available
3. System should prevent over-booking

### Date-based Availability
1. Early Bird tickets end Nov 1, 2025
2. After that date, they won't be purchasable
3. All tickets stop selling at event start time

### Refund Policy
1. Refunds allowed until Dec 14, 2025 (day before event)
2. After that, no refunds possible
3. Refund requests process through organizer dashboard

### Multi-tier Purchase
1. Try mixing different tiers in one order
2. Each tier respects its own max per order limit
3. Total order respects overall limits

---

## 🛠️ API Endpoints to Test

### Public Endpoints
- `GET /api/tickets/events/public` - List all public events
- `GET /api/tickets/events/{slug}` - Get event details
- `POST /api/tickets/discounts/validate` - Validate discount code
- `POST /api/tickets/checkout/create` - Create checkout session

### Authenticated Endpoints (Organizer)
- `GET /api/tickets/organizer/events` - List organizer's events
- `POST /api/tickets/events` - Create new event
- `PUT /api/tickets/events/{id}` - Update event
- `GET /api/tickets/events/{id}/orders` - Get event orders
- `GET /api/tickets/events/{id}/metrics` - Get event analytics

---

## 📱 Mobile Testing
1. Test responsive design on mobile devices
2. Ticket selection should be touch-friendly
3. Forms should be mobile-optimized
4. QR codes should be scannable on mobile

---

## ⚠️ Known Limitations
- Stripe payment requires API keys configuration
- Organizer authentication needs session setup
- Email notifications require SendGrid configuration
- File uploads need storage configuration

---

## 🔐 Environment Variables Needed
For full functionality, ensure these are set:
- `STRIPE_SECRET_KEY` - For payment processing
- `STRIPE_WEBHOOK_SECRET` - For webhook handling
- `SENDGRID_API_KEY` - For email notifications
- `SUPABASE_URL` - Already configured ✅
- `SUPABASE_SERVICE_KEY` - Already configured ✅