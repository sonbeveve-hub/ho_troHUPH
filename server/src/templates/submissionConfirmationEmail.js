import { escapeHtml } from '../utils/escapeHtml.js';
import { requestEmailSubject, trackingCta, trackingLinkFallback, EMAIL_FOOTER, emailLayout } from './emailShared.js';

export function submissionConfirmationEmail({ request, departmentName, requestTypeName, processingTimeName }) {
  const subject = requestEmailSubject(request);

  const bodyHtml = `
    <p>Kính gửi thầy/cô <strong>${escapeHtml(request.requester_name)}</strong>,</p>
    <p>Trung tâm Tin học đã nhận được yêu cầu hỗ trợ của thầy/cô với mã <strong>${escapeHtml(request.request_code)}</strong>. Chúng tôi sẽ gửi email cập nhật mỗi khi tiến độ xử lý thay đổi.</p>
    <table style="border-collapse: collapse; margin: 12px 0;">
      <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Đơn vị</td><td>${escapeHtml(departmentName || '')}</td></tr>
      <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Loại yêu cầu</td><td>${escapeHtml(requestTypeName || '')}</td></tr>
      <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Thời gian xử lý mong muốn</td><td>Trong vòng ${escapeHtml(processingTimeName || '')} ngày</td></tr>
      <tr><td style="padding: 4px 12px 4px 0; color:#6b7280; vertical-align:top;">Mô tả</td><td>${escapeHtml(request.description)}</td></tr>
    </table>
    ${trackingCta(request, 'Xem tiến độ yêu cầu')}
    ${trackingLinkFallback(request)}
    ${EMAIL_FOOTER}
  `;

  const html = emailLayout({ eyebrow: 'Yêu cầu mới', title: 'Đã tiếp nhận yêu cầu hỗ trợ', bodyHtml });

  return { subject, html };
}
