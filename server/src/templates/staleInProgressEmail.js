import { escapeHtml } from '../utils/escapeHtml.js';
import { requestEmailSubject, trackingLinkHtml } from './emailShared.js';

// Email nội bộ gửi cho người phụ trách (không phải người gửi yêu cầu) khi yêu cầu đã ở
// trạng thái "Đang xử lý" quá lâu mà chưa có cập nhật gì — nhắc để tránh bị treo/quên.
export function staleInProgressEmail({ request, staleDays }) {
  const subject = `[Nhắc nhở] ${requestEmailSubject(request)}`;

  const html = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1f2937; line-height: 1.6;">
      <p>Yêu cầu hỗ trợ <strong>${escapeHtml(request.request_code)}</strong> (${escapeHtml(request.requester_name)}) đã ở trạng thái "Đang xử lý" hơn ${staleDays} ngày mà chưa có cập nhật mới.</p>
      <p>Vui lòng kiểm tra tiến độ và cập nhật trạng thái trên hệ thống (đánh dấu "Đã xử lý" khi hoàn tất, hoặc ghi chú tiến độ hiện tại).</p>
      ${trackingLinkHtml(request)}
      <p style="color:#6b7280; font-size:12px;">Đây là email tự động, vui lòng không trả lời trực tiếp email này.</p>
    </div>
  `;

  return { subject, html };
}
