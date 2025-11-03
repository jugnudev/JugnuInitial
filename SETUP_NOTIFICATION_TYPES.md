# Fix Notification Type Check Constraint in Supabase

## Problem
The `community_notifications` table in Supabase has a CHECK CONSTRAINT on the `type` column that's rejecting notification inserts. The error message is:

```
new row for relation "community_notifications" violates check constraint "community_notifications_type_check"
```

## Notification Types Used in Code
The application uses these notification types:
1. `membership_approved` - When a membership request is approved
2. `role_updated` - When a user's role is changed (e.g., promoted to moderator)
3. `post_published` - When a new post is published in the community
4. `comment_reply` - When someone replies to your comment
5. `post_comment` - When someone comments on your post
6. `mention` - When someone mentions you (future use)
7. `poll_results` - When poll results are available (future use)
8. `giveaway_winner` - When you win a giveaway (future use)

## Solution: Update the Check Constraint

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"

### Step 2: Run This SQL Script

```sql
-- Drop the existing check constraint
ALTER TABLE community_notifications 
DROP CONSTRAINT IF EXISTS community_notifications_type_check;

-- Add a new check constraint with all allowed notification types
ALTER TABLE community_notifications
ADD CONSTRAINT community_notifications_type_check
CHECK (type IN (
  'membership_approved',
  'role_updated', 
  'post_published',
  'comment_reply',
  'post_comment',
  'mention',
  'poll_results',
  'giveaway_winner',
  'membership_request',
  'new_post'
));
```

### Step 3: Verify the Constraint
Run this query to verify the constraint was updated:

```sql
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'community_notifications_type_check';
```

## Alternative: Remove the Constraint Entirely
If you want maximum flexibility (allows any notification type):

```sql
-- Simply drop the constraint without adding a new one
ALTER TABLE community_notifications 
DROP CONSTRAINT IF EXISTS community_notifications_type_check;
```

**Note:** Without a constraint, the `type` column accepts any text value, which provides more flexibility for future notification types but reduces data validation.

## After Running the SQL

1. The notification system will immediately start working
2. Notifications will be created for:
   - New comments on your posts
   - Replies to your comments
   - Membership approvals
   - Role updates
   - New posts in communities you're subscribed to

## Testing

After updating the constraint:
1. Post a comment on someone's post
2. Check the `community_notifications` table in Supabase
3. You should see a new notification row created
4. Check the notification bell in the app - it should show the notification
