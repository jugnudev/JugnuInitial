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
              color: white;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              margin: 20px 0;
            }
            .highlight {
              background-color: #fef3c7;
              padding: 2px 6px;
              border-radius: 4px;
              font-weight: 600;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #f0f0f0;
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="color: #7c3aed; margin: 0;">🎉 You're Approved!</h1>
            <p style="color: #666; margin-top: 10px;">Complete your campaign setup to go live on Jugnu</p>
          </div>
          
          <div class="content">
            <p>Hi ${data.contactName},</p>
            
            <p>Great news! Your sponsorship application for <strong>${data.businessName}</strong> has been approved.</p>
            
            <p>You can now complete your campaign setup by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${data.onboardingLink}" class="button">Complete Campaign Setup</a>
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