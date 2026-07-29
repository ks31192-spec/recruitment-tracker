import { Resend } from 'resend';
import db from '../db/connection.js';

let resend = null;

function getClient() {
  if (resend) return resend;
  if (!process.env.RESEND_API_KEY) return null;
  resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

function getFromAddress() {
  return process.env.EMAIL_FROM || 'Recruitment <noreply@resend.dev>';
}

function getBranding() {
  try {
    const rows = db.prepare('SELECT key, value FROM site_settings').all();
    const s = {};
    for (const r of rows) s[r.key] = r.value;
    return { name: s.school_name || 'Recruitment Portal', short: s.school_short || '' };
  } catch {
    return { name: 'Recruitment Portal', short: '' };
  }
}

function renderTemplate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

function wrapHtml(bodyContent, schoolName) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
<tr><td style="background:linear-gradient(135deg,#4f46e5,#0ea5e9);padding:24px 32px">
<h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">${schoolName}</h1>
</td></tr>
<tr><td style="padding:32px">
${bodyContent}
</td></tr>
<tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center">
<p style="margin:0;color:#9ca3af;font-size:12px">&copy; ${new Date().getFullYear()} ${schoolName}. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export async function sendEmail({ to, subject, html, text }) {
  const client = getClient();
  if (!client) {
    console.warn('[email] RESEND_API_KEY not set — email not sent to', to);
    return { sent: false, reason: 'no_api_key' };
  }

  try {
    const result = await client.emails.send({
      from: getFromAddress(),
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(text ? { text } : {}),
    });
    // The SDK reports API rejections in result.error rather than throwing, so
    // without this check a refused send was reported back as a success.
    if (result?.error) {
      const reason = result.error.message || result.error.name || 'Email provider rejected the message';
      console.error('[email] rejected for', to, '-', reason);
      return { sent: false, reason };
    }
    if (!result?.data?.id) {
      console.error('[email] no id returned for', to, JSON.stringify(result));
      return { sent: false, reason: 'Email provider did not confirm the send' };
    }
    console.log('[email] sent to', to, result.data.id);
    return { sent: true, id: result.data.id };
  } catch (err) {
    console.error('[email] failed:', err.message);
    return { sent: false, reason: err.message };
  }
}

export async function sendPasswordReset(email, name, resetToken) {
  const { name: schoolName } = getBranding();
  const resetUrl = `${process.env.APP_URL || 'https://recruitment-tracker-azure.vercel.app'}/reset-password?token=${resetToken}`;

  const html = wrapHtml(`
<h2 style="margin:0 0 16px;color:#111827;font-size:18px">Password Reset</h2>
<p style="color:#374151;line-height:1.6">Hi ${name},</p>
<p style="color:#374151;line-height:1.6">We received a request to reset your password. Click the button below to set a new one:</p>
<div style="text-align:center;margin:24px 0">
<a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Reset Password</a>
</div>
<p style="color:#6b7280;font-size:13px;line-height:1.5">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
<p style="color:#9ca3af;font-size:12px;margin-top:16px;word-break:break-all">Or copy this link: ${resetUrl}</p>
`, schoolName);

  return sendEmail({
    to: email,
    subject: `Password Reset — ${schoolName}`,
    html,
    text: `Hi ${name}, reset your password here: ${resetUrl} (expires in 1 hour)`,
  });
}

export async function sendInterviewInvite(candidateEmail, candidateName, details) {
  const { name: schoolName } = getBranding();
  const { vacancyTitle, interviewType, date, time, mode, location } = details;

  const typeLabel = interviewType === 'demo' ? 'Demo Class' : 'Interview';
  const when = time ? `${date} at ${time}` : date;
  const where = mode === 'online' ? `Online — ${location || 'link will be shared'}` : (location || 'At the school campus');

  const html = wrapHtml(`
<h2 style="margin:0 0 16px;color:#111827;font-size:18px">${typeLabel} Invitation</h2>
<p style="color:#374151;line-height:1.6">Dear ${candidateName},</p>
<p style="color:#374151;line-height:1.6">We are pleased to invite you for a <strong>${typeLabel.toLowerCase()}</strong> for the position of <strong>${vacancyTitle}</strong>.</p>
<table style="width:100%;margin:20px 0;border-collapse:collapse">
<tr><td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;color:#374151;width:120px">Date & Time</td>
<td style="padding:8px 12px;border:1px solid #e5e7eb;color:#374151">${when}</td></tr>
<tr><td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;color:#374151">Mode</td>
<td style="padding:8px 12px;border:1px solid #e5e7eb;color:#374151">${mode === 'online' ? 'Online' : 'In Person'}</td></tr>
<tr><td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;color:#374151">Venue / Link</td>
<td style="padding:8px 12px;border:1px solid #e5e7eb;color:#374151">${where}</td></tr>
</table>
<p style="color:#374151;line-height:1.6">Please confirm your availability by replying to this email.</p>
<p style="color:#374151;line-height:1.6">Best regards,<br><strong>${schoolName}</strong></p>
`, schoolName);

  return sendEmail({
    to: candidateEmail,
    subject: `${typeLabel} Invitation — ${vacancyTitle} | ${schoolName}`,
    html,
    text: `Dear ${candidateName}, you are invited for a ${typeLabel.toLowerCase()} for ${vacancyTitle} on ${when}. Mode: ${mode}. ${where}. Please confirm by replying.`,
  });
}

export async function sendOfferLetter(candidateEmail, candidateName, details) {
  const { name: schoolName } = getBranding();
  const { designation, salary, joiningDate, vacancyTitle } = details;

  const html = wrapHtml(`
<h2 style="margin:0 0 16px;color:#111827;font-size:18px">Offer Letter</h2>
<p style="color:#374151;line-height:1.6">Dear ${candidateName},</p>
<p style="color:#374151;line-height:1.6">We are delighted to offer you the position of <strong>${designation || vacancyTitle}</strong> at ${schoolName}.</p>
<table style="width:100%;margin:20px 0;border-collapse:collapse">
${designation ? `<tr><td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;color:#374151;width:140px">Designation</td>
<td style="padding:8px 12px;border:1px solid #e5e7eb;color:#374151">${designation}</td></tr>` : ''}
${salary ? `<tr><td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;color:#374151">Salary Offered</td>
<td style="padding:8px 12px;border:1px solid #e5e7eb;color:#374151">${salary}</td></tr>` : ''}
${joiningDate ? `<tr><td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;color:#374151">Proposed Joining</td>
<td style="padding:8px 12px;border:1px solid #e5e7eb;color:#374151">${joiningDate}</td></tr>` : ''}
</table>
<p style="color:#374151;line-height:1.6">Please reply to this email to confirm your acceptance or to discuss any questions.</p>
<p style="color:#374151;line-height:1.6">We look forward to having you on our team!</p>
<p style="color:#374151;line-height:1.6">Warm regards,<br><strong>${schoolName}</strong></p>
`, schoolName);

  return sendEmail({
    to: candidateEmail,
    subject: `Offer Letter — ${designation || vacancyTitle} | ${schoolName}`,
    html,
  });
}

export async function sendRejection(candidateEmail, candidateName, details) {
  const { name: schoolName } = getBranding();
  const { vacancyTitle, reason } = details;

  const html = wrapHtml(`
<h2 style="margin:0 0 16px;color:#111827;font-size:18px">Application Update</h2>
<p style="color:#374151;line-height:1.6">Dear ${candidateName},</p>
<p style="color:#374151;line-height:1.6">Thank you for your interest in the <strong>${vacancyTitle}</strong> position at ${schoolName} and for taking the time to go through our selection process.</p>
<p style="color:#374151;line-height:1.6">After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.</p>
${reason ? `<p style="color:#6b7280;line-height:1.6;font-size:14px"><em>${reason}</em></p>` : ''}
<p style="color:#374151;line-height:1.6">We encourage you to apply for future openings that match your qualifications. We wish you all the best in your career.</p>
<p style="color:#374151;line-height:1.6">Regards,<br><strong>${schoolName}</strong></p>
`, schoolName);

  return sendEmail({
    to: candidateEmail,
    subject: `Application Update — ${vacancyTitle} | ${schoolName}`,
    html,
  });
}

export async function sendPortalOtp(candidateEmail, candidateName, otp) {
  const { name: schoolName } = getBranding();

  const html = wrapHtml(`
<h2 style="margin:0 0 16px;color:#111827;font-size:18px">Your Login Code</h2>
<p style="color:#374151;line-height:1.6">Hi ${candidateName},</p>
<p style="color:#374151;line-height:1.6">Use the code below to sign in to the candidate portal and check your application status:</p>
<div style="text-align:center;margin:24px 0">
<span style="display:inline-block;background:#eef2ff;color:#4338ca;padding:14px 32px;border-radius:10px;font-size:30px;font-weight:700;letter-spacing:10px;font-family:'Courier New',monospace">${otp}</span>
</div>
<p style="color:#6b7280;font-size:13px;line-height:1.5">This code expires in 10 minutes and can be used once. If you didn't request it, you can safely ignore this email — nobody can access your application without the code.</p>
<p style="color:#374151;line-height:1.6;margin-top:20px">Regards,<br><strong>${schoolName}</strong></p>
`, schoolName);

  return sendEmail({
    to: candidateEmail,
    subject: `${otp} is your ${schoolName} login code`,
    html,
    text: `Hi ${candidateName}, your candidate portal login code is ${otp}. It expires in 10 minutes.`,
  });
}

export async function sendTemplateEmail(candidateEmail, candidateName, templateId, extraVars = {}) {
  const { name: schoolName } = getBranding();
  const template = await db.prepare('SELECT * FROM email_templates WHERE id = ?').get(templateId);
  if (!template) return { sent: false, reason: 'template_not_found' };

  const vars = { candidate_name: candidateName, school_name: schoolName, ...extraVars };
  const subject = renderTemplate(template.subject, vars);
  const bodyRendered = renderTemplate(template.body, vars);
  const bodyHtml = bodyRendered.replace(/\n/g, '<br>');

  const html = wrapHtml(`
<div style="color:#374151;line-height:1.7;font-size:15px">${bodyHtml}</div>
`, schoolName);

  return sendEmail({ to: candidateEmail, subject, html });
}

export async function sendCustomEmail(to, subject, body) {
  const { name: schoolName } = getBranding();
  const bodyHtml = body.replace(/\n/g, '<br>');

  const html = wrapHtml(`
<div style="color:#374151;line-height:1.7;font-size:15px">${bodyHtml}</div>
`, schoolName);

  return sendEmail({ to, subject, html });
}
