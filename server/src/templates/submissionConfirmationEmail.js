import { escapeHtml } from '../utils/escapeHtml.js';

const PRIORITY_LABELS = {
  gap: 'Gấp',
  binh_thuong: 'Bình thường',
  khong_gap: 'Không gấp',
};

export function submissionConfirmationEmail({ request, departmentName, requestTypeName }) {
  const subject = `[${request.request_code}] Đã nhận yêu cầu hỗ trợ của bạn`;

  const html = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1f2937; line-height: 1.6;">
      <p>Xin chào <strong>${escapeHtml(request.requester_name)}</strong>,</p>
      <p>Chúng tôi đã nhận được yêu cầu hỗ trợ của bạn với mã <strong>${escapeHtml(request.request_code)}</strong>. Chúng tôi sẽ gửi email cập nhật mỗi khi tiến độ xử lý thay đổi.</p>
      <table style="border-collapse: collapse; margin: 12px 0;">
        <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Đơn vị</td><td>${escapeHtml(departmentName || '')}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Loại yêu cầu</td><td>${escapeHtml(requestTypeName || '')}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Mức độ ưu tiên</td><td>${escapeHtml(PRIORITY_LABELS[request.priority] || request.priority)}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color:#6b7280; vertical-align:top;">Mô tả</td><td>${escapeHtml(request.description)}</td></tr>
      </table>
      <p style="color:#6b7280; font-size:12px;">Đây là email tự động, vui lòng không trả lời trực tiếp email này.</p>
    </div>
  `;

  return { subject, html };
}
