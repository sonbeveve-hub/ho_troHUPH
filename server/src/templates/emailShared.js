import { escapeHtml } from '../utils/escapeHtml.js';
import { env } from '../config/env.js';

// Chủ đề (subject) dùng chung cho mọi email liên quan tới 1 yêu cầu, để mail client
// (Gmail, Outlook...) gom tất cả email của cùng 1 yêu cầu vào chung 1 luồng hội thoại.
export function requestEmailSubject(request) {
  return `[${request.request_code}] Yêu cầu hỗ trợ - ${request.requester_name}`;
}

export function trackingUrl(request) {
  return `${env.appUrl}/tra-cuu/${request.request_code}`;
}

// 'default' (xanh thương hiệu) cho các email thông thường, 'urgent' (đỏ) để làm nổi bật các
// email cần chú ý gấp (ví dụ yêu cầu bị từ chối nhiều lần). Không dùng ảnh PNG dựng sẵn cho
// phần hero như cách làm thủ công trong Gmail Templates — vì đây là email HTML thật gửi qua
// SMTP (không bị giới hạn CSS như khung soạn thư Gmail), nên banner CSS/table hiển thị ngay
// lập tức, không phụ thuộc việc mail client có tải ảnh ngoài hay không (Gmail/Outlook mặc
// định chặn ảnh ngoài ở lần xem đầu).
const TONE = {
  default: { gradient: 'linear-gradient(135deg, #3FAE7C 0%, #1B7A4D 100%)', solid: '#1B7A4D', icon: '🖥️' },
  urgent: { gradient: 'linear-gradient(135deg, #F87171 0%, #B91C1C 100%)', solid: '#B91C1C', icon: '⚠️' },
};

function emailHero({ eyebrow, title, tone }) {
  const t = TONE[tone] || TONE.default;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${t.gradient}; background-color:${t.solid};">
      <tr>
        <td style="padding: 32px 32px 26px; text-align: center;">
          <div style="display:inline-block; width:48px; height:48px; line-height:48px; border-radius:14px; background-color:rgba(255,255,255,0.18); font-size:22px; margin-bottom:14px;">${t.icon}</div>
          <p style="margin:0 0 6px; color:rgba(255,255,255,0.85); font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; font-family:Arial,sans-serif;">${escapeHtml(eyebrow)}</p>
          <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700; line-height:1.35; font-family:Arial,sans-serif;">${escapeHtml(title)}</h1>
        </td>
      </tr>
    </table>
  `;
}

// Nút CTA "bulletproof" kiểu email: dùng table + thuộc tính bgcolor/align (không chỉ CSS) để
// Outlook desktop (dùng engine Word, bỏ qua nhiều CSS hiện đại) vẫn hiển thị đúng màu nền và
// canh giữa, thay vì chỉ còn lại chữ link trơn.
export function ctaButton(url, label, tone = 'default') {
  const t = TONE[tone] || TONE.default;
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin: 22px auto;">
      <tr>
        <td align="center" bgcolor="${t.solid}" style="border-radius:10px; background-color:${t.solid};">
          <a href="${escapeHtml(url)}" target="_blank" style="display:inline-block; padding:13px 30px; font-family:Arial,sans-serif; font-size:14px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:10px;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>
  `;
}

export function trackingCta(request, label = 'Xem chi tiết yêu cầu', tone = 'default') {
  return ctaButton(trackingUrl(request), label, tone);
}

// Liên kết dạng chữ đặt dưới nút CTA — dự phòng cho trường hợp nút không hiển thị được (một
// số mail client cũ), và để người dùng có thể dán thẳng URL nếu cần.
export function trackingLinkFallback(request) {
  const url = trackingUrl(request);
  return `<p style="text-align:center; color:#9CA3AF; font-size:12px; margin:2px 0 0; font-family:Arial,sans-serif;">Hoặc dán liên kết này vào trình duyệt:<br/><a href="${escapeHtml(url)}" style="color:#6B7280;">${escapeHtml(url)}</a></p>`;
}

export const EMAIL_FOOTER = `
  <p style="margin: 24px 0 4px;">Trân trọng.<br/>TTTH - Phòng KT&amp;BĐCL.</p>
  <p style="color:#9CA3AF; font-size:12px; margin:0;">Đây là email tự động, vui lòng không trả lời trực tiếp email này.</p>
`;

// Khung chung cho mọi email: banner hero màu thương hiệu ở đầu (icon + nhãn ngắn + tiêu đề),
// thân nội dung trong khối bo góc trắng, canh giữa 600px — thay cho div đơn giản trước đây.
export function emailLayout({ eyebrow, title, tone = 'default', bodyHtml }) {
  return `
    <div style="background-color:#F3F4F6; padding: 28px 12px; font-family: Arial, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:0 auto; background-color:#ffffff; border-radius:16px; border:1px solid #E5E7EB;">
        <tr><td style="border-radius:16px 16px 0 0; overflow:hidden;">${emailHero({ eyebrow, title, tone })}</td></tr>
        <tr><td style="padding: 28px 32px 32px; font-size:14px; color:#1f2937; line-height:1.6;">${bodyHtml}</td></tr>
      </table>
      <p style="text-align:center; color:#9CA3AF; font-size:11px; margin:16px 0 0; font-family:Arial,sans-serif;">Trung tâm Tin học — hotrohuph.site</p>
    </div>
  `;
}
