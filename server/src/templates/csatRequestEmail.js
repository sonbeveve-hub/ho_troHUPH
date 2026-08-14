import { escapeHtml } from '../utils/escapeHtml.js';
import { requestEmailSubject, csatStarsBlock, EMAIL_FOOTER, emailLayout } from './emailShared.js';

// Gửi khi yêu cầu đã đóng (xác nhận 1 chạm, xác nhận thay, hoặc tự động đóng) mà chưa có
// đánh giá hài lòng — mời đánh giá riêng, tách khỏi bước xác nhận để không bắt buộc chọn sao
// ngay lúc bấm nút xác nhận trong email.
export function csatRequestEmail({ request }) {
  const subject = `[Đánh giá] ${requestEmailSubject(request)}`;

  const bodyHtml = `
    <p>Kính gửi thầy/cô <strong>${escapeHtml(request.requester_name)}</strong>,</p>
    <p>Yêu cầu hỗ trợ <strong>${escapeHtml(request.request_code)}</strong> của thầy/cô đã hoàn thành. Trung tâm rất mong nhận được đánh giá của thầy/cô về chất lượng hỗ trợ để cải thiện dịch vụ tốt hơn.</p>
    ${csatStarsBlock(request)}
    <p style="color:#6b7280; font-size:12px; text-align:center;">Chỉ cần bấm vào mức đánh giá phù hợp — không cần đăng nhập hay điền thêm thông tin.</p>
    ${EMAIL_FOOTER}
  `;

  const html = emailLayout({ eyebrow: 'Hoàn thành', title: 'Đánh giá trải nghiệm hỗ trợ', bodyHtml });

  return { subject, html };
}
