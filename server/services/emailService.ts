import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://jugnucanada.com';
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || process.env.SENDGRID_FROM_EMAIL || 'relations@jugnucanada.com';
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

export interface AnalyticsEmailData {
  recipientEmail: string;
  date: string;
  // Today's data
  todayVisitors: number;
  todayPageviews: number;
  todayNewVisitors: number;
  todayReturningVisitors: number;
  todayDeviceBreakdown: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  todayTopPages: Array<{ path: string; views: number }>;
  // Yesterday's data for comparison
  yesterdayVisitors: number;
  yesterdayPageviews: number;
  // Weekly average
  weeklyAvgVisitors: number;
  weeklyAvgPageviews: number;
  // Monthly totals (30-day summary)
  totalVisitors: number;
  totalPageviews: number;
  avgVisitorsPerDay: number;
  avgPageviewsPerDay: number;
  topPages: Array<{ path: string; views: number }>;
  deviceBreakdown: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  newVisitors: number;
  returningVisitors: number;
}

export interface VerificationEmailData {
  recipientEmail: string;
  verificationCode: string;
  purpose: 'signup' | 'signin';
  userName?: string;
}

export interface TicketEmailData {
  recipientEmail: string;
  buyerName: string;
  eventTitle: string;
  eventVenue?: string;
  eventDate: string;
  eventTime: string;
  orderNumber: string;
  tickets: Array<{
    id: string;
    tierName: string;
    qrToken: string;
    serial: string;
    seat?: string;
  }>;
  totalAmount: string;
  refundPolicy?: string;
}

export interface WelcomeEmailData {
  recipientEmail: string;
  userName: string;
  accountType: 'user' | 'business';
  businessName?: string;
}

