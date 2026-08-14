import { escapeHtml } from '../utils/escapeHtml.js';
import { requestEmailSubject, trackingCta, trackingLinkFallback, EMAIL_FOOTER, emailLayout } from './emailShared.js';

export function autoClosedEmail({ request }) {
  const subject = requestEmailSubject(request);

  const bodyHtml = `
    <p>Kính gửi thầy/cô <strong>${escapeHtml(request.requester_name)}</strong>,</p>
    <p>Yêu cầu hỗ trợ <strong>${escapeHtml(request.request_code)}</strong> đã được Trung tâm xử lý xong nhưng không nhận được phản hồi xác nhận trong thời hạn quy định, nên hệ thống đã tự động đóng yêu cầu này.</p>
    <p>Nếu vấn đề thực tế chưa được khắc phục, xin thầy/cô vui lòng gửi một yêu cầu hỗ trợ mới hoặc liên hệ trực tiếp với Trung tâm.</p>
    ${trackingCta(request, 'Xem chi tiết yêu cầu')}
    ${trackingLinkFallback(request)}
    ${EMAIL_FOOTER}
  `;

  const html = emailLayout({ eyebrow: 'Đã đóng tự động', title: 'Yêu cầu đã được đóng', bodyHtml });

  return { subject, html };
}
