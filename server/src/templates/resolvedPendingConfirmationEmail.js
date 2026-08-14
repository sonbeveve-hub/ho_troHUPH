import { escapeHtml } from '../utils/escapeHtml.js';
import {
  requestEmailSubject,
  confirmRejectButtons,
  confirmLinkFallback,
  EMAIL_FOOTER,
  emailLayout,
} from './emailShared.js';

export function resolvedPendingConfirmationEmail({ request, note }) {
  const subject = requestEmailSubject(request);

  const bodyHtml = `
    <p>Kính gửi thầy/cô <strong>${escapeHtml(request.requester_name)}</strong>,</p>
    <p>Yêu cầu hỗ trợ <strong>${escapeHtml(request.request_code)}</strong> của thầy/cô vừa được xử lý xong. Vui lòng cho biết vấn đề đã được khắc phục chưa để Trung tâm ghi nhận.</p>
    ${note ? `<table style="border-collapse: collapse; margin: 12px 0;"><tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Giải pháp/ghi chú</td><td>${escapeHtml(note)}</td></tr></table>` : ''}
    ${confirmRejectButtons(request)}
    ${confirmLinkFallback(request)}
    <p style="color:#6b7280; font-size:12px; text-align:center;">Nếu sau vài ngày làm việc không nhận được phản hồi, hệ thống sẽ tự động nhắc lại và cuối cùng tự đóng yêu cầu.</p>
    ${EMAIL_FOOTER}
  `;

  const html = emailLayout({ eyebrow: 'Cần xác nhận', title: 'Yêu cầu đã được xử lý xong', bodyHtml });

  return { subject, html };
}
