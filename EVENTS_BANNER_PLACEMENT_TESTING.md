# Events Banner Placement Testing Guide

## Implementation Summary

✅ **Dynamic Banner Placement Based on Event Count**
- **0 events**: Banner shows inside empty state
- **1 event**: Banner above single card (below filters)
- **2-3 events**: Banner after first card
- **4+ events**: Banner after first full row (after index 1)

✅ **Environment Gating**
- Controlled by `VITE_ENABLE_EVENTS_BANNER` environment variable
- Default enabled unless explicitly set to 'false'

✅ **Sponsored Pill**
- "Sponsored" badge visible on top-left of banner
- Only shows when `is_sponsored` is true in campaign data

✅ **Preserved Analytics**
- Impression tracking with ≥50% viewport visibility
- Click tracking with UTM parameters
- Frequency capping (1x per user per day per campaign)

## Testing Scenarios

### 1. Zero Events State
```bash
# Access /events with no active events
# Banner should appear below the empty state message
```

### 2. Single Event State  
```bash
# When only 1 event is available
# Banner should appear above the single event card
```

### 3. Multiple Events (2-3)
```bash
# When 2-3 events are available
# Banner should appear after the first event card
```

### 4. Many Events (4+)
```bash
# When 4+ events are available
# Banner should appear after the first full row (after 2nd card)
```

### 5. Environment Gating
```bash
# Set VITE_ENABLE_EVENTS_BANNER=false
# Banner should not appear anywhere
```

## Mobile vs Desktop Testing

- **Mobile**: Single column layout, banner spans full width
- **Desktop**: Two-column layout, banner spans both columns with `md:col-span-2`

## Verification Points

- [ ] Banner appears in correct position for each event count
- [ ] "Sponsored" pill is visible on banner
- [ ] Impression tracking fires when banner is 50% visible
- [ ] Click tracking works with UTM parameters
- [ ] Frequency capping prevents multiple daily impressions
- [ ] Environment flag properly gates banner display
- [ ] Banner adapts to mobile/desktop layouts properly

## API Testing

```bash
# Test active campaign API
curl http://localhost:5000/api/spotlight/active?route=/events&slots=events_banner

# Expected response with active campaign:
{
  "ok": true,
  "spotlights": {
    "events_banner": {
      "campaignId": "test-campaign-id",
      "sponsor_name": "Test Sponsor",
      "headline": "Test Headline",
      "click_url": "https://example.com",
      "is_sponsored": true,
      "creative": {
        "image_desktop_url": "...",
        "image_mobile_url": "..."
      }
    }
  }
}
```

## Metrics Tracking

```bash
# Impression should auto-fire when banner is visible
# Click should fire when banner is clicked
# Check sponsor_metrics_daily table for tracking data

SELECT * FROM sponsor_metrics_daily 
WHERE placement = 'events_banner' 
ORDER BY date DESC LIMIT 5;
```

The dynamic placement system ensures sponsors get visibility regardless of event count, maximizing monetization opportunities while maintaining user experience.