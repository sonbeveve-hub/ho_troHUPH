const STATUS_LABELS = {
  new: 'Mới tiếp nhận',
  in_progress: 'Đang xử lý',
  done: 'Hoàn thành',
  rejected: 'Từ chối',
};

export function statusUpdateEmail({ request, newStatus, note }) {
  const statusLabel = STATUS_LABELS[newStatus] || newStatus;
  const subject = `[${request.request_code}] Cập nhật tiến độ yêu cầu hỗ trợ: ${statusLabel}`;

  const html = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1f2937; line-height: 1.6;">
      <p>Xin chào <strong>${escapeHtml(request.requester_name)}</strong>,</p>
      <p>Yêu cầu hỗ trợ <strong>${escapeHtml(request.request_code)}</strong> của bạn vừa được cập nhật:</p>
      <table style="border-collapse: collapse; margin: 12px 0;">
        <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Trạng thái mới</td><td><strong>${escapeHtml(statusLabel)}</strong></td></tr>
        ${note ? `<tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Ghi chú</td><td>${escapeHtml(note)}</td></tr>` : ''}
      </table>
      <p style="color:#6b7280; font-size:12px;">Đây là email tự động, vui lòng không trả lời trực tiếp email này.</p>
    </div>
  `;

  return { subject, html };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
