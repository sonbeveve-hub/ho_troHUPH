import { escapeHtml } from '../utils/escapeHtml.js';
import {
  requestEmailSubject,
  confirmCta,
  confirmLinkFallback,
  trackingUrl,
  EMAIL_FOOTER,
  emailLayout,
} from './emailShared.js';

export function confirmReminderEmail({ request }) {
  const subject = `[Nhắc nhở] ${requestEmailSubject(request)}`;

  const bodyHtml = `
    <p>Kính gửi thầy/cô <strong>${escapeHtml(request.requester_name)}</strong>,</p>
    <p>Yêu cầu hỗ trợ <strong>${escapeHtml(request.request_code)}</strong> đã được xử lý nhưng Trung tâm chưa nhận được xác nhận từ thầy/cô.</p>
    <p>Bấm nút bên dưới để xác nhận ngay. Nếu chưa hài lòng, xin thầy/cô vào <a href="${escapeHtml(trackingUrl(request))}">trang tra cứu</a> và cho biết lý do, để Trung tâm tiếp tục hỗ trợ.</p>
    ${confirmCta(request)}
    ${confirmLinkFallback(request)}
    <p style="color:#6b7280; font-size:12px; text-align:center;">Nếu vẫn không có phản hồi, hệ thống sẽ tự động đóng yêu cầu này trong vài ngày làm việc tới.</p>
    ${EMAIL_FOOTER}
  `;

  const html = emailLayout({ eyebrow: 'Nhắc nhở', title: 'Vui lòng xác nhận yêu cầu', bodyHtml });

  return { subject, html };
}
