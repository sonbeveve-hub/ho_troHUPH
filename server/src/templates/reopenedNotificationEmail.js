import { escapeHtml } from '../utils/escapeHtml.js';
import { requestEmailSubject, trackingCta, trackingLinkFallback, emailLayout } from './emailShared.js';

// Email nội bộ gửi cho người phụ trách (không phải người gửi yêu cầu) khi người gửi
// từ chối kết quả xử lý và yêu cầu được mở lại.
export function reopenedNotificationEmail({ request, reason, escalated }) {
  const subject = `${escalated ? '[CẦN CHÚ Ý] ' : ''}[Bị từ chối - Mở lại] ${requestEmailSubject(request)}`;
  const tone = escalated ? 'urgent' : 'default';

  const bodyHtml = `
    <p>Yêu cầu hỗ trợ <strong>${escapeHtml(request.request_code)}</strong> (${escapeHtml(request.requester_name)}) vừa bị người gửi từ chối kết quả xử lý và đã được mở lại.</p>
    <table style="border-collapse: collapse; margin: 12px 0;">
      <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Lý do từ chối</td><td>${escapeHtml(reason)}</td></tr>
      <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Số lần bị từ chối</td><td>${request.reject_count}</td></tr>
    </table>
    ${escalated ? '<p style="color:#b91c1c; font-weight:bold;">Yêu cầu này đã bị từ chối nhiều lần — cần được quản lý/trưởng nhóm IT chú ý và xử lý ưu tiên.</p>' : ''}
    <p>Vui lòng kiểm tra lại và tiếp tục xử lý.</p>
    ${trackingCta(request, 'Xử lý ngay', tone)}
    ${trackingLinkFallback(request)}
    <p style="color:#6b7280; font-size:12px;">Đây là email tự động, vui lòng không trả lời trực tiếp email này.</p>
  `;

  const html = emailLayout({
    eyebrow: escalated ? 'Cần chú ý' : 'Bị từ chối',
    title: 'Yêu cầu đã được mở lại',
    tone,
    bodyHtml,
  });

  return { subject, html };
}
