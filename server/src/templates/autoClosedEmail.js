import { escapeHtml } from '../utils/escapeHtml.js';
import { requestEmailSubject, trackingLinkHtml } from './emailShared.js';

const FOOTER = `
  <p>Trân trọng.<br/>TTTH - Phòng KT&amp;BĐCL.</p>
  <p style="color:#6b7280; font-size:12px;">Đây là email tự động, vui lòng không trả lời trực tiếp email này.</p>
`;

export function autoClosedEmail({ request }) {
  const subject = requestEmailSubject(request);

  const html = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1f2937; line-height: 1.6;">
      <p>Kính gửi thầy/cô <strong>${escapeHtml(request.requester_name)}</strong>,</p>
      <p>Yêu cầu hỗ trợ <strong>${escapeHtml(request.request_code)}</strong> đã được Trung tâm xử lý xong nhưng không nhận được phản hồi xác nhận trong thời hạn quy định, nên hệ thống đã tự động đóng yêu cầu này.</p>
      <p>Nếu vấn đề thực tế chưa được khắc phục, xin thầy/cô vui lòng gửi một yêu cầu hỗ trợ mới hoặc liên hệ trực tiếp với Trung tâm.</p>
      ${trackingLinkHtml(request)}
      ${FOOTER}
    </div>
  `;

  return { subject, html };
}
