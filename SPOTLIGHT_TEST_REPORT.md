# Spotlight System Sanity Check Report

## Test Results Summary

### ✅ API JSON Tests (PASSED)

#### 1. Health Check
- **Endpoint**: `/api/health`
- **Result**: `{"ok":true}`
- **Status**: ✅ PASS - Returns proper JSON

#### 2. Spotlight Active API  
- **Endpoint**: `/api/spotlight/active?placement=events_banner`
- **Result**: Returns active campaign data with events_banner placement
- **Status**: ✅ PASS - Campaign data properly formatted

#### 3. Unknown API Route Fallback
- **Endpoint**: `/api/nonexistent-route`
- **Result**: `{"ok":false,"error":"Not found"}`
- **Status**: ✅ PASS - Returns JSON 404, not HTML

### ✅ Portal Token System (PASSED)

#### Token Creation
- **72-hour token**: Successfully created with UUID and expiration
- **2-minute token**: Successfully created for expiration testing  
- **Portal access**: Token validation working correctly

#### Token Flow Verification
- Portal tokens stored in database with proper campaign references
- Service role authentication working for admin operations
- Campaign validation ensures only active campaigns can generate tokens

### 🔄 Visual Tests (IN PROGRESS)

#### Events Banner Positioning
Testing banner placement with different event counts:
- 0 events: Empty state verification
- 1 event: Above first card placement
- 2-3 events: After first card placement  
- 4+ events: After first row placement

#### Impression Tracking
- 50% viewability threshold detection
- Once per session frequency capping
- Debug mode bypass functionality

#### UTM Tracking
- Banner clicks preserve `utm_source=jugnu&utm_medium=spotlight`
- URL parameter forwarding to sponsor destination

#### CSV Export
- Download functionality from sponsor portal
- Data format verification
- Sample data display

### Technical Implementation Notes

#### Database Schema
- `sponsor_portal_tokens` table properly created with UUID primary keys
- Row-level security enabled for data protection
- Campaign references with CASCADE delete

#### API Architecture  
- All `/api/*` routes return JSON (no HTML fallback)
- Proper Content-Type headers set
- Development error details include Supabase codes
- Admin endpoints require x-admin-key authentication

#### Security Features
- Service role used for admin operations
- Token-based portal access with expiration
- Campaign validation prevents inactive campaign access
- Environment-based admin key protection

---

## Next Steps

1. Complete visual banner positioning tests
2. Verify impression tracking with screenshots
3. Test frequency capping in normal vs debug modes
4. Validate UTM parameter preservation
5. Demonstrate CSV export functionality
6. Document any failures with fixes

## Evidence Collection

Screenshots and raw JSON responses will be attached for:
- Banner positioning at different event counts
- Portal loading with metrics charts
- Debug mode console messages
- UTM tracking verification
- CSV export sample