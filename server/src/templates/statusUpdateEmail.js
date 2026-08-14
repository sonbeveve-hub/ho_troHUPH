import { escapeHtml } from '../utils/escapeHtml.js';
import { requestEmailSubject, trackingCta, trackingLinkFallback, EMAIL_FOOTER, emailLayout } from './emailShared.js';

const STATUS_LABELS = {
  new: 'Mới tiếp nhận',
  in_progress: 'Đang xử lý',
  resolved_pending: 'Đã xử lý - Chờ xác nhận',
  reopened: 'Mở lại',
  done: 'Hoàn thành',
  done_auto: 'Đã đóng (tự động)',
  rejected: 'Từ chối',
};

export function statusUpdateEmail({ request, newStatus, note }) {
  const statusLabel = STATUS_LABELS[newStatus] || newStatus;
  const subject = requestEmailSubject(request);

  const bodyHtml = `
    <p>Kính gửi thầy/cô <strong>${escapeHtml(request.requester_name)}</strong>,</p>
    <p>Yêu cầu hỗ trợ <strong>${escapeHtml(request.request_code)}</strong> của thầy/cô vừa được cập nhật:</p>
    <table style="border-collapse: collapse; margin: 12px 0;">
      <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Trạng thái mới</td><td><strong>${escapeHtml(statusLabel)}</strong></td></tr>
      ${note ? `<tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Ghi chú</td><td>${escapeHtml(note)}</td></tr>` : ''}
    </table>
    ${trackingCta(request, 'Xem chi tiết yêu cầu')}
    ${trackingLinkFallback(request)}
    ${EMAIL_FOOTER}
  `;

  const html = emailLayout({ eyebrow: 'Cập nhật trạng thái', title: `Cập nhật: ${statusLabel}`, bodyHtml });

  return { subject, html };
}
