import { escapeHtml } from '../utils/escapeHtml.js';
import { requestEmailSubject, trackingLinkHtml } from './emailShared.js';

const FOOTER = `
  <p>Trân trọng.<br/>TTTH - Phòng KT&amp;BĐCL.</p>
  <p style="color:#6b7280; font-size:12px;">Đây là email tự động, vui lòng không trả lời trực tiếp email này.</p>
`;

export function resolvedPendingConfirmationEmail({ request, note }) {
  const subject = requestEmailSubject(request);

  const html = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1f2937; line-height: 1.6;">
      <p>Kính gửi thầy/cô <strong>${escapeHtml(request.requester_name)}</strong>,</p>
      <p>Yêu cầu hỗ trợ <strong>${escapeHtml(request.request_code)}</strong> của thầy/cô vừa được xử lý xong. Vui lòng xác nhận để Trung tâm ghi nhận và đóng yêu cầu.</p>
      ${note ? `<table style="border-collapse: collapse; margin: 12px 0;"><tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Giải pháp/ghi chú</td><td>${escapeHtml(note)}</td></tr></table>` : ''}
      <p>Nếu vấn đề đã được khắc phục, xin thầy/cô xác nhận tại trang tra cứu bên dưới. Nếu chưa hài lòng với kết quả xử lý, thầy/cô cũng có thể chọn "Chưa hài lòng" và cho biết lý do để Trung tâm tiếp tục xử lý.</p>
      ${trackingLinkHtml(request)}
      <p style="color:#6b7280; font-size:12px;">Nếu sau vài ngày không nhận được phản hồi, hệ thống sẽ tự động nhắc lại và cuối cùng tự đóng yêu cầu.</p>
      ${FOOTER}
    </div>
  `;

  return { subject, html };
}
