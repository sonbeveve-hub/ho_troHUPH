import { escapeHtml } from '../utils/escapeHtml.js';
import { EMAIL_FOOTER, emailLayout } from './emailShared.js';

const STATUS_LABELS = {
  new: 'Mới tiếp nhận',
  in_progress: 'Đang xử lý',
  resolved_pending: 'Đã xử lý - Chờ xác nhận',
  reopened: 'Mở lại',
  done: 'Hoàn thành',
  done_auto: 'Đã đóng (tự động)',
  rejected: 'Từ chối',
};

// Báo cáo tổng quan định kỳ gửi mùng 2 hằng tháng, kèm file Excel đầy đủ (giống hệt file tải
// từ nút "Xuất Excel" ở trang Tổng quan) — phần thân email chỉ tóm tắt vài số liệu chính để
// đọc nhanh mà không cần mở file đính kèm.
export function monthlyReportEmail({ summary, yearMonth }) {
  const subject = `[Báo cáo tháng ${yearMonth}] Tổng quan Cổng tiếp nhận hỗ trợ IT`;

  const statusRows = summary.byStatus
    .map(
      (s) =>
        `<tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">${escapeHtml(STATUS_LABELS[s.status] || s.status)}</td><td>${s.count}</td></tr>`
    )
    .join('');

  const bodyHtml = `
    <p>Kính gửi,</p>
    <p>Đây là báo cáo tổng quan định kỳ hằng tháng của Cổng tiếp nhận hỗ trợ IT, tính đến thời điểm gửi email này. File Excel đầy đủ (danh sách toàn bộ yêu cầu) được đính kèm.</p>
    <table style="border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;"><strong>Tổng số yêu cầu</strong></td><td><strong>${summary.total}</strong></td></tr>
      ${statusRows}
    </table>
    <p style="color:#6b7280; font-size:12px;">Đây là email tự động gửi vào đầu mỗi tháng, vui lòng không trả lời trực tiếp email này.</p>
    ${EMAIL_FOOTER}
  `;

  const html = emailLayout({ eyebrow: 'Báo cáo định kỳ', title: `Tổng quan hệ thống — Tháng ${yearMonth}`, bodyHtml });

  return { subject, html };
}
