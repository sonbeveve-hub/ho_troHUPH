import nodemailer from 'nodemailer';
import { env, isSmtpConfigured } from '../config/env.js';
import { db } from '../db/index.js';
import { statusUpdateEmail } from '../templates/statusUpdateEmail.js';
import { submissionConfirmationEmail } from '../templates/submissionConfirmationEmail.js';

let transporter = null;
let warnedOnce = false;

function getTransporter() {
  if (!isSmtpConfigured()) {
    if (!warnedOnce) {
      console.warn(
        '[email] Chưa cấu hình SMTP trong .env — email sẽ không được gửi (chỉ ghi log).'
      );
      warnedOnce = true;
    }
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

function logEmail({ requestId, to, subject, status, error }) {
  db.prepare(
    `INSERT INTO email_log (request_id, to_email, subject, status, error) VALUES (?, ?, ?, ?, ?)`
  ).run(requestId, to, subject, status, error || null);
}

async function dispatchEmail({ requestId, to, subject, html }) {
  const transport = getTransporter();

  if (!transport) {
    logEmail({ requestId, to, subject, status: 'skipped_no_config' });
    return { sent: false, reason: 'skipped_no_config' };
  }

  try {
    await transport.sendMail({ from: env.smtp.from, to, subject, html });
    logEmail({ requestId, to, subject, status: 'sent' });
    return { sent: true };
  } catch (err) {
    console.error('[email] Gửi email thất bại:', err.message);
    logEmail({ requestId, to, subject, status: 'failed', error: err.message });
    return { sent: false, reason: 'failed', error: err.message };
  }
}

export async function sendStatusUpdateEmail(request, newStatus, note) {
  const { subject, html } = statusUpdateEmail({ request, newStatus, note });
  return dispatchEmail({ requestId: request.id, to: request.requester_email, subject, html });
}

export async function sendSubmissionConfirmationEmail(request, { departmentName, requestTypeName }) {
  const { subject, html } = submissionConfirmationEmail({ request, departmentName, requestTypeName });
  return dispatchEmail({ requestId: request.id, to: request.requester_email, subject, html });
}