export async function sendVerificationEmail(data: VerificationEmailData): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.log(`📧 [DEV] Would send ${data.purpose} email to ${data.recipientEmail} with code: ${data.verificationCode}`);
    return;
  }

  const isSignup = data.purpose === 'signup';
  const subject = isSignup ? 'Welcome to Jugnu - Verify your email' : 'Sign in to Jugnu - Verification code';
  const greeting = data.userName ? `Hi ${data.userName}` : 'Hello';
  
  const msg = {
    to: data.recipientEmail,
    from: {
      email: EMAIL_FROM_ADDRESS,
      name: EMAIL_FROM_NAME
    },
    subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              line-height: 1.7;
              color: #0a0a0a;
              background: #0a0a0a;
              padding: 60px 20px;
            }
            .email-container {
              max-width: 580px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 24px;
              overflow: hidden;
              box-shadow: 0 40px 120px rgba(0, 0, 0, 0.6), 0 20px 60px rgba(0, 0, 0, 0.4);
            }
            .header {
              background: linear-gradient(160deg, #0f0f0f 0%, #1a1a2e 50%, #0f0f23 100%);
              padding: 72px 48px;
              text-align: center;
              position: relative;
              overflow: hidden;
            }
            .header::before {
              content: '';
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 300px;
              height: 300px;
              background: radial-gradient(circle, rgba(234, 88, 12, 0.15) 0%, transparent 70%);
              filter: blur(40px);
            }
            .header::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 1px;
              background: linear-gradient(90deg, transparent, rgba(234, 88, 12, 0.6), transparent);
            }
            .logo {
              max-width: 120px;
              height: auto;
              margin: 0 auto 32px;
              display: block;
              filter: brightness(0) invert(1) drop-shadow(0 8px 16px rgba(0,0,0,0.5));
              position: relative;
              z-index: 1;
            }
            .header-title {
              color: #ffffff;
              font-size: 15px;
              margin: 0;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 3px;
              position: relative;
              z-index: 1;
              opacity: 0.9;
            }
            .content {
              padding: 56px 48px;
              background: #ffffff;
            }
            .greeting {
              font-size: 32px;
              color: #0a0a0a;
              margin-bottom: 16px;
              font-weight: 700;
              letter-spacing: -0.5px;
            }
            .message {
              font-size: 17px;
              color: #525252;
              margin-bottom: 48px;
              line-height: 1.8;
            }
            .message strong {
              color: #171717;
              font-weight: 600;
            }
            .code-box {
              background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
              border: 2px solid #e5e5e5;
              padding: 48px 40px;
              border-radius: 20px;
              text-align: center;
              margin: 48px 0;
              box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
              position: relative;
            }
            .code-box::before {
              content: '';
              position: absolute;
              inset: -2px;
              background: linear-gradient(135deg, #ea580c 0%, #f59e0b 100%);
              border-radius: 20px;
              z-index: -1;
              opacity: 0.1;
            }
            .code-label {
              font-size: 12px;
              color: #737373;
              text-transform: uppercase;
              letter-spacing: 2.5px;
              font-weight: 700;
              margin-bottom: 24px;
            }
            .verification-code {
              font-size: 56px;
              font-weight: 700;
              color: #ea580c;
              letter-spacing: 16px;
              font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
              padding: 12px 0;
            }
            .code-hint {
              font-size: 14px;
              color: #a3a3a3;
              margin-top: 24px;
              font-weight: 500;
            }
            .security-note {
              background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
              border-left: 3px solid #a3a3a3;
              padding: 20px 24px;
              border-radius: 12px;
              margin: 48px 0 0 0;
            }
            .security-note p {
              font-size: 14px;
              color: #525252;
              margin: 0;
              line-height: 1.7;
            }
            .footer {
              background: #fafafa;
              padding: 40px 48px;
              text-align: center;
            }
            .footer-text {
              font-size: 13px;
              color: #a3a3a3;
              margin-bottom: 32px;
            }
            .footer-link {
              color: #ea580c;
              text-decoration: none;
              font-weight: 600;
              transition: color 0.2s;
            }
            .brand {
              padding-top: 32px;
              border-top: 1px solid #e5e5e5;
            }
            .brand-name {
              font-size: 20px;
              font-weight: 700;
              color: #0a0a0a;
              margin-bottom: 6px;
              letter-spacing: -0.5px;
            }
            .brand-tagline {
              font-size: 13px;
              color: #a3a3a3;
              font-weight: 500;
              letter-spacing: 0.5px;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <img src="https://rayagonwzwwguvybudir.supabase.co/storage/v1/object/public/email-assets/jugnu-logo.png" alt="Jugnu" class="logo" />
              <p class="header-title">Verification Required</p>
            </div>
            
            <div class="content">
              <h1 class="greeting">${greeting}</h1>
              
              <p class="message">
                ${isSignup ? 
                  'Welcome to <strong>Jugnu</strong> — Canada\'s South Asian cultural hub. To complete your account setup and explore vibrant cultural experiences, verify your email using the code below.' :
                  'To securely access your <strong>Jugnu</strong> account, please verify your identity using the code below.'
                }
              </p>
              
              <div class="code-box">
                <div class="code-label">Verification Code</div>
                <div class="verification-code">${data.verificationCode}</div>
                <div class="code-hint">Expires in 10 minutes</div>
              </div>
              
              <div class="security-note">
                <p>If you didn't request this email, you can safely ignore it. This code will expire automatically.</p>
              </div>
            </div>
            
            <div class="footer">
              <p class="footer-text">
                Need help? Contact <a href="mailto:${EMAIL_FROM_ADDRESS}" class="footer-link">${EMAIL_FROM_ADDRESS}</a>
              </p>
              <div class="brand">
                <div class="brand-name">Jugnu</div>
                <div class="brand-tagline">Canada's South Asian Cultural Hub</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
${greeting},

${isSignup ? 
  'Welcome to Jugnu — Canada\'s South Asian cultural hub! To complete your account setup, please verify your email address with the code below:' :
  'To sign in to your Jugnu account, please use the verification code below:'
}

Your verification code: ${data.verificationCode}

Enter this code in the verification form. This code expires in 10 minutes.

Security note: If you didn't request this email, please ignore it.

Need help? Contact us at ${EMAIL_FROM_ADDRESS}

---
Jugnu
Canada's South Asian Cultural Hub
    `.trim()
  };

  try {
    await sgMail.send(msg);
    console.log(`Verification email sent to ${data.recipientEmail} (${data.purpose})`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.log(`📧 [DEV] Would send welcome email to ${data.recipientEmail}`);
    return;
  }

  const isBusinessAccount = data.accountType === 'business';
  const greeting = `Hi ${data.userName}`;
  const subject = isBusinessAccount ? 
    `Welcome to Jugnu, ${data.businessName || data.userName}! 🎉` : 
    `Welcome to Jugnu, ${data.userName}! 🎉`;
  
  const msg = {
    to: data.recipientEmail,
    from: {
      email: EMAIL_FROM_ADDRESS,
      name: EMAIL_FROM_NAME
    },
    subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              line-height: 1.7;
              color: #0a0a0a;
              background: #0a0a0a;
              padding: 60px 20px;
            }
            .email-container {
              max-width: 580px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 24px;
              overflow: hidden;
              box-shadow: 0 40px 120px rgba(0, 0, 0, 0.6), 0 20px 60px rgba(0, 0, 0, 0.4);
            }
            .header {
              background: linear-gradient(160deg, #0f0f0f 0%, #1a1a2e 50%, #0f0f23 100%);
              padding: 72px 48px;
              text-align: center;
              position: relative;
              overflow: hidden;
            }
            .header::before {
              content: '';
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 300px;
              height: 300px;
              background: radial-gradient(circle, rgba(234, 88, 12, 0.15) 0%, transparent 70%);
              filter: blur(40px);
            }
            .header::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 1px;
              background: linear-gradient(90deg, transparent, rgba(234, 88, 12, 0.6), transparent);
            }
            .logo {
              max-width: 120px;
              height: auto;
              margin: 0 auto 32px;
              display: block;
              filter: brightness(0) invert(1) drop-shadow(0 8px 16px rgba(0,0,0,0.5));
              position: relative;
              z-index: 1;
            }
            .header-title {
              color: #ffffff;
              font-size: 15px;
              margin: 0;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 3px;
              position: relative;
              z-index: 1;
              opacity: 0.9;
            }
            .content {
              padding: 56px 48px;
              background: #ffffff;
            }
            .greeting {
              font-size: 32px;
              color: #0a0a0a;
              margin-bottom: 16px;
              font-weight: 700;
              letter-spacing: -0.5px;
            }
            .intro {
              font-size: 17px;
              color: #525252;
              margin-bottom: 48px;
              line-height: 1.8;
            }
            .intro strong {
              color: #171717;
              font-weight: 600;
            }
            .features {
              margin: 48px 0;
            }
            .feature {
              padding: 24px 28px;
              margin-bottom: 16px;
              background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
              border-left: 3px solid #ea580c;
              border-radius: 12px;
            }
            .feature-icon {
              font-size: 28px;
              margin-bottom: 12px;
              display: block;
            }
            .feature-content h3 {
              font-size: 17px;
              font-weight: 700;
              color: #0a0a0a;
              margin-bottom: 6px;
              letter-spacing: -0.3px;
            }
            .feature-content p {
              font-size: 14px;
              color: #737373;
              line-height: 1.7;
            }
            .cta {
              text-align: center;
              margin: 48px 0 0;
            }
            .cta-button {
              display: inline-block;
              background: #ea580c;
              color: #ffffff !important;
              padding: 18px 48px;
              text-decoration: none;
              border-radius: 12px;
              font-weight: 700;
              font-size: 16px;
              letter-spacing: 0.3px;
              box-shadow: 0 8px 24px rgba(234, 88, 12, 0.25);
            }
            .footer {
              background: #fafafa;
              padding: 40px 48px;
              text-align: center;
            }
            .footer-text {
              font-size: 13px;
              color: #a3a3a3;
              margin-bottom: 32px;
            }
            .footer-link {
              color: #ea580c;
              text-decoration: none;
              font-weight: 600;
            }
            .brand {
              padding-top: 32px;
              border-top: 1px solid #e5e5e5;
            }
            .brand-name {
              font-size: 20px;
              font-weight: 700;
              color: #0a0a0a;
              margin-bottom: 6px;
              letter-spacing: -0.5px;
            }
            .brand-tagline {
              font-size: 13px;
              color: #a3a3a3;
              font-weight: 500;
              letter-spacing: 0.5px;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <img src="https://rayagonwzwwguvybudir.supabase.co/storage/v1/object/public/email-assets/jugnu-logo.png" alt="Jugnu" class="logo" />
              <p class="header-title">${isBusinessAccount ? 'Business Account Active' : 'Account Created'}</p>
            </div>
            
            <div class="content">
              <h1 class="greeting">${greeting}</h1>
              
              <p class="intro">
                ${isBusinessAccount ? 
                  `Welcome to Jugnu — Canada's South Asian cultural hub. <strong>${data.businessName || 'Your business'}</strong> is now ready to reach thousands of engaged community members and grow your audience.` :
                  `Welcome to Jugnu — Canada's South Asian cultural hub. You're all set to discover vibrant events, connect with your community, and explore experiences that matter.`
                }
              </p>
              
              <div class="features">
                ${isBusinessAccount ? `
                  <div class="feature">
                    <span class="feature-icon">📢</span>
                    <div class="feature-content">
                      <h3>Event Promotion</h3>
                      <p>Reach engaged community members across Canada with powerful promotion tools.</p>
                    </div>
                  </div>
                  <div class="feature">
                    <span class="feature-icon">📊</span>
                    <div class="feature-content">
                      <h3>Analytics</h3>
                      <p>Track performance and make data-driven decisions to maximize impact.</p>
                    </div>
                  </div>
                  <div class="feature">
                    <span class="feature-icon">💬</span>
                    <div class="feature-content">
                      <h3>Communities</h3>
                      <p>Build your own community space and engage directly with your audience.</p>
                    </div>
                  </div>
                  <div class="feature">
                    <span class="feature-icon">🎯</span>
                    <div class="feature-content">
                      <h3>Sponsorships</h3>
                      <p>Partner with us for strategic sponsorships and advertising campaigns.</p>
                    </div>
                  </div>
                ` : `
                  <div class="feature">
                    <span class="feature-icon">🎭</span>
                    <div class="feature-content">
                      <h3>Event Discovery</h3>
                      <p>Explore concerts, festivals, and cultural celebrations across Canada.</p>
                    </div>
                  </div>
                  <div class="feature">
                    <span class="feature-icon">💬</span>
                    <div class="feature-content">
                      <h3>Communities</h3>
                      <p>Connect with like-minded people and join exclusive groups.</p>
                    </div>
                  </div>
                  <div class="feature">
                    <span class="feature-icon">🎨</span>
                    <div class="feature-content">
                      <h3>Local Artists</h3>
                      <p>Discover and support talented South Asian artists and performers.</p>
                    </div>
                  </div>
                  <div class="feature">
                    <span class="feature-icon">🔔</span>
                    <div class="feature-content">
                      <h3>Notifications</h3>
                      <p>Stay updated on upcoming events you care about.</p>
                    </div>
                  </div>
                `}
              </div>
              
              <div class="cta">
                <a href="${APP_BASE_URL}" class="cta-button">
                  ${isBusinessAccount ? 'Access Dashboard' : 'Explore Events'}
                </a>
              </div>
            </div>
            
            <div class="footer">
              <p class="footer-text">
                Questions? Contact <a href="mailto:${EMAIL_FROM_ADDRESS}" class="footer-link">${EMAIL_FROM_ADDRESS}</a>
              </p>
              <div class="brand">
                <div class="brand-name">Jugnu</div>
                <div class="brand-tagline">Canada's South Asian Cultural Hub</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
${greeting},

${isBusinessAccount ? 
  `We're thrilled to have ${data.businessName || 'your business'} join Canada's premier South Asian cultural events platform! Your account is now active and ready to help you grow your audience and connect with thousands of engaged community members across Canada.` :
  `We're excited to welcome you to Canada's premier South Asian cultural events platform! Your account is now active and you're ready to discover amazing events, connect with your community, and never miss out on the experiences that matter to you.`
}

${isBusinessAccount ? `
What you can do with Jugnu:

📢 Promote Your Events
Reach thousands of engaged community members across Canada and grow your audience.

📊 Analytics & Insights
Track your event performance and make data-driven decisions.

💬 Community Building
Create your own community space and build lasting relationships.

🎯 Sponsorship Opportunities
Partner with us to reach your target audience through strategic sponsorships.

Get started: ${APP_BASE_URL}
` : `
What you can do with Jugnu:

🎭 Discover Events
Explore concerts, festivals, and cultural celebrations across Canada.

💬 Join Communities
Connect with like-minded people and stay updated.

🎨 Support Local Artists
Discover and support talented South Asian artists and performers.

🔔 Never Miss Out
Get personalized notifications about upcoming events.

Start exploring: ${APP_BASE_URL}
`}

Questions? We're here to help at ${EMAIL_FROM_ADDRESS}

---
Jugnu
Canada's South Asian Cultural Hub
    `.trim()
  };

  try {
    await sgMail.send(msg);
    console.log(`Welcome email sent to ${data.recipientEmail} (${data.accountType})`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw new Error('Failed to send welcome email');
  }
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
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #1f2937;
              background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%);
              padding: 40px 20px;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }
            .header {
              background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%);
              padding: 56px 40px;
              text-align: center;
              position: relative;
            }
            .header::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 4px;
              background: linear-gradient(90deg, #fbbf24, #f59e0b, #ea580c);
            }
            .logo {
              max-width: 180px;
              height: auto;
              margin: 0 auto 24px;
              display: block;
              filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
            }
            .header p {
              color: rgba(255, 255, 255, 0.9);
              font-size: 18px;
              margin-top: 12px;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .content {
              padding: 48px 40px;
              background: #ffffff;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
              color: #ffffff !important;
              padding: 16px 40px;
              text-decoration: none;
              border-radius: 12px;
              font-weight: 700;
              font-size: 16px;
              box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
              margin: 20px 0;
            }
            .highlight {
              background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
              padding: 4px 12px;
              border-radius: 6px;
              font-weight: 700;
              color: #92400e;
            }
            .footer {
              background: linear-gradient(to bottom, #f9fafb, #f3f4f6);
              padding: 32px 40px;
              text-align: center;
              border-top: 1px solid #e5e7eb;
            }
            .footer-link {
              color: #f97316;
              text-decoration: none;
              font-weight: 600;
            }
            .brand {
              margin-top: 24px;
              padding-top: 24px;
              border-top: 1px solid #d1d5db;
            }
            .brand-name {
              font-size: 18px;
              font-weight: 700;
              color: #111827;
              margin-bottom: 4px;
            }
            .brand-tagline {
              font-size: 14px;
              color: #6b7280;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <img src="https://rayagonwzwwguvybudir.supabase.co/storage/v1/object/public/email-assets/jugnu-logo.png" alt="Jugnu" class="logo" />
              <p>You're Approved!</p>
            </div>
          
          <div class="content">
            <p>Hi ${data.contactName},</p>
            
            <p>Great news! Your sponsorship application for <strong>${data.businessName}</strong> has been approved.</p>
            
            <p>You can now complete your campaign setup by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${data.onboardingLink}" class="button" style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff !important; text-decoration: none; display: inline-block; padding: 16px 40px; border-radius: 12px; font-weight: 700; font-size: 16px;">Complete Campaign Setup</a>
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
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 12px;">
              Need help? Contact us at <a href="mailto:${EMAIL_FROM_ADDRESS}" class="footer-link">${EMAIL_FROM_ADDRESS}</a>
            </p>
            <div class="brand">
              <div class="brand-name">Jugnu</div>
              <div class="brand-tagline">Canada's South Asian Cultural Hub</div>
            </div>
          </div>
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
Jugnu
Canada's South Asian Cultural Hub
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

export async function sendDailyAnalyticsEmail(data: AnalyticsEmailData): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.error('SendGrid API key not configured, skipping analytics email');
    return;
  }

  // Calculate comparisons for today's data
  const visitorChange = data.yesterdayVisitors > 0 
    ? Math.round(((data.todayVisitors - data.yesterdayVisitors) / data.yesterdayVisitors) * 100)
    : 0;
  const pageviewChange = data.yesterdayPageviews > 0
    ? Math.round(((data.todayPageviews - data.yesterdayPageviews) / data.yesterdayPageviews) * 100)
    : 0;
  
  const visitorChangeSymbol = visitorChange > 0 ? '↑' : visitorChange < 0 ? '↓' : '→';
  const pageviewChangeSymbol = pageviewChange > 0 ? '↑' : pageviewChange < 0 ? '↓' : '→';
  const visitorChangeColor = visitorChange > 0 ? '#10b981' : visitorChange < 0 ? '#ef4444' : '#6b7280';
  const pageviewChangeColor = pageviewChange > 0 ? '#10b981' : pageviewChange < 0 ? '#ef4444' : '#6b7280';

  // Device breakdown for today
  const todayTotalDevices = data.todayDeviceBreakdown.mobile + data.todayDeviceBreakdown.desktop + data.todayDeviceBreakdown.tablet;
  const todayMobilePercent = todayTotalDevices > 0 ? Math.round((data.todayDeviceBreakdown.mobile / todayTotalDevices) * 100) : 0;
  const todayDesktopPercent = todayTotalDevices > 0 ? Math.round((data.todayDeviceBreakdown.desktop / todayTotalDevices) * 100) : 0;
  const todayTabletPercent = todayTotalDevices > 0 ? Math.round((data.todayDeviceBreakdown.tablet / todayTotalDevices) * 100) : 0;

  // Device breakdown for month
  const totalDevices = data.deviceBreakdown.mobile + data.deviceBreakdown.desktop + data.deviceBreakdown.tablet;
  const mobilePercent = totalDevices > 0 ? Math.round((data.deviceBreakdown.mobile / totalDevices) * 100) : 0;
  const desktopPercent = totalDevices > 0 ? Math.round((data.deviceBreakdown.desktop / totalDevices) * 100) : 0;
  const tabletPercent = totalDevices > 0 ? Math.round((data.deviceBreakdown.tablet / totalDevices) * 100) : 0;

  const msg = {
    to: data.recipientEmail,
    from: {
      email: EMAIL_FROM_ADDRESS,
      name: EMAIL_FROM_NAME
    },
    subject: `Analytics Report: ${data.todayVisitors} visitors today - ${data.date}`,
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
              background-color: #f5f5f5;
            }
            .container {
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .header p {
              margin: 5px 0 0;
              opacity: 0.9;
              font-size: 14px;
            }
            .content {
              padding: 30px;
            }
            .today-section {
              background: #fef3c7;
              border: 2px solid #f59e0b;
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 30px;
            }
            .today-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 20px;
            }
            .today-title {
              font-size: 20px;
              font-weight: 700;
              color: #92400e;
            }
            .today-date {
              font-size: 14px;
              color: #92400e;
              opacity: 0.8;
            }
            .metric-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              margin: 25px 0;
            }
            .metric-card {
              background: #fafafa;
              border: 1px solid #e5e5e5;
              border-radius: 8px;
              padding: 15px;
              text-align: center;
            }
            .today-metric-card {
              background: white;
              border: 1px solid #fbbf24;
            }
            .metric-label {
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 5px;
            }
            .metric-value {
              font-size: 24px;
              font-weight: 600;
              color: #f97316;
            }
            .metric-change {
              font-size: 14px;
              font-weight: 500;
              margin-top: 5px;
            }
            .metric-comparison {
              font-size: 11px;
              color: #666;
              margin-top: 3px;
            }
            .section {
              margin: 30px 0;
            }
            .section-title {
              font-size: 18px;
              font-weight: 600;
              color: #333;
              margin-bottom: 15px;
              border-bottom: 2px solid #f97316;
              padding-bottom: 5px;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
            }
            .data-table th {
              background: #fafafa;
              padding: 10px;
              text-align: left;
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-bottom: 1px solid #e5e5e5;
            }
            .data-table td {
              padding: 10px;
              border-bottom: 1px solid #f0f0f0;
            }
            .device-bar {
              display: flex;
              height: 30px;
              border-radius: 6px;
              overflow: hidden;
              margin: 15px 0;
            }
            .device-segment {
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 12px;
              font-weight: 600;
            }
            .footer {
              padding: 20px 30px;
              background: #fafafa;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #e5e5e5;
            }
            .footer a {
              color: #f97316;
              text-decoration: none;
            }
            .divider {
              height: 1px;
              background: #e5e5e5;
              margin: 30px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Analytics Report</h1>
              <p>${data.date}</p>
            </div>
            
            <div class="content">
              <!-- Today's Performance Section -->
              <div class="today-section">
                <div class="today-header">
                  <div class="today-title">🌟 Today's Performance</div>
                  <div class="today-date">${data.date}</div>
                </div>
                
                <div class="metric-grid">
                  <div class="today-metric-card">
                    <div class="metric-label">Visitors</div>
                    <div class="metric-value">${data.todayVisitors.toLocaleString()}</div>
                    <div class="metric-change" style="color: ${visitorChangeColor}">
                      ${visitorChangeSymbol} ${Math.abs(visitorChange)}% vs yesterday
                    </div>
                    <div class="metric-comparison">
                      Yesterday: ${data.yesterdayVisitors} | Weekly avg: ${data.weeklyAvgVisitors}
                    </div>
                  </div>
                  <div class="today-metric-card">
                    <div class="metric-label">Pageviews</div>
                    <div class="metric-value">${data.todayPageviews.toLocaleString()}</div>
                    <div class="metric-change" style="color: ${pageviewChangeColor}">
                      ${pageviewChangeSymbol} ${Math.abs(pageviewChange)}% vs yesterday
                    </div>
                    <div class="metric-comparison">
                      Yesterday: ${data.yesterdayPageviews} | Weekly avg: ${data.weeklyAvgPageviews}
                    </div>
                  </div>
                  <div class="today-metric-card">
                    <div class="metric-label">New Visitors</div>
                    <div class="metric-value">${data.todayNewVisitors.toLocaleString()}</div>
                  </div>
                  <div class="today-metric-card">
                    <div class="metric-label">Returning</div>
                    <div class="metric-value">${data.todayReturningVisitors.toLocaleString()}</div>
                  </div>
                </div>

                ${todayTotalDevices > 0 ? `
                <div style="margin-top: 20px;">
                  <div style="font-size: 14px; font-weight: 600; color: #92400e; margin-bottom: 10px;">Today's Device Usage</div>
                  <div style="display: flex; gap: 15px; font-size: 13px;">
                    <div>💻 Desktop: ${data.todayDeviceBreakdown.desktop} (${todayDesktopPercent}%)</div>
                    <div>📱 Mobile: ${data.todayDeviceBreakdown.mobile} (${todayMobilePercent}%)</div>
                    <div>📱 Tablet: ${data.todayDeviceBreakdown.tablet} (${todayTabletPercent}%)</div>
                  </div>
                </div>
                ` : ''}

                ${data.todayTopPages && data.todayTopPages.length > 0 ? `
                <div style="margin-top: 20px;">
                  <div style="font-size: 14px; font-weight: 600; color: #92400e; margin-bottom: 10px;">Today's Top Pages</div>
                  <table class="data-table" style="background: white;">
                    <tbody>
                      ${data.todayTopPages.slice(0, 3).map(page => `
                        <tr>
                          <td style="font-size: 13px;">${page.path}</td>
                          <td style="text-align: right; font-weight: 600; font-size: 13px;">${page.views} views</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
                ` : ''}
              </div>

              <div class="divider"></div>

              <!-- 30-Day Summary Section -->
              <div class="section">
                <div class="section-title">📈 30-Day Summary</div>
                
                <div class="metric-grid">
                  <div class="metric-card">
                    <div class="metric-label">Total Visitors</div>
                    <div class="metric-value">${data.totalVisitors.toLocaleString()}</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-label">Total Pageviews</div>
                    <div class="metric-value">${data.totalPageviews.toLocaleString()}</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-label">Avg per Day</div>
                    <div class="metric-value">${data.avgVisitorsPerDay}</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-label">Avg Pageviews</div>
                    <div class="metric-value">${data.avgPageviewsPerDay}</div>
                  </div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">📱 30-Day Device Breakdown</div>
                <div class="device-bar">
                  ${desktopPercent > 0 ? `<div class="device-segment" style="background: #3b82f6; width: ${desktopPercent}%">${desktopPercent}%</div>` : ''}
                  ${mobilePercent > 0 ? `<div class="device-segment" style="background: #f97316; width: ${mobilePercent}%">${mobilePercent}%</div>` : ''}
                  ${tabletPercent > 0 ? `<div class="device-segment" style="background: #8b5cf6; width: ${tabletPercent}%">${tabletPercent}%</div>` : ''}
                </div>
                <table class="data-table">
                  <tr>
                    <td>💻 Desktop</td>
                    <td style="text-align: right; font-weight: 600;">${data.deviceBreakdown.desktop.toLocaleString()} (${desktopPercent}%)</td>
                  </tr>
                  <tr>
                    <td>📱 Mobile</td>
                    <td style="text-align: right; font-weight: 600;">${data.deviceBreakdown.mobile.toLocaleString()} (${mobilePercent}%)</td>
                  </tr>
                  <tr>
                    <td>📱 Tablet</td>
                    <td style="text-align: right; font-weight: 600;">${data.deviceBreakdown.tablet.toLocaleString()} (${tabletPercent}%)</td>
                  </tr>
                </table>
              </div>

              ${data.topPages.length > 0 ? `
              <div class="section">
                <div class="section-title">📄 30-Day Top Pages</div>
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Page</th>
                      <th style="text-align: right;">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.topPages.slice(0, 5).map(page => `
                      <tr>
                        <td>${page.path}</td>
                        <td style="text-align: right; font-weight: 600;">${page.views.toLocaleString()}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              ` : ''}

              <div class="section">
                <div class="section-title">👥 30-Day Visitor Types</div>
                <table class="data-table">
                  <tr>
                    <td>New Visitors</td>
                    <td style="text-align: right; font-weight: 600;">${data.newVisitors.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>Returning Visitors</td>
                    <td style="text-align: right; font-weight: 600;">${data.returningVisitors.toLocaleString()}</td>
                  </tr>
                </table>
              </div>
            </div>

            <div class="footer">
              <p>View full analytics dashboard at <a href="${APP_BASE_URL}/admin/analytics">${APP_BASE_URL}/admin/analytics</a></p>
              <p style="margin-top: 10px; color: #999;">
                This is an automated daily report. To unsubscribe or change settings, please contact support.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Analytics Report - ${data.date}

TODAY'S PERFORMANCE (${data.date})
================================
Visitors: ${data.todayVisitors.toLocaleString()} (${visitorChangeSymbol}${Math.abs(visitorChange)}% vs yesterday)
Pageviews: ${data.todayPageviews.toLocaleString()} (${pageviewChangeSymbol}${Math.abs(pageviewChange)}% vs yesterday)
New Visitors: ${data.todayNewVisitors.toLocaleString()}
Returning Visitors: ${data.todayReturningVisitors.toLocaleString()}

Yesterday's Numbers:
- Visitors: ${data.yesterdayVisitors}
- Pageviews: ${data.yesterdayPageviews}

Weekly Average:
- Visitors: ${data.weeklyAvgVisitors}
- Pageviews: ${data.weeklyAvgPageviews}

Today's Device Breakdown:
Desktop: ${data.todayDeviceBreakdown.desktop} (${todayDesktopPercent}%)
Mobile: ${data.todayDeviceBreakdown.mobile} (${todayMobilePercent}%)
Tablet: ${data.todayDeviceBreakdown.tablet} (${todayTabletPercent}%)

Today's Top Pages:
${data.todayTopPages ? data.todayTopPages.slice(0, 3).map(page => `${page.path}: ${page.views} views`).join('\n') : 'No page data yet'}

30-DAY SUMMARY
==============
Total Visitors: ${data.totalVisitors.toLocaleString()}
Total Pageviews: ${data.totalPageviews.toLocaleString()}
Average Visitors per Day: ${data.avgVisitorsPerDay}
Average Pageviews per Day: ${data.avgPageviewsPerDay}

30-Day Device Breakdown:
Desktop: ${data.deviceBreakdown.desktop.toLocaleString()} (${desktopPercent}%)
Mobile: ${data.deviceBreakdown.mobile.toLocaleString()} (${mobilePercent}%)
Tablet: ${data.deviceBreakdown.tablet.toLocaleString()} (${tabletPercent}%)

30-Day Top Pages:
${data.topPages.slice(0, 5).map(page => `${page.path}: ${page.views.toLocaleString()} views`).join('\n')}

30-Day Visitor Types:
New Visitors: ${data.newVisitors.toLocaleString()}
Returning Visitors: ${data.returningVisitors.toLocaleString()}

---
View full analytics dashboard at ${APP_BASE_URL}/admin/analytics
    `.trim()
  };

  try {
    await sgMail.send(msg);
    console.log(`Analytics email sent to ${data.recipientEmail}`);
  } catch (error) {
    console.error('Error sending analytics email:', error);
  }
}

export async function sendTicketEmail(data: TicketEmailData): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.error('SendGrid API key not configured, skipping ticket email');
    return;
  }

  const ticketRows = data.tickets.map(ticket => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <strong>${ticket.tierName}</strong>
        <br>
        <small style="color: #6b7280;">Ticket ID: ${ticket.id}</small>
        ${ticket.seat ? `<br><small style="color: #6b7280;">Seat: ${ticket.seat}</small>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <div style="background: #f3f4f6; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 12px;">
          ${ticket.qrToken}
        </div>
      </td>
    </tr>
  `).join('');

  const msg = {
    to: data.recipientEmail,
    from: {
      email: EMAIL_FROM_ADDRESS,
      name: EMAIL_FROM_NAME
    },
    subject: `Your tickets for ${data.eventTitle}`,
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
              background-color: #f9fafb;
            }
            .header {
              text-align: center;
              padding: 30px 0;
              background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
              color: white;
              border-radius: 12px 12px 0 0;
              margin-bottom: 0;
            }
            .content {
              background: white;
              padding: 30px;
              border-radius: 0 0 12px 12px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            .event-details {
              background: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #6366f1;
            }
            .tickets-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              overflow: hidden;
            }
            .tickets-table th {
              background: #f3f4f6;
              padding: 12px;
              text-align: left;
              font-weight: 600;
              color: #374151;
            }
            .qr-notice {
              background: #fef3c7;
              border: 1px solid #f59e0b;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              padding: 20px 0;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">🎟️ Your Tickets</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Get ready for an amazing experience!</p>
          </div>
          
          <div class="content">
            <p style="font-size: 18px; margin-bottom: 10px;">Hi ${data.buyerName},</p>
            
            <p>Thank you for your purchase! Your tickets for <strong>${data.eventTitle}</strong> are ready.</p>
            
            <div class="event-details">
              <h3 style="margin-top: 0; color: #6366f1;">📅 Event Details</h3>
              <p><strong>Event:</strong> ${data.eventTitle}</p>
              <p><strong>Venue:</strong> ${data.eventVenue}</p>
              <p><strong>Date:</strong> ${data.eventDate}</p>
              <p><strong>Time:</strong> ${data.eventTime}</p>
              <p><strong>Order #:</strong> ${data.orderNumber}</p>
              <p><strong>Total Paid:</strong> ${data.totalAmount}</p>
            </div>
            
            <h3>🎫 Your Tickets</h3>
            <table class="tickets-table">
              <thead>
                <tr>
                  <th>Ticket Details</th>
                  <th style="text-align: center;">QR Code</th>
                </tr>
              </thead>
              <tbody>
                ${ticketRows}
              </tbody>
            </table>
            
            <div class="qr-notice">
              <p style="margin: 0;"><strong>📱 Important:</strong> Please save this email or take screenshots of your QR codes. You'll need to show them at the venue for entry.</p>
            </div>
            
            <h3>📋 Important Information</h3>
            <ul>
              <li>Arrive at least 30 minutes before the event start time</li>
              <li>Have your QR codes ready on your phone or printed</li>
              <li>Bring a valid photo ID for verification</li>
              <li>Check the venue's specific entry requirements</li>
            </ul>
            
            ${data.refundPolicy ? `
              <h3>🔄 Refund Policy</h3>
              <p style="font-size: 14px; color: #6b7280;">${data.refundPolicy}</p>
            ` : ''}
            
            <p>Questions about your order? Reply to this email and we'll help you out!</p>
            
            <p style="margin-top: 30px;">See you at the event! 🎉</p>
          </div>
          
          <div class="footer">
            <p>Need help? Contact us at <a href="mailto:${EMAIL_FROM_ADDRESS}">${EMAIL_FROM_ADDRESS}</a></p>
            <p style="color: #999; font-size: 12px;">
              ${APP_BASE_URL}<br>
              Vancouver's Cultural Events Platform
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
Hi ${data.buyerName},

Thank you for your purchase! Your tickets for ${data.eventTitle} are ready.

Event Details:
- Event: ${data.eventTitle}
- Venue: ${data.eventVenue} 
- Date: ${data.eventDate}
- Time: ${data.eventTime}
- Order #: ${data.orderNumber}
- Total Paid: ${data.totalAmount}

Your Tickets:
${data.tickets.map(ticket => `
- ${ticket.tierName} (ID: ${ticket.id})
  QR Code: ${ticket.qrToken}${ticket.seat ? `\n  Seat: ${ticket.seat}` : ''}
`).join('')}

Important: Please save this email or take screenshots of your QR codes. You'll need to show them at the venue for entry.

Important Information:
- Arrive at least 30 minutes before the event start time
- Have your QR codes ready on your phone or printed  
- Bring a valid photo ID for verification
- Check the venue's specific entry requirements

${data.refundPolicy ? `Refund Policy: ${data.refundPolicy}` : ''}

Questions about your order? Reply to this email and we'll help you out!

See you at the event!

---
Jugnu - Vancouver's Cultural Events Platform
${APP_BASE_URL}
    `.trim()
  };

  try {
    await sgMail.send(msg);
    console.log(`Ticket email sent to ${data.recipientEmail} for order ${data.orderNumber}`);
  } catch (error) {
    console.error('Error sending ticket email:', error);
    throw error;
  }
}