import { escapeHtml } from '../utils/escapeHtml.js';
import { requestEmailSubject, trackingCta, trackingLinkFallback, emailLayout } from './emailShared.js';

// Email nội bộ gửi cho người phụ trách (không phải người gửi yêu cầu) khi yêu cầu đã ở
// trạng thái "Đang xử lý" quá lâu mà chưa có cập nhật gì — nhắc để tránh bị treo/quên.
export function staleInProgressEmail({ request, staleDays }) {
  const subject = `[Nhắc nhở] ${requestEmailSubject(request)}`;

  const bodyHtml = `
    <p>Yêu cầu hỗ trợ <strong>${escapeHtml(request.request_code)}</strong> (${escapeHtml(request.requester_name)}) đã ở trạng thái "Đang xử lý" hơn ${staleDays} ngày mà chưa có cập nhật mới.</p>
    <p>Vui lòng kiểm tra tiến độ và cập nhật trạng thái trên hệ thống (đánh dấu "Đã xử lý" khi hoàn tất, hoặc ghi chú tiến độ hiện tại).</p>
    ${trackingCta(request, 'Cập nhật tiến độ')}
    ${trackingLinkFallback(request)}
    <p style="color:#6b7280; font-size:12px;">Đây là email tự động, vui lòng không trả lời trực tiếp email này.</p>
  `;

  const html = emailLayout({ eyebrow: 'Nhắc nhở', title: 'Yêu cầu đang xử lý quá lâu', bodyHtml });

  return { subject, html };
}
