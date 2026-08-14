import nodemailer from 'nodemailer';
import { env, isSmtpConfigured } from '../config/env.js';
import { db } from '../db/index.js';
import { statusUpdateEmail } from '../templates/statusUpdateEmail.js';
import { submissionConfirmationEmail } from '../templates/submissionConfirmationEmail.js';
import { assignmentEmailForRequester } from '../templates/assignmentEmail.js';
import { resolvedPendingConfirmationEmail } from '../templates/resolvedPendingConfirmationEmail.js';
import { confirmReminderEmail } from '../templates/confirmReminderEmail.js';
import { autoClosedEmail } from '../templates/autoClosedEmail.js';
import { reopenedNotificationEmail } from '../templates/reopenedNotificationEmail.js';
import { staleInProgressEmail } from '../templates/staleInProgressEmail.js';

// Message-ID gốc dùng chung cho mọi email của cùng 1 yêu cầu (kèm subject giống nhau ở
// các template), để mail client (Outlook, Apple Mail...) gom chúng vào chung 1 luồng hội thoại
// qua header In-Reply-To/References, không chỉ dựa vào subject như Gmail.
const MESSAGE_ID_DOMAIN = 'hotrohuph.site';
const threadRootId = (requestId) => `<request-${requestId}@${MESSAGE_ID_DOMAIN}>`;

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

// CC mặc định (nvd@huph.edu.vn) áp cho MỌI email hệ thống gửi ra, gộp thêm với
// bất kỳ CC nào truyền vào riêng cho từng email (ví dụ CC người phụ trách khi phân công).
function buildCc(explicitCc) {
  const set = new Set();
  (Array.isArray(explicitCc) ? explicitCc : explicitCc ? [explicitCc] : []).forEach(
    (e) => e && set.add(e)
  );
  if (env.notifyCcEmail) set.add(env.notifyCcEmail);
  return set.size ? Array.from(set).join(', ') : undefined;
}

async function dispatchEmail({ requestId, to, cc, subject, html, isThreadRoot }) {
  const transport = getTransporter();

  if (!transport) {
    logEmail({ requestId, to, subject, status: 'skipped_no_config' });
    return { sent: false, reason: 'skipped_no_config' };
  }

  const rootId = threadRootId(requestId);
  const mailOptions = { from: env.smtp.from, to, subject, html };
  const ccList = buildCc(cc);
  if (ccList) mailOptions.cc = ccList;
  if (isThreadRoot) {
    mailOptions.messageId = rootId;
  } else {
    mailOptions.inReplyTo = rootId;
    mailOptions.references = rootId;
  }

  try {
    await transport.sendMail(mailOptions);
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

export async function sendSubmissionConfirmationEmail(
  request,
  { departmentName, requestTypeName, processingTimeName }
) {
  const { subject, html } = submissionConfirmationEmail({
    request,
    departmentName,
    requestTypeName,
    processingTimeName,
  });
  return dispatchEmail({
    requestId: request.id,
    to: request.requester_email,
    subject,
    html,
    isThreadRoot: true,
  });
}

// Chỉ gửi 1 email (tới người yêu cầu), CC thêm người phụ trách — không gửi email riêng
// cho người phụ trách nữa.
export async function sendAssignmentEmails(request) {
  const { subject, html } = assignmentEmailForRequester({ request });
  const result = await dispatchEmail({
    requestId: request.id,
    to: request.requester_email,
    cc: request.assignee_email,
    subject,
    html,
  });
  return { sent: result.sent };
}

export async function sendResolvedPendingEmail(request, note) {
  const { subject, html } = resolvedPendingConfirmationEmail({ request, note });
  return dispatchEmail({ requestId: request.id, to: request.requester_email, subject, html });
}

export async function sendConfirmReminderEmail(request) {
  const { subject, html } = confirmReminderEmail({ request });
  return dispatchEmail({ requestId: request.id, to: request.requester_email, subject, html });
}

export async function sendAutoClosedEmail(request) {
  const { subject, html } = autoClosedEmail({ request });
  return dispatchEmail({ requestId: request.id, to: request.requester_email, subject, html });
}

// Gửi cho người phụ trách (không phải người gửi yêu cầu) khi yêu cầu bị từ chối và mở lại.
// Nếu chưa có người phụ trách, gửi cho CC mặc định (NOTIFY_CC_EMAIL) để không bị rơi mất thông báo.
export async function sendReopenedNotificationEmail(request, reason, escalated) {
  const to = request.assignee_email || env.notifyCcEmail;
  if (!to) return { sent: false, reason: 'no_recipient' };
  const { subject, html } = reopenedNotificationEmail({ request, reason, escalated });
  return dispatchEmail({ requestId: request.id, to, subject, html });
}

// Gửi cho người phụ trách (hoặc CC mặc định nếu chưa phân công) khi yêu cầu bị "treo" quá
// lâu ở trạng thái "Đang xử lý".
export async function sendStaleInProgressEmail(request, staleDays) {
  const to = request.assignee_email || env.notifyCcEmail;
  if (!to) return { sent: false, reason: 'no_recipient' };
  const { subject, html } = staleInProgressEmail({ request, staleDays });
  return dispatchEmail({ requestId: request.id, to, subject, html });
}
