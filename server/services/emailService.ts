import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://thehouseofjugnu.com';
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'relations@thehouseofjugnu.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Jugnu';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface OnboardingEmailData {
  recipientEmail: string;
  contactName: string;
  businessName: string;
  onboardingLink: string;
  expiresInDays: number;
}

export async function sendOnboardingEmail(data: OnboardingEmailData): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.error('SendGrid API key not configured, skipping email send');
    throw new Error('Email service not configured');
  }

  const msg = {
    to: data.recipientEmail,
    from: {
      email: EMAIL_FROM_ADDRESS,
      name: EMAIL_FROM_NAME
    },
    subject: "You're approved — create your Jugnu campaign",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              padding: 30px 0;
              border-bottom: 2px solid #f0f0f0;
            }
            .content {
              padding: 30px 0;
            }
            .button {
              display: inline-block;
              background-color: #7c3aed;
              color: white !important;
              padding: 14px 32px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #6d28d9;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #f0f0f0;
              font-size: 14px;
              color: #666;
              text-align: center;
            }
            .highlight {
              background-color: #fef3c7;
              padding: 2px 4px;
              border-radius: 3px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="color: #7c3aed; margin: 0;">Welcome to Jugnu!</h1>
          </div>
          
          <div class="content">
            <p>Hi ${data.contactName},</p>
            
            <p>Great news! Your sponsorship application for <strong>${data.businessName}</strong> has been approved.</p>
            
            <p>You can now complete your campaign setup by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${data.onboardingLink}" class="button">Create Your Campaign</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              <strong>Important:</strong> This link expires in <span class="highlight">${data.expiresInDays} days</span>. 
              Please complete your campaign setup before then.
            </p>
            
            <p>During setup, you'll be able to:</p>
            <ul>
              <li>Set your campaign title and messaging</li>
              <li>Upload or update your creative assets</li>
              <li>Configure your call-to-action and landing page</li>
              <li>Review your campaign dates and placements</li>
            </ul>
            
            <p>Once you complete the setup, we'll provide you with a private analytics portal to track your campaign performance in real-time.</p>
          </div>
          
          <div class="footer">
            <p>Need help? Reply to this email or contact us at <a href="mailto:${EMAIL_FROM_ADDRESS}">${EMAIL_FROM_ADDRESS}</a></p>
            <p style="color: #999; font-size: 12px;">
              ${APP_BASE_URL}<br>
              Vancouver's Cultural Events Platform
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
Hi ${data.contactName},

Great news! Your sponsorship application for ${data.businessName} has been approved.

You can now complete your campaign setup by visiting:
${data.onboardingLink}

Important: This link expires in ${data.expiresInDays} days. Please complete your campaign setup before then.

During setup, you'll be able to:
- Set your campaign title and messaging
- Upload or update your creative assets
- Configure your call-to-action and landing page
- Review your campaign dates and placements

Once you complete the setup, we'll provide you with a private analytics portal to track your campaign performance in real-time.

Need help? Reply to this email or contact us at ${EMAIL_FROM_ADDRESS}

---
Jugnu - Vancouver's Cultural Events Platform
${APP_BASE_URL}
    `.trim()
  };

  try {
    await sgMail.send(msg);
    console.log(`Onboarding email sent to ${data.recipientEmail}`);
  } catch (error) {
    console.error('Error sending onboarding email:', error);
    throw error;
  }
}