import { escapeHtml } from '../utils/escapeHtml.js';
import { requestEmailSubject, trackingLinkHtml } from './emailShared.js';

const FOOTER = `
  <p>Trân trọng.<br/>TTTH - Phòng KT&amp;BĐCL.</p>
  <p style="color:#6b7280; font-size:12px;">Đây là email tự động, vui lòng không trả lời trực tiếp email này.</p>
`;

export function confirmReminderEmail({ request }) {
  const subject = `[Nhắc nhở] ${requestEmailSubject(request)}`;

  const html = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1f2937; line-height: 1.6;">
      <p>Kính gửi thầy/cô <strong>${escapeHtml(request.requester_name)}</strong>,</p>
      <p>Yêu cầu hỗ trợ <strong>${escapeHtml(request.request_code)}</strong> đã được xử lý nhưng Trung tâm chưa nhận được xác nhận từ thầy/cô.</p>
      <p>Xin thầy/cô dành chút thời gian xác nhận (hoặc cho biết nếu chưa hài lòng) tại trang tra cứu bên dưới, để Trung tâm có thể đóng yêu cầu hoặc tiếp tục hỗ trợ nếu cần.</p>
      ${trackingLinkHtml(request)}
      <p style="color:#6b7280; font-size:12px;">Nếu vẫn không có phản hồi, hệ thống sẽ tự động đóng yêu cầu này trong vài ngày tới.</p>
      ${FOOTER}
    </div>
  `;

  return { subject, html };
}
