import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Lazy-init so the build doesn't crash when RESEND_API_KEY is missing in CI
let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

// Defaults to Stephen's email - overrode it using NOTIFICATION_EMAIL and a personal RESEND_API_KEY in .env for my local testing
const NOTIFICATION_EMAIL =
  process.env.NOTIFICATION_EMAIL || 'stephen@paladinfarmandranch.com';

// Base URL for assets (logo, etc.)
const getBaseUrl = () =>
  process.env.NEXTAUTH_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  'https://paladinfarmandranch.com';

export async function POST(req: Request) {
  if (req.method === 'POST') {
    try {
      const { firstName, lastName, email, message } = await req.json();

      // Validate the data
      if (!firstName || !lastName || !email || !message) {
        return NextResponse.json(
          { error: 'All fields are required' },
          { status: 400 }
        );
      }

      // Create a new contact submission
      const submission = await prisma.contactSubmission.create({
        data: {
          firstName,
          lastName,
          email,
          message,
        },
      });

      // Send email notification via Resend
      try {
        const baseUrl = getBaseUrl();
        const emailResult = await getResend().emails.send({
          from: `Paladin Farm & Ranch <stephen@paladinfarmandranch.com>`,
          to: NOTIFICATION_EMAIL,
          cc: email,
          subject: `Contact Form Submission from ${firstName} ${lastName}`,
          html: `
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
                            Contact Form Submission
                          </h2>
                          
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                            <tr>
                              <td style="padding: 16px; background-color: #f8fafc; border-radius: 6px; border-left: 4px solid #0a0f1c;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td style="padding-bottom: 12px;">
                                      <span style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500;">Name</span>
                                      <p style="margin: 4px 0 0 0; color: #0a0f1c; font-size: 16px; font-weight: 500;">${firstName} ${lastName}</p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding-bottom: 12px;">
                                      <span style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500;">Email</span>
                                      <p style="margin: 4px 0 0 0;">
                                        <a href="mailto:${email}" style="color: #0a0f1c; font-size: 16px; text-decoration: none; border-bottom: 1px solid #0a0f1c;">${email}</a>
                                      </p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <div style="margin-bottom: 24px;">
                            <span style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500;">Message</span>
                            <div style="margin-top: 8px; padding: 16px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px;">
                              <p style="margin: 0; color: #0a0f1c; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <!-- Footer -->
                      <tr>
                        <td style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
                          <p style="margin: 0; color: #64748b; font-size: 13px; text-align: center; line-height: 1.5;">
                            This email was sent from the Paladin Farm &amp; Ranch contact form.<br>
                            <span style="color: #94a3b8;">A copy has been sent to the submitter.</span>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
        });
        console.log('Resend email result:', JSON.stringify(emailResult));
      } catch (emailError) {
        // Log but don't fail the request — the DB submission was successful
        console.error('Failed to send email notification:', emailError);
      }

      return NextResponse.json({ success: true, submission }, { status: 201 });
    } catch (error) {
      console.error('Error submitting contact form:', error);
      return NextResponse.json(
        { error: 'An error occurred while submitting the form' },
        { status: 500 }
      );
    }
  } else {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
}
