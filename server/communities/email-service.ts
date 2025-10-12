import sgMail from '@sendgrid/mail';
import { communitiesStorage } from './communities-supabase';
import type { 
  CommunityNotification, 
  CommunityEmailQueue,
  CommunityNotificationPreferences,
  User,
  Community
} from '@shared/schema';

// Initialize SendGrid
const initSendGrid = () => {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[Email Service] SendGrid API key not configured');
    return false;
  }
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  return true;
};

// Email templates
const emailTemplates = {
  newPost: {
    id: 'new_post',
    subject: (communityName: string) => `New post in ${communityName}`,
    html: (data: any) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          .post-preview { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${data.communityName}</h1>
            <p style="margin: 0; opacity: 0.9;">New post from ${data.authorName}</p>
          </div>
          <div class="content">
            <h2>${data.postTitle}</h2>
            <div class="post-preview">
              <p>${data.postExcerpt}</p>
            </div>
            <a href="${data.postUrl}" class="button">Read Full Post</a>
            <div class="footer">
              <p>You're receiving this because you're a member of ${data.communityName}.</p>
              <p><a href="${data.unsubscribeUrl}">Unsubscribe</a> | <a href="${data.preferencesUrl}">Update preferences</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  membershipApproved: {
    id: 'membership_approved',
    subject: (communityName: string) => `Welcome to ${communityName}!`,
    html: (data: any) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
          .benefits { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to ${data.communityName}!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.userName},</p>
            <p>Great news! Your membership request has been approved. You're now part of ${data.communityName}.</p>
            <div class="benefits">
              <h3>As a member, you can:</h3>
              <ul>
                <li>Post and share content</li>
                <li>Comment and interact with other members</li>
                <li>Participate in polls and discussions</li>
                <li>Access exclusive community content</li>
              </ul>
            </div>
            <a href="${data.communityUrl}" class="button">Visit Community</a>
            <div class="footer">
              <p><a href="${data.unsubscribeUrl}">Unsubscribe</a> | <a href="${data.preferencesUrl}">Update preferences</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  newComment: {
    id: 'new_comment',
    subject: (postTitle: string) => `New comment on "${postTitle}"`,
    html: (data: any) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
          .comment { background: #f9fafb; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${data.communityName}</h1>
            <p style="margin: 0; opacity: 0.9;">New comment on your post</p>
          </div>
          <div class="content">
            <h2>${data.postTitle}</h2>
            <p><strong>${data.commenterName}</strong> commented:</p>
            <div class="comment">
              <p>${data.commentText}</p>
            </div>
            <a href="${data.commentUrl}" class="button">View Comment</a>
            <div class="footer">
              <p>You're receiving this because you authored this post.</p>
              <p><a href="${data.unsubscribeUrl}">Unsubscribe</a> | <a href="${data.preferencesUrl}">Update preferences</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  pollResults: {
    id: 'poll_results',
    subject: (pollQuestion: string) => `Poll results: "${pollQuestion}"`,
    html: (data: any) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
          .results { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .result-bar { background: #e5e7eb; border-radius: 4px; margin: 10px 0; overflow: hidden; }
          .result-fill { background: #667eea; color: white; padding: 8px 12px; white-space: nowrap; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${data.communityName}</h1>
            <p style="margin: 0; opacity: 0.9;">Poll has closed</p>
          </div>
          <div class="content">
            <h2>${data.pollQuestion}</h2>
            <p>The poll you participated in has closed. Here are the results:</p>
            <div class="results">
              ${data.results.map((r: any) => `
                <div class="result-bar">
                  <div class="result-fill" style="width: ${r.percentage}%">
                    ${r.option}: ${r.votes} votes (${r.percentage}%)
                  </div>
                </div>
              `).join('')}
              <p style="margin-top: 15px;"><strong>Total votes:</strong> ${data.totalVotes}</p>
            </div>
            <a href="${data.pollUrl}" class="button">View Full Results</a>
            <div class="footer">
              <p>You're receiving this because you participated in this poll.</p>
              <p><a href="${data.unsubscribeUrl}">Unsubscribe</a> | <a href="${data.preferencesUrl}">Update preferences</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  mention: {
    id: 'mention',
    subject: (communityName: string) => `You were mentioned in ${communityName}`,
    html: (data: any) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
          .mention { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${data.communityName}</h1>
            <p style="margin: 0; opacity: 0.9;">You were mentioned</p>
          </div>
          <div class="content">
            <p><strong>${data.mentionerName}</strong> mentioned you in ${data.contextType}:</p>
            <div class="mention">
              <p>${data.mentionText}</p>
            </div>
            <a href="${data.mentionUrl}" class="button">View ${data.contextType}</a>
            <div class="footer">
              <p>You're receiving this because you were mentioned.</p>
              <p><a href="${data.unsubscribeUrl}">Unsubscribe</a> | <a href="${data.preferencesUrl}">Update preferences</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  },

  dailyDigest: {
    id: 'daily_digest',
    subject: (communityName: string) => `Your daily digest from ${communityName}`,
    html: (data: any) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
          .section { margin: 25px 0; padding: 20px 0; border-bottom: 1px solid #e5e7eb; }
          .section:last-child { border-bottom: none; }
          .item { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 10px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Daily Digest</h1>
            <p style="margin: 0; opacity: 0.9;">${data.date}</p>
          </div>
          <div class="content">
            ${data.notifications.length > 0 ? `
              <div class="section">
                <h2>📬 Your Notifications (${data.notifications.length})</h2>
                ${data.notifications.map((n: any) => `
                  <div class="item">
                    <strong>${n.title}</strong>
                    <p>${n.body}</p>
                    <a href="${n.actionUrl}">View →</a>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            ${data.newPosts?.length > 0 ? `
              <div class="section">
                <h2>📝 New Posts</h2>
                ${data.newPosts.map((p: any) => `
                  <div class="item">
                    <strong>${p.title}</strong> by ${p.authorName}
                    <p>${p.excerpt}</p>
                    <a href="${p.url}">Read more →</a>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            <a href="${data.communityUrl}" class="button">Visit Community</a>
            
            <div class="footer">
              <p>You're receiving this daily digest based on your preferences.</p>
              <p><a href="${data.unsubscribeUrl}">Unsubscribe</a> | <a href="${data.preferencesUrl}">Update preferences</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }
};

// Email service class
export class CommunityEmailService {
  private isConfigured: boolean;
  
  constructor() {
    this.isConfigured = initSendGrid();
  }

  // Send a single notification email
  async sendNotificationEmail(
    notification: CommunityNotification,
    recipient: User,
    community?: Community
  ): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('[Email Service] SendGrid not configured, skipping email');
      return false;
    }

    try {
      // Check user's email preferences
      const preferences = await communitiesStorage.getNotificationPreferences(
        recipient.id,
        notification.communityId
      );
      
      if (!preferences?.emailEnabled || !recipient.emailNotifications) {
        console.log(`[Email Service] Email notifications disabled for user ${recipient.id}`);
        return false;
      }

      // Get the appropriate template
      const template = this.getTemplateForNotificationType(notification.type);
      if (!template) {
        console.warn(`[Email Service] No template for notification type: ${notification.type}`);
        return false;
      }

      // Build email data
      const emailData = await this.buildEmailData(notification, recipient, community);
      
      // Send the email
      const msg = {
        to: recipient.email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@jugnu.com',
        subject: template.subject(community?.name || 'Community'),
        html: template.html(emailData),
      };

      await sgMail.send(msg);
      
      // Mark notification as email sent
      await communitiesStorage.client
        .from('community_notifications')
        .update({ 
          is_email_sent: true, 
          email_sent_at: new Date().toISOString() 
        })
        .eq('id', notification.id);

      console.log(`[Email Service] Sent email for notification ${notification.id} to ${recipient.email}`);
      return true;
    } catch (error) {
      console.error('[Email Service] Failed to send email:', error);
      return false;
    }
  }

  // Send batch notifications (for bulk operations)
  async sendBatchNotifications(
    notifications: CommunityNotification[],
    community?: Community
  ): Promise<{ sent: number; failed: number }> {
    if (!this.isConfigured) {
      console.warn('[Email Service] SendGrid not configured, skipping emails');
      return { sent: 0, failed: notifications.length };
    }

    let sent = 0;
    let failed = 0;

    // Group notifications by recipient for batching
    const notificationsByRecipient = new Map<string, CommunityNotification[]>();
    for (const notification of notifications) {
      const existing = notificationsByRecipient.get(notification.recipientId) || [];
      existing.push(notification);
      notificationsByRecipient.set(notification.recipientId, existing);
    }

    // Process each recipient
    for (const [recipientId, recipientNotifications] of notificationsByRecipient) {
      try {
        const recipient = await communitiesStorage.getUserById(recipientId);
        if (!recipient) {
          failed += recipientNotifications.length;
          continue;
        }

        // Check if we should send individual or digest
        const preferences = await communitiesStorage.getNotificationPreferences(
          recipientId,
          community?.id
        );

        if (preferences?.emailFrequency === 'immediate') {
          // Send individual emails
          for (const notification of recipientNotifications) {
            const success = await this.sendNotificationEmail(notification, recipient, community);
            if (success) sent++;
            else failed++;
          }
        } else {
          // Queue for digest
          await this.queueForDigest(recipientNotifications, recipient, community);
          sent += recipientNotifications.length;
        }
      } catch (error) {
        console.error(`[Email Service] Failed to process notifications for ${recipientId}:`, error);
        failed += recipientNotifications.length;
      }
    }

    return { sent, failed };
  }

  // Queue notifications for digest email
  private async queueForDigest(
    notifications: CommunityNotification[],
    recipient: User,
    community?: Community
  ): Promise<void> {
    const preferences = await communitiesStorage.getNotificationPreferences(
      recipient.id,
      community?.id
    );
    
    // Determine next digest time
    const scheduledFor = this.getNextDigestTime(preferences);
    
    await communitiesStorage.queueEmail({
      recipientEmail: recipient.email,
      recipientName: `${recipient.firstName} ${recipient.lastName}`.trim(),
      communityId: community?.id,
      templateId: 'daily_digest',
      subject: `Your ${preferences?.emailFrequency || 'daily'} digest`,
      variables: {
        notifications,
        recipient,
        community
      },
      scheduledFor
    });
  }

  // Helper to get template for notification type
  private getTemplateForNotificationType(type: string) {
    const templateMap: { [key: string]: any } = {
      'post_published': emailTemplates.newPost,
      'membership_approved': emailTemplates.membershipApproved,
      'comment_reply': emailTemplates.newComment,
      'post_comment': emailTemplates.newComment,
      'poll_closed': emailTemplates.pollResults,
      'mention': emailTemplates.mention,
      'chat_mention': emailTemplates.mention,
    };
    
    return templateMap[type] || null;
  }

  // Build email data from notification
  private async buildEmailData(
    notification: CommunityNotification,
    recipient: User,
    community?: Community
  ): Promise<any> {
    const baseUrl = process.env.BASE_URL || 'https://thehouseofjugnu.com';
    
    return {
      communityName: community?.name || 'Community',
      communityUrl: `${baseUrl}/communities/${community?.slug}`,
      userName: `${recipient.firstName} ${recipient.lastName}`.trim() || recipient.email,
      ...notification.metadata,
      unsubscribeUrl: `${baseUrl}/account/unsubscribe?token=${this.generateUnsubscribeToken(recipient.id)}`,
      preferencesUrl: `${baseUrl}/account/profile#notifications`,
    };
  }


  // Get next digest send time
  private getNextDigestTime(preferences: CommunityNotificationPreferences | null): Date {
    const frequency = preferences?.emailFrequency || 'daily';
    const [hour, minute] = (preferences?.emailDigestTime || '09:00').split(':').map(Number);
    
    const nextSend = new Date();
    nextSend.setHours(hour, minute, 0, 0);
    
    const now = new Date();
    if (nextSend <= now) {
      if (frequency === 'daily') {
        nextSend.setDate(nextSend.getDate() + 1);
      } else if (frequency === 'weekly') {
        nextSend.setDate(nextSend.getDate() + 7);
      }
    }
    
    return nextSend;
  }

  // Generate unsubscribe token
  private generateUnsubscribeToken(userId: string): string {
    // In production, use a proper JWT or encrypted token
    return Buffer.from(`${userId}:${Date.now()}`).toString('base64');
  }
}

// Export singleton instance
export const emailService = new CommunityEmailService();