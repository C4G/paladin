import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';

// Lazy-init so the build doesn't crash when RESEND_API_KEY is missing in CI
let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

// Base URL for assets (logo, etc.)
export const getBaseUrl = () =>
  process.env.NEXTAUTH_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  'https://paladinfarmandranch.com';

const FROM_EMAIL = 'Paladin Farm & Ranch <stephen@paladinfarmandranch.com>';

interface EmailOptions {
  to: string;
  subject: string;
  title: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
  footerText?: string;
  replyTo?: string;
  bypassPreference?: boolean;
}

/**
 * Generate a styled HTML email template
 */
function generateEmailTemplate({
  title,
  content,
  ctaText,
  ctaUrl,
  footerText,
}: Omit<EmailOptions, 'to' | 'subject'>): string {
  const baseUrl = getBaseUrl();

  const ctaButton =
    ctaText && ctaUrl
      ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 24px;">
      <tr>
        <td align="center">
          <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 32px; background-color: #0a0f1c; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
            ${ctaText}
          </a>
        </td>
      </tr>
    </table>
  `
      : '';

  const footerContent =
    footerText ||
    'You received this email because you have an account on Paladin Farm & Ranch. You can manage your notification preferences in your profile settings.';

  // Strip whitespace-only lines and leading/trailing whitespace from content
  // but preserve intentional <br> tags in the source
  const formattedContent = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background-color: #0a0f1c; padding: 32px 40px; text-align: center;">
                  <a href="${baseUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block;">
                    <img src="${baseUrl}/logo-white.png" alt="Paladin Farm & Ranch" width="180" height="auto" style="display: block; margin: 0 auto; max-width: 180px; border: 0;" />
                  </a>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 24px 0; color: #0a0f1c; font-size: 20px; font-weight: 600;">
                    ${title}
                  </h2>
                  
                  <div style="color: #0a0f1c; font-size: 15px; line-height: 1.6;">
                    ${formattedContent}
                  </div>
                  
                  ${ctaButton}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; color: #64748b; font-size: 13px; text-align: center; line-height: 1.5;">
                    ${footerContent}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Check if a user has email notifications enabled
 */
async function isEmailNotificationsEnabled(email: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { emailNotifications: true },
    });
    // If user not found (e.g. external contact), allow sending
    if (!user) return true;
    return user.emailNotifications;
  } catch {
    // On error, default to allowing the email
    return true;
  }
}

/**
 * Send an email using the standard template
 */
export async function sendEmail(
  options: EmailOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if the recipient has email notifications enabled
    if (!options.bypassPreference) {
      const enabled = await isEmailNotificationsEnabled(options.to);
      if (!enabled) {
        console.log(
          `Email notifications disabled for ${options.to}, skipping.`
        );
        return { success: true };
      }
    }

    const html = generateEmailTemplate({
      title: options.title,
      content: options.content,
      ctaText: options.ctaText,
      ctaUrl: options.ctaUrl,
      footerText: options.footerText,
    });

    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html,
      replyTo: options.replyTo || undefined,
    });

    console.log('Email sent:', JSON.stringify(result));
    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send confirmation email when a user requests to join an organization
 */
export async function sendJoinRequestSubmittedEmail({
  to,
  userName,
  orgName,
}: {
  to: string;
  userName: string;
  orgName: string;
}): Promise<{ success: boolean; error?: string }> {
  const baseUrl = getBaseUrl();

  return sendEmail({
    to,
    subject: `Your request to join "${orgName}" has been submitted`,
    title: 'Join Request Submitted',
    content: `
      <p style="margin: 0 0 16px 0;">
        Hello ${userName},
      </p>
      <p style="margin: 0 0 16px 0;">
        Your request to join <strong>"${orgName}"</strong> has been submitted.
      </p>
      <div style="margin: 16px 0; padding: 16px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
        <p style="margin: 0; color: #1e40af; font-size: 14px;">
          <strong>What happens next?</strong><br>
          An organization manager will review your request. You'll receive another email once a decision has been made.
        </p>
      </div>
    `,
    ctaText: 'View Organizations',
    ctaUrl: `${baseUrl}/organizations`,
    footerText:
      'You received this email because you requested to join an organization on Paladin Farm & Ranch.',
  });
}

/**
 * Send confirmation email when a user submits an org creation request
 */
export async function sendOrgRequestSubmittedEmail({
  to,
  orgName,
}: {
  to: string;
  orgName: string;
}): Promise<{ success: boolean; error?: string }> {
  const baseUrl = getBaseUrl();

  return sendEmail({
    to,
    subject: `We received your request to create "${orgName}"`,
    title: 'Organization Request Submitted',
    content: `
      <p style="margin: 0 0 16px 0;">
        Thank you for submitting a request to create the organization <strong>"${orgName}"</strong>.
      </p>
      <div style="margin: 16px 0; padding: 16px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
        <p style="margin: 0; color: #1e40af; font-size: 14px;">
          <strong>What happens next?</strong><br>
          An admin will review your request shortly. You'll receive another email once a decision has been made.
        </p>
      </div>
    `,
    ctaText: 'View Organizations',
    ctaUrl: `${baseUrl}/organizations`,
    footerText:
      'You received this email because you submitted an organization request on Paladin Farm & Ranch.',
  });
}

/**
 * Send organization request approval email
 */
export async function sendOrgApprovalEmail({
  to,
  orgName,
  orgId,
}: {
  to: string;
  orgName: string;
  orgId: string;
}): Promise<{ success: boolean; error?: string }> {
  const baseUrl = getBaseUrl();

  return sendEmail({
    to,
    subject: `Your organization "${orgName}" has been approved!`,
    title: 'Organization Approved',
    content: `
      <p style="margin: 0 0 16px 0;">
        Great news! Your request to create the organization <strong>"${orgName}"</strong> has been approved.
      </p>
      <div style="margin: 16px 0; padding: 16px; background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
        <p style="margin: 0; color: #166534; font-size: 14px;">
          <strong>You're all set!</strong><br>
          You are now the owner of this organization and can start adding members, managing resources, and coordinating response efforts.
        </p>
      </div>
    `,
    ctaText: 'Go to Dashboard',
    ctaUrl: `${baseUrl}/dashboard?org=${orgId}`,
    footerText:
      'You received this email because you requested to create an organization on Paladin Farm & Ranch.',
  });
}

/**
 * Send organization request rejection email
 */
export async function sendOrgRejectionEmail({
  to,
  orgName,
  reason,
}: {
  to: string;
  orgName: string;
  reason?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const baseUrl = getBaseUrl();

  const reasonBlock = reason
    ? `
      <div style="margin: 16px 0; padding: 16px; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
        <p style="margin: 0; color: #991b1b; font-size: 14px;">
          <strong>Reason for rejection:</strong><br>
          ${reason}
        </p>
      </div>
    `
    : '';

  return sendEmail({
    to,
    subject: `Update on your organization request "${orgName}"`,
    title: 'Organization Request Update',
    content: `
      <p style="margin: 0 0 16px 0;">
        We've reviewed your request to create the organization <strong>"${orgName}"</strong>.
      </p>
      <p style="margin: 0 0 16px 0;">
        Unfortunately, we were unable to approve your request at this time.
      </p>
      ${reasonBlock}
      <p style="margin: 0;">
        If you have questions or would like to submit a new request, please visit the Organizations page.
      </p>
    `,
    ctaText: 'View Organizations',
    ctaUrl: `${baseUrl}/organizations`,
    footerText:
      'You received this email because you requested to create an organization on Paladin Farm & Ranch.',
  });
}

/**
 * Send confirmation email when a user creates a disaster/help request
 */
export async function sendRequestCreatedEmail({
  to,
  userName,
  farmName,
  disasterType,
  requestId,
}: {
  to: string;
  userName: string;
  farmName: string;
  disasterType: string;
  requestId: string;
}): Promise<{ success: boolean; error?: string }> {
  const baseUrl = getBaseUrl();

  return sendEmail({
    to,
    subject: `Your ${disasterType} request has been submitted`,
    title: 'Request Submitted',
    content: `
      <p style="margin: 0 0 16px 0;">
        Hello ${userName},
      </p>
      <p style="margin: 0 0 16px 0;">
        Your <strong>${disasterType}</strong> request for <strong>${farmName}</strong> has been submitted successfully.
      </p>
      <div style="margin: 16px 0; padding: 16px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
        <p style="margin: 0; color: #1e40af; font-size: 14px;">
          <strong>What happens next?</strong><br>
          Nearby farmers and responders have been notified and may respond to assist you. You can track responses in your dashboard.
        </p>
      </div>
    `,
    ctaText: 'View Request',
    ctaUrl: `${baseUrl}/dashboard?requestId=${requestId}`,
    footerText:
      'You received this email because you submitted a request on Paladin Farm & Ranch.',
  });
}

/**
 * Send email to the request owner when their request is closed
 */
export async function sendRequestClosedEmail({
  to,
  userName,
  farmName,
  disasterType,
}: {
  to: string;
  userName: string;
  farmName: string;
  disasterType: string;
}): Promise<{ success: boolean; error?: string }> {
  const baseUrl = getBaseUrl();

  return sendEmail({
    to,
    subject: `Your ${disasterType} request has been closed`,
    title: 'Request Closed',
    content: `
      <p style="margin: 0 0 16px 0;">
        Hello ${userName},
      </p>
      <p style="margin: 0 0 16px 0;">
        Your <strong>${disasterType}</strong> request for <strong>${farmName}</strong> has been closed.
      </p>
      <div style="margin: 16px 0; padding: 16px; background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
        <p style="margin: 0; color: #166534; font-size: 14px;">
          <strong>Thank you!</strong><br>
          We hope the assistance you received was helpful. You can view the details of this and other past requests in your request history on the dashboard.
        </p>
      </div>
    `,
    ctaText: 'View Request History',
    ctaUrl: `${baseUrl}/dashboard`,
    footerText:
      'You received this email because a request you created on Paladin Farm & Ranch was closed.',
  });
}

/**
 * Send email to active responders when a request they responded to is closed
 */
export async function sendRequestClosedToResponderEmail({
  to,
  responderName,
  ownerName,
  farmName,
  disasterType,
}: {
  to: string;
  responderName: string;
  ownerName: string;
  farmName: string;
  disasterType: string;
}): Promise<{ success: boolean; error?: string }> {
  const baseUrl = getBaseUrl();

  return sendEmail({
    to,
    subject: `A ${disasterType} request you responded to has been closed`,
    title: 'Request Closed',
    content: `
      <p style="margin: 0 0 16px 0;">
        Hello ${responderName},
      </p>
      <p style="margin: 0 0 16px 0;">
        The <strong>${disasterType}</strong> request for <strong>${farmName}</strong> (created by <strong>${ownerName}</strong>) that you responded to has been closed.
      </p>
      <div style="margin: 16px 0; padding: 16px; background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
        <p style="margin: 0; color: #166534; font-size: 14px;">
          <strong>Thank you for helping!</strong><br>
          Your willingness to assist fellow farmers makes a real difference in our community.
        </p>
      </div>
    `,
    ctaText: 'View Dashboard',
    ctaUrl: `${baseUrl}/dashboard`,
    footerText:
      'You received this email because a request you responded to on Paladin Farm & Ranch was closed.',
  });
}

/**
 * Send an email to an organization owner on behalf of a user
 */
export async function sendOrgContactEmail({
  to,
  ownerName,
  senderName,
  senderEmail,
  orgName,
  message,
}: {
  to: string;
  ownerName: string;
  senderName: string;
  senderEmail: string;
  orgName: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  const baseUrl = getBaseUrl();

  return sendEmail({
    to,
    subject: `New message about "${orgName}" from ${senderName}`,
    title: 'New Organization Message',
    replyTo: senderEmail,
    bypassPreference: true,
    content: `
      <p style="margin: 0 0 12px 0;">Hello ${ownerName},</p>
      <p style="margin: 0 0 12px 0;"><strong>${senderName}</strong> has sent you a message regarding <strong>${orgName}</strong>:</p>
      <div style="margin: 12px 0; padding: 12px 16px; background-color: #f8fafc; border-left: 4px solid #94a3b8; border-radius: 4px;">
        <p style="margin: 0; color: #334155; font-size: 14px;">${message}</p>
      </div>
      <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b;">Simply reply to this email to respond directly to <a href="mailto:${senderEmail}" style="color: #3b82f6;">${senderEmail}</a>.</p>
    `,
    ctaText: 'View Organization',
    ctaUrl: `${baseUrl}/organizations`,
    footerText:
      'You received this email because you are the owner of an organization on Paladin Farm & Ranch.',
  });
}

/**
 * Send an email to a farm owner on behalf of another user
 */
export async function sendFarmContactEmail({
  to,
  ownerName,
  senderName,
  senderEmail,
  farmName,
  message,
}: {
  to: string;
  ownerName: string;
  senderName: string;
  senderEmail: string;
  farmName: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  const baseUrl = getBaseUrl();

  return sendEmail({
    to,
    subject: `New message about "${farmName}" from ${senderName}`,
    title: 'New Farm Message',
    replyTo: senderEmail,
    content: `
      <p style="margin: 0 0 12px 0;">Hello ${ownerName},</p>
      <p style="margin: 0 0 12px 0;"><strong>${senderName}</strong> has sent you a message regarding your property <strong>${farmName}</strong>:</p>
      <div style="margin: 12px 0; padding: 12px 16px; background-color: #f8fafc; border-left: 4px solid #94a3b8; border-radius: 4px;">
        <p style="margin: 0; color: #334155; font-size: 14px;">${message}</p>
      </div>
      <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b;">Simply reply to this email to respond directly to <a href="mailto:${senderEmail}" style="color: #3b82f6;">${senderEmail}</a>.</p>
    `,
    ctaText: 'View Dashboard',
    ctaUrl: `${baseUrl}/dashboard`,
    footerText:
      'You received this email because someone contacted you about your property on Paladin Farm & Ranch.',
  });
}
