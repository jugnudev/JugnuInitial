import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) {
  console.warn('Warning: SENDGRID_API_KEY not set - email notifications will not be sent');
} else {
  sgMail.setApiKey(apiKey);
}

export interface FeatureRequestEmailData {
  organizerName: string;
  email: string;
  eventUrl: string;
  category: string;
  title: string;
  startIso: string;
  endIso: string;
  address: string;
  city: string;
  ticketLink?: string | null;
  imageUrl?: string | null;
  uploadedImageUrl?: string | null;
  message?: string | null;
}

export async function sendFeatureRequestNotification(data: FeatureRequestEmailData): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log('SendGrid not configured - skipping email notification');
    return false;
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'relations@thehouseofjugnu.com';
  
  // Format dates for email
  const startDate = new Date(data.startIso);
  const endDate = new Date(data.endIso);
  const formatDate = (date: Date) => {
    return date.toLocaleString('en-US', {
      timeZone: 'America/Vancouver',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Build the email HTML
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #F59E0B; border-bottom: 2px solid #F59E0B; padding-bottom: 10px;">
        New Featured Event Request
      </h2>
      
      <h3 style="color: #333; margin-top: 20px;">Contact Information</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; width: 150px;"><strong>Organizer:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.organizerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">
            <a href="mailto:${data.email}">${data.email}</a>
          </td>
        </tr>
      </table>

      <h3 style="color: #333; margin-top: 20px;">Event Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; width: 150px;"><strong>Event Name:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.title}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Category:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.category}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Start:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${formatDate(startDate)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>End:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${formatDate(endDate)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Address:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.address}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>City:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.city}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Event URL:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">
            <a href="${data.eventUrl}" target="_blank">${data.eventUrl}</a>
          </td>
        </tr>
        ${data.ticketLink ? `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Ticket Link:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">
            <a href="${data.ticketLink}" target="_blank">${data.ticketLink}</a>
          </td>
        </tr>
        ` : ''}
      </table>

      ${data.message ? `
      <h3 style="color: #333; margin-top: 20px;">Additional Information</h3>
      <div style="padding: 12px; background-color: #f5f5f5; border-radius: 5px; margin-top: 10px;">
        ${data.message.replace(/\n/g, '<br>')}
      </div>
      ` : ''}

      ${(data.imageUrl || data.uploadedImageUrl) ? `
      <h3 style="color: #333; margin-top: 20px;">Event Image</h3>
      <div style="margin-top: 10px;">
        ${data.uploadedImageUrl ? `
          <p><strong>Uploaded Image:</strong> <a href="${data.uploadedImageUrl}" target="_blank">View Uploaded Image</a></p>
        ` : ''}
        ${data.imageUrl ? `
          <p><strong>Image URL:</strong> <a href="${data.imageUrl}" target="_blank">${data.imageUrl}</a></p>
        ` : ''}
      </div>
      ` : ''}

      <div style="margin-top: 30px; padding: 15px; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px;">
        <strong>Action Required:</strong> Please review this featured event request and respond to the organizer within 2-3 business days.
      </div>

      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
        This email was sent from the Jugnu Featured Event Request Form.<br>
        Timestamp: ${new Date().toLocaleString('en-US', { timeZone: 'America/Vancouver' })}
      </div>
    </div>
  `;

  const emailText = `
New Featured Event Request

CONTACT INFORMATION
Organizer: ${data.organizerName}
Email: ${data.email}

EVENT DETAILS
Event Name: ${data.title}
Category: ${data.category}
Start: ${formatDate(startDate)}
End: ${formatDate(endDate)}
Address: ${data.address}
City: ${data.city}
Event URL: ${data.eventUrl}
${data.ticketLink ? `Ticket Link: ${data.ticketLink}` : ''}

${data.message ? `ADDITIONAL INFORMATION\n${data.message}\n` : ''}

${data.uploadedImageUrl ? `Uploaded Image: ${data.uploadedImageUrl}` : ''}
${data.imageUrl ? `Image URL: ${data.imageUrl}` : ''}

Please review this request and respond within 2-3 business days.
  `;

  try {
    const msg = {
      to: adminEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'relations@jugnucanada.com',
      subject: `New Featured Event Request: ${data.title}`,
      text: emailText,
      html: emailHtml,
      replyTo: data.email
    };

    await sgMail.send(msg);
    console.log(`Feature request email sent to ${adminEmail} for event: ${data.title}`);
    return true;
  } catch (error) {
    console.error('Error sending feature request email:', error);
    return false;
  }
}