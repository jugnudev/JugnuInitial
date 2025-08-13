# Promote v2.3 Testing Guide

## Implementation Summary

✅ **Enhanced Pricing System**
- Daily/weekly pricing switches with live updates
- CA$15 (daily) / CA$75 (weekly) for Spotlight Banner
- CA$35 (daily) / CA$175 (weekly) for Homepage Hero  
- CA$250 (campaign) for Full Feature
- Early partner discount: 20% off first 3 bookings
- Multi-week discounts: 10% for 2+ weeks, 15% for 4+ weeks

✅ **Comprehensive Add-ons System**
- IG Story Boost (+CA$10)
- Mid-Run Repost (+CA$10)
- IG Carousel 4–6 slides (+CA$60)
- Link-in-bio 7 days (+CA$15)
- Creative design help (+CA$40)
- Real-time quote calculation with discount application

✅ **Enhanced Creative Specifications**
- Spotlight Banner: 1600×400 (desktop), 1080×600 (mobile)
- Homepage Hero: 1600×900 (safe area top 220px)
- Size specifications displayed on package cards

✅ **Enhanced Database Schema**
- sponsor_metrics_daily table with generated CTR column
- Row-level security policies implemented
- Upsert API for real-time metrics aggregation
- Campaign, creative, and placement tracking

✅ **Improved Content & UX**
- "Why It Works" section with targeted messaging
- "Who We Partner With" categories
- Early partner discount pills on cards
- Enhanced application form with campaign configurator

## Testing Instructions

### 1. Test Pricing System
```bash
# Visit /promote page
# Toggle between Daily/Weekly pricing
# Select different packages and verify pricing updates
# Test week duration adjustments
```

### 2. Test Add-ons & Quote Calculator
```bash
# Select a package (Spotlight Banner or Homepage Hero)
# Toggle add-ons and verify real-time price updates
# Test multi-week discounts (2+ weeks = 10%, 4+ weeks = 15%)
# Verify early partner discount application
```

### 3. Test Form Submission
```bash
curl -X POST http://localhost:5000/api/spotlight/leads \
  -H "Content-Type: application/json" \
  -d '{
    "business_name": "Test Restaurant v2.3",
    "contact_name": "John Doe", 
    "email": "john@testrestaurant.com",
    "placements": ["spotlight_banner"],
    "duration": "weekly",
    "weeks": 2,
    "add_ons": ["ig_story_boost", "creative_design"]
  }'
```

### 4. Test Database & RLS
```sql
-- Check metrics table structure
SELECT * FROM sponsor_metrics_daily LIMIT 1;

-- Test RLS policies (should require admin key or valid token)
SELECT * FROM sponsor_campaigns;
```

### 5. Test Analytics Tracking
```bash
# Test metrics upsert (requires admin key)
curl -X POST http://localhost:5000/api/spotlight/admin/metrics/track \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_KEY}" \
  -d '{
    "campaignId": "test-campaign-id",
    "placement": "events_banner", 
    "kind": "impression"
  }'
```

## Key Features Implemented

### Pricing Configuration (client/src/lib/pricing.ts)
- Type-safe pricing configuration
- Multi-week discount calculations  
- Early partner discount logic
- Auto-calculation engine with breakdown

### Enhanced Package Cards
- Dynamic pricing based on toggle state
- Early partner discount pills
- Creative size specifications
- Feature lists from configuration

### Campaign Configuration Form
- Duration toggle (daily/weekly)
- Week/day duration selector
- Add-ons with real-time pricing
- Quote summary with discount breakdown

### Database Enhancements
- sponsor_metrics_daily with CTR calculation
- Row-level security policies
- Admin and token-based access controls
- Upsert API for metrics aggregation

### Security & RLS
- Comprehensive policies for all sponsor tables
- Admin full access via service key
- Token-based read access for campaign data
- Environment-based admin authentication

## Environment Variables

```bash
# Required for early partner discount display
LAUNCH_DISCOUNT_ACTIVE=true

# Existing flags
ENABLE_HOME_MID=false
ENABLE_EVENTS_BANNER=true
ADMIN_KEY=your-secure-admin-key
```

## API Endpoints Added

- `POST /api/spotlight/admin/metrics/track` - Upsert daily metrics
- Enhanced lead submission with add-ons persistence
- Improved sponsor portal with date filtering

## Success Metrics

- ✅ Real-time pricing calculator working
- ✅ Add-ons system with persistent storage
- ✅ Enhanced database schema with RLS
- ✅ Creative specifications displayed
- ✅ Multi-week discount calculations
- ✅ Early partner discount configuration
- ✅ Secure admin endpoints operational

The system is now ready for production with comprehensive sponsorship management, real-time pricing, and hardened analytics tracking.