import { escapeHtml } from '../utils/escapeHtml.js';

const FOOTER = `
  <p>Trân trọng.<br/>TTTH - Phòng KT&amp;BĐCL.</p>
  <p style="color:#6b7280; font-size:12px;">Đây là email tự động, vui lòng không trả lời trực tiếp email này.</p>
`;

export function assignmentEmailForAssignee({ request, departmentName, requestTypeName, processingTimeName }) {
  const subject = `[${request.request_code}] Bạn được phân công xử lý yêu cầu hỗ trợ`;

  const html = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1f2937; line-height: 1.6;">
      <p>Kính gửi <strong>${escapeHtml(request.assignee_name)}</strong>,</p>
      <p>Anh/chị vừa được phân công xử lý yêu cầu hỗ trợ <strong>${escapeHtml(request.request_code)}</strong>:</p>
      <table style="border-collapse: collapse; margin: 12px 0;">
        <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Người gửi</td><td>${escapeHtml(request.requester_name)} (${escapeHtml(request.requester_email)})</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Đơn vị</td><td>${escapeHtml(departmentName || '')}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Loại yêu cầu</td><td>${escapeHtml(requestTypeName || '')}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Thời gian xử lý mong muốn</td><td>Trong vòng ${escapeHtml(processingTimeName || '')} ngày</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color:#6b7280; vertical-align:top;">Mô tả</td><td>${escapeHtml(request.description)}</td></tr>
      </table>
      <p>Vui lòng liên hệ trực tiếp với người gửi để hỗ trợ xử lý.</p>
      ${FOOTER}
    </div>
  `;

  return { subject, html };
}

export function assignmentEmailForRequester({ request }) {
  const subject = `[${request.request_code}] Yêu cầu hỗ trợ của thầy/cô đã được phân công xử lý`;

  const html = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1f2937; line-height: 1.6;">
      <p>Kính gửi thầy/cô <strong>${escapeHtml(request.requester_name)}</strong>,</p>
      <p>Yêu cầu hỗ trợ <strong>${escapeHtml(request.request_code)}</strong> của thầy/cô đã được phân công cho:</p>
      <table style="border-collapse: collapse; margin: 12px 0;">
        <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Người phụ trách</td><td><strong>${escapeHtml(request.assignee_name)}</strong></td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Email</td><td>${escapeHtml(request.assignee_email)}</td></tr>
        ${request.assignee_phone ? `<tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Điện thoại</td><td>${escapeHtml(request.assignee_phone)}</td></tr>` : ''}
      </table>
      <p>Thầy/cô có thể liên hệ trực tiếp theo thông tin trên nếu cần trao đổi thêm.</p>
      ${FOOTER}
    </div>
  `;

  return { subject, html };
}
