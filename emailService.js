require('dotenv').config();
const { Resend } = require('resend');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM || 'Meetme <onboarding@resend.dev>';

let resend = null;
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
}

/**
 * Standard branded HTML email template wrapper
 */
function getEmailLayout({ title, previewText, bodyContent }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #FAF5EE;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #321C04;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 580px;
      margin: 30px auto;
      background: #FFFFFF;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid rgba(50, 28, 4, 0.08);
      box-shadow: 0 10px 25px rgba(50, 28, 4, 0.05);
    }
    .header {
      background: #F6E4CF;
      padding: 32px 24px;
      text-align: center;
      border-bottom: 1px solid rgba(50, 28, 4, 0.08);
    }
    .logo-text {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.04em;
      color: #321C04;
      margin: 0;
      text-decoration: none;
    }
    .content {
      padding: 36px 32px;
      line-height: 1.6;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #321C04;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .text {
      font-size: 15px;
      color: #5A4A3E;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .code-box {
      background: #FAF5EE;
      border: 1.5px dashed #E05A47;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 28px 0;
    }
    .code-digits {
      font-family: 'SF Mono', Consolas, Monaco, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 0.25em;
      color: #E05A47;
      margin: 0;
    }
    .code-sub {
      font-size: 13px;
      color: #8C7B70;
      margin: 8px 0 0 0;
    }
    .btn {
      display: inline-block;
      background: #E05A47;
      color: #FFFFFF !important;
      font-weight: 600;
      font-size: 15px;
      padding: 13px 28px;
      border-radius: 99px;
      text-decoration: none;
      margin-top: 12px;
      box-shadow: 0 4px 12px rgba(224, 90, 71, 0.25);
    }
    .footer {
      background: #FAF5EE;
      padding: 24px 32px;
      text-align: center;
      font-size: 12px;
      color: #8C7B70;
      border-top: 1px solid rgba(50, 28, 4, 0.06);
    }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden;">${previewText}</div>
  <div class="wrapper">
    <div class="header">
      <div class="logo-text">meetme</div>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;">Meetme Technologies Ltd. · Digital Cards for Modern Professionals</p>
      <p style="margin: 0;">If you did not request this email, you can safely ignore it.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send Welcome Email on Account Creation
 */
async function sendWelcomeEmail({ email, username, appUrl }) {
  const baseUrl = appUrl || process.env.APP_URL || 'https://meetme-sigma.vercel.app';
  const cardUrl = `${baseUrl}/c/${username}`;
  const dashUrl = `${baseUrl}/dashboard`;

  const subject = `Welcome to Meetme, @${username}! 🚀 Your 3D Card is Live`;
  const html = getEmailLayout({
    title: 'Welcome to Meetme',
    previewText: `Your digital card is ready at ${cardUrl}`,
    bodyContent: `
      <h2 class="title">Welcome aboard, @${username}! 👋</h2>
      <p class="text">
        Congratulations on creating your Meetme account! Your interactive 3D digital card has been created and is live for networking.
      </p>
      <p class="text">
        <strong>Your Public Card Link:</strong><br>
        <a href="${cardUrl}" style="color: #E05A47; font-weight: 600; font-size: 16px; word-break: break-all;">${cardUrl}</a>
      </p>
      <div style="text-align: center; margin: 32px 0 16px 0;">
        <a href="${dashUrl}" class="btn">Go to Your Dashboard →</a>
      </div>
      <p class="text" style="font-size: 13px; color: #8C7B70; margin-top: 24px;">
        Tip: From your dashboard, you can customize your card colors, add social links, upload your profile picture, and create conference passes for upcoming events.
      </p>
    `
  });

  return await dispatchEmail({ to: email, subject, html });
}

/**
 * Send Password Reset Verification OTP Email
 */
async function sendPasswordResetOtpEmail({ email, username, code }) {
  const subject = `Your Meetme Password Reset Code: ${code}`;
  const html = getEmailLayout({
    title: 'Reset Your Meetme Password',
    previewText: `Use verification code ${code} to reset your password. Valid for 15 minutes.`,
    bodyContent: `
      <h2 class="title">Reset Your Password 🔒</h2>
      <p class="text">
        Hello <strong>@${username}</strong>,<br>
        We received a request to reset the password for your Meetme account. Enter the verification code below in your browser:
      </p>
      
      <div class="code-box">
        <p class="code-digits">${code}</p>
        <p class="code-sub">This code expires in <strong>15 minutes</strong>.</p>
      </div>

      <p class="text">
        For your security, never share this verification code with anyone. If you didn't ask to reset your password, you can safely ignore this email — your account remains secure.
      </p>
    `
  });

  return await dispatchEmail({ to: email, subject, html });
}

/**
 * Send Password Changed Confirmation Email
 */
async function sendPasswordChangedEmail({ email, username, appUrl }) {
  const baseUrl = appUrl || process.env.APP_URL || 'https://meetme-sigma.vercel.app';
  const loginUrl = `${baseUrl}/login`;

  const subject = 'Your Meetme password was successfully changed';
  const html = getEmailLayout({
    title: 'Password Updated',
    previewText: 'Your Meetme account password was changed successfully.',
    bodyContent: `
      <h2 class="title">Password Changed Successfully ✅</h2>
      <p class="text">
        Hello <strong>@${username}</strong>,<br>
        This is a quick security confirmation that the password for your Meetme account was successfully updated.
      </p>
      <div style="text-align: center; margin: 28px 0 12px 0;">
        <a href="${loginUrl}" class="btn">Log In to Meetme →</a>
      </div>
      <p class="text" style="font-size: 13px; color: #8C7B70; margin-top: 24px;">
        If you did NOT make this change, please contact support immediately to secure your account.
      </p>
    `
  });

  return await dispatchEmail({ to: email, subject, html });
}

/**
 * Dispatch Email via Resend or Console Fallback
 */
async function dispatchEmail({ to, subject, html }) {
  if (resend) {
    try {
      const response = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html
      });
      console.log(`✉️ [Resend] Email sent successfully to ${to} (ID: ${response.data ? response.data.id : 'ok'})`);
      return { success: true, provider: 'resend', id: response.data ? response.data.id : null };
    } catch (err) {
      console.error(`⚠️ [Resend] Failed to send email to ${to}:`, err.message);
      // Fallback logged for dev and reliability
      return { success: false, error: err.message };
    }
  } else {
    console.log(`\n======================================================`);
    console.log(`📬 [EMAIL NOTIFICATION PREVIEW - Set RESEND_API_KEY to send live]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`======================================================\n`);
    return { success: true, provider: 'console_dev' };
  }
}

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetOtpEmail,
  sendPasswordChangedEmail
};
