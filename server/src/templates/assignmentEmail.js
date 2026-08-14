import { escapeHtml } from '../utils/escapeHtml.js';
import { requestEmailSubject, trackingCta, trackingLinkFallback, EMAIL_FOOTER, emailLayout } from './emailShared.js';

export function assignmentEmailForRequester({ request }) {
  const subject = requestEmailSubject(request);

  const bodyHtml = `
    <p>Kính gửi thầy/cô <strong>${escapeHtml(request.requester_name)}</strong>,</p>
    <p>Yêu cầu hỗ trợ <strong>${escapeHtml(request.request_code)}</strong> của thầy/cô đã được phân công cho:</p>
    <table style="border-collapse: collapse; margin: 12px 0;">
      <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Người phụ trách</td><td><strong>${escapeHtml(request.assignee_name)}</strong></td></tr>
      <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Email</td><td>${escapeHtml(request.assignee_email)}</td></tr>
      ${request.assignee_phone ? `<tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Điện thoại</td><td>${escapeHtml(request.assignee_phone)}</td></tr>` : ''}
    </table>
    <p>Thầy/cô có thể liên hệ trực tiếp theo thông tin trên nếu cần trao đổi thêm.</p>
    ${trackingCta(request, 'Xem chi tiết yêu cầu')}
    ${trackingLinkFallback(request)}
    ${EMAIL_FOOTER}
  `;

  const html = emailLayout({ eyebrow: 'Đã phân công', title: 'Yêu cầu đã có người phụ trách', bodyHtml });

  return { subject, html };
}
