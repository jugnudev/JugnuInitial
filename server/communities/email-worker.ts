import { CronJob } from 'cron';
import { communitiesStorage } from './communities-supabase';
import { emailService } from './email-service';
import sgMail from '@sendgrid/mail';

// Email worker class to process queued emails
class EmailQueueWorker {
  private job: CronJob | null = null;
  private isProcessing: boolean = false;
  private retryBackoff: Map<string, number> = new Map();

  constructor() {
    // Initialize SendGrid if not already done
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  // Start the email queue processor
  start() {
    if (this.job) {
      console.log('[Email Worker] Already running');
      return;
    }

    // Run every minute
    this.job = new CronJob(
      '* * * * *', // Every minute
      async () => {
        if (this.isProcessing) {
          console.log('[Email Worker] Still processing previous batch, skipping...');
          return;
        }
        await this.processQueue();
      },
      null,
      true,
      'America/Vancouver'
    );

    console.log('[Email Worker] Started - processing emails every minute');
    
    // Process immediately on start
    this.processQueue();
  }

  // Stop the email queue processor
  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('[Email Worker] Stopped');
    }
  }

  // Process pending emails in the queue
  async processQueue() {
    if (!process.env.SENDGRID_API_KEY) {
      console.log('[Email Worker] SendGrid not configured, skipping...');
      return;
    }

    this.isProcessing = true;
    
    try {
      console.log('[Email Worker] Processing email queue...');
      
      // Get pending emails (batch of 10)
      const pendingEmails = await communitiesStorage.getPendingEmails(10);
      
      if (pendingEmails.length === 0) {
        console.log('[Email Worker] No pending emails to process');
        return;
      }

      console.log(`[Email Worker] Processing ${pendingEmails.length} pending emails`);
      
      // Group emails by recipient for batching
      const emailsByRecipient = new Map<string, typeof pendingEmails>();
      for (const email of pendingEmails) {
        const key = email.recipientEmail;
        if (!emailsByRecipient.has(key)) {
          emailsByRecipient.set(key, []);
        }
        emailsByRecipient.get(key)!.push(email);
      }

      // Process each recipient's emails
      for (const [recipientEmail, emails] of emailsByRecipient) {
        try {
          // Check if recipient has multiple emails within the same timeframe
          if (emails.length > 1 && this.shouldBatchEmails(emails)) {
            await this.sendBatchedEmail(emails);
          } else {
            // Send individual emails
            for (const email of emails) {
              await this.sendIndividualEmail(email);
            }
          }
        } catch (error) {
          console.error(`[Email Worker] Failed to process emails for ${recipientEmail}:`, error);
        }
      }

      // Clean up old notifications periodically (once per day at midnight)
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        await this.cleanupOldNotifications();
      }
      
    } catch (error) {
      console.error('[Email Worker] Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Check if emails should be batched
  private shouldBatchEmails(emails: any[]): boolean {
    if (emails.length < 2) return false;
    
    // Check if all emails are within 5 minutes of each other
    const timestamps = emails.map(e => new Date(e.createdAt).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    
    // If all emails are within 5 minutes, batch them
    return (maxTime - minTime) <= 5 * 60 * 1000;
  }

  // Send a batched email with multiple notifications
  private async sendBatchedEmail(emails: any[]) {
    const firstEmail = emails[0];
    const baseUrl = process.env.BASE_URL || 'https://thehouseofjugnu.com';
    
    try {
      // Build batched email content
      const notifications = emails.map(e => ({
        title: e.subject,
        body: e.variables?.notification?.body || '',
        actionUrl: e.variables?.notification?.actionUrl || '#'
      }));

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
            .notification { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>You have ${emails.length} new notifications</h1>
              <p style="margin: 0; opacity: 0.9;">${new Date().toLocaleDateString()}</p>
            </div>
            <div class="content">
              ${notifications.map(n => `
                <div class="notification">
                  <strong>${n.title}</strong>
                  ${n.body ? `<p>${n.body}</p>` : ''}
                  <a href="${n.actionUrl}">View →</a>
                </div>
              `).join('')}
              
              <a href="${baseUrl}/notifications" class="button">View All Notifications</a>
              
              <div class="footer">
                <p>You're receiving this because you have notifications enabled.</p>
                <p><a href="${baseUrl}/account/unsubscribe">Unsubscribe</a> | <a href="${baseUrl}/account/profile#notifications">Update preferences</a></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const msg = {
        to: firstEmail.recipientEmail,
        from: process.env.SENDGRID_FROM_EMAIL || 'relations@jugnucanada.com',
        subject: `${emails.length} new notifications`,
        html
      };

      await sgMail.send(msg);
      
      // Mark all emails as sent
      for (const email of emails) {
        await communitiesStorage.markEmailSent(email.id);
      }
      
      console.log(`[Email Worker] Sent batch email with ${emails.length} notifications to ${firstEmail.recipientEmail}`);
    } catch (error) {
      console.error(`[Email Worker] Failed to send batch email to ${firstEmail.recipientEmail}:`, error);
      
      // Mark all as failed
      for (const email of emails) {
        const retryCount = (email.retryCount || 0) + 1;
        await communitiesStorage.markEmailFailed(email.id, String(error), retryCount);
      }
    }
  }

  // Send an individual email
  private async sendIndividualEmail(email: any) {
    try {
      // Get retry count
      const retryKey = email.id;
      const currentRetries = this.retryBackoff.get(retryKey) || 0;
      
      // Check if we should skip due to backoff
      if (currentRetries > 0) {
        const backoffTime = Math.pow(2, currentRetries) * 60 * 1000; // Exponential backoff in minutes
        const lastRetry = email.failedAt ? new Date(email.failedAt).getTime() : 0;
        
        if (Date.now() - lastRetry < backoffTime) {
          console.log(`[Email Worker] Skipping ${email.id} due to backoff (retry ${currentRetries})`);
          return;
        }
      }

      // Build email from template
      const template = email.templateId;
      const variables = email.variables || {};
      
      // Get appropriate content based on template
      let html = '';
      const baseUrl = process.env.BASE_URL || 'https://thehouseofjugnu.com';
      
      if (template === 'daily_digest' && variables.notifications) {
        // Daily digest email
        html = this.buildDigestEmail(variables);
      } else if (variables.notification) {
        // Single notification email
        html = this.buildNotificationEmail(variables.notification, variables.recipient, variables.community);
      } else {
        // Generic template
        html = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="content">
                <h2>${email.subject}</h2>
                <p>You have a new notification.</p>
                <p><a href="${baseUrl}/notifications">View Notifications</a></p>
              </div>
            </div>
          </body>
          </html>
        `;
      }

      const msg = {
        to: email.recipientEmail,
        from: process.env.SENDGRID_FROM_EMAIL || 'relations@jugnucanada.com',
        subject: email.subject,
        html
      };

      await sgMail.send(msg);
      
      // Mark as sent
      await communitiesStorage.markEmailSent(email.id);
      
      // Clear retry backoff on success
      this.retryBackoff.delete(retryKey);
      
      console.log(`[Email Worker] Sent email ${email.id} to ${email.recipientEmail}`);
    } catch (error: any) {
      console.error(`[Email Worker] Failed to send email ${email.id}:`, error);
      
      // Increment retry count
      const retryCount = (email.retryCount || 0) + 1;
      this.retryBackoff.set(email.id, retryCount);
      
      // Mark as failed with retry count
      await communitiesStorage.markEmailFailed(
        email.id, 
        error.message || String(error),
        retryCount
      );
      
      // Clear backoff after max retries
      if (retryCount >= 3) {
        this.retryBackoff.delete(email.id);
      }
    }
  }

  // Build notification email HTML
  private buildNotificationEmail(notification: any, recipient: any, community: any): string {
    const baseUrl = process.env.BASE_URL || 'https://thehouseofjugnu.com';
    
    return `
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${community?.name || 'Community'}</h1>
          </div>
          <div class="content">
            <h2>${notification.title}</h2>
            <p>${notification.body}</p>
            ${notification.actionUrl ? `<a href="${notification.actionUrl}" class="button">View Details</a>` : ''}
            <div class="footer">
              <p><a href="${baseUrl}/account/unsubscribe">Unsubscribe</a> | <a href="${baseUrl}/account/profile#notifications">Update preferences</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Build digest email HTML
  private buildDigestEmail(variables: any): string {
    const baseUrl = process.env.BASE_URL || 'https://thehouseofjugnu.com';
    const notifications = variables.notifications || [];
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
          .notification { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Daily Digest</h1>
            <p style="margin: 0; opacity: 0.9;">${new Date().toLocaleDateString()}</p>
          </div>
          <div class="content">
            <p>Here's what you missed:</p>
            ${notifications.map((n: any) => `
              <div class="notification">
                <strong>${n.title}</strong>
                ${n.body ? `<p>${n.body}</p>` : ''}
                ${n.actionUrl ? `<a href="${n.actionUrl}">View →</a>` : ''}
              </div>
            `).join('')}
            
            <a href="${baseUrl}/notifications" class="button">View All Notifications</a>
            
            <div class="footer">
              <p>You're receiving this daily digest based on your preferences.</p>
              <p><a href="${baseUrl}/account/unsubscribe">Unsubscribe</a> | <a href="${baseUrl}/account/profile#notifications">Update preferences</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Clean up old notifications
  private async cleanupOldNotifications() {
    try {
      const deletedCount = await communitiesStorage.cleanupOldNotifications();
      console.log(`[Email Worker] Cleaned up ${deletedCount} old notifications`);
    } catch (error) {
      console.error('[Email Worker] Failed to cleanup old notifications:', error);
    }
  }

  // Process daily digests
  async processDailyDigests() {
    try {
      console.log('[Email Worker] Processing daily digests...');
      
      // Get users with daily digest preference
      const users = await communitiesStorage.getUsersWithDigestPreference('daily');
      
      for (const user of users) {
        const preferences = await communitiesStorage.getNotificationPreferences(user.id);
        if (!preferences || !preferences.emailEnabled) continue;
        
        // Check if it's time to send the digest
        const [hour, minute] = (preferences.emailDigestTime || '09:00').split(':').map(Number);
        const now = new Date();
        
        if (now.getHours() !== hour || now.getMinutes() !== minute) continue;
        
        // Get unread notifications for the user
        const { notifications } = await communitiesStorage.getNotifications(user.id, {
          unreadOnly: true,
          limit: 50
        });
        
        if (notifications.length === 0) continue;
        
        // Queue digest email
        await communitiesStorage.queueEmail({
          recipientEmail: user.email,
          recipientName: `${user.firstName} ${user.lastName}`.trim(),
          templateId: 'daily_digest',
          subject: `Your daily digest - ${notifications.length} notifications`,
          variables: {
            notifications,
            recipient: user,
            date: new Date().toLocaleDateString()
          }
        });
        
        console.log(`[Email Worker] Queued daily digest for ${user.email} with ${notifications.length} notifications`);
      }
    } catch (error) {
      console.error('[Email Worker] Failed to process daily digests:', error);
    }
  }

  // Process weekly digests
  async processWeeklyDigests() {
    try {
      console.log('[Email Worker] Processing weekly digests...');
      
      // Only run on Mondays
      const now = new Date();
      if (now.getDay() !== 1) return; // 1 = Monday
      
      // Get users with weekly digest preference
      const users = await communitiesStorage.getUsersWithDigestPreference('weekly');
      
      for (const user of users) {
        const preferences = await communitiesStorage.getNotificationPreferences(user.id);
        if (!preferences || !preferences.emailEnabled) continue;
        
        // Check if it's time to send the digest
        const [hour, minute] = (preferences.emailDigestTime || '09:00').split(':').map(Number);
        
        if (now.getHours() !== hour || now.getMinutes() !== minute) continue;
        
        // Get unread notifications for the user
        const { notifications } = await communitiesStorage.getNotifications(user.id, {
          unreadOnly: true,
          limit: 100
        });
        
        if (notifications.length === 0) continue;
        
        // Queue digest email
        await communitiesStorage.queueEmail({
          recipientEmail: user.email,
          recipientName: `${user.firstName} ${user.lastName}`.trim(),
          templateId: 'weekly_digest',
          subject: `Your weekly digest - ${notifications.length} notifications`,
          variables: {
            notifications,
            recipient: user,
            date: new Date().toLocaleDateString()
          }
        });
        
        console.log(`[Email Worker] Queued weekly digest for ${user.email} with ${notifications.length} notifications`);
      }
    } catch (error) {
      console.error('[Email Worker] Failed to process weekly digests:', error);
    }
  }
}

// Export singleton instance
export const emailWorker = new EmailQueueWorker();