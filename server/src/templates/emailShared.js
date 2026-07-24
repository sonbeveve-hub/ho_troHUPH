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

export function trackingLinkHtml(request) {
  const url = trackingUrl(request);
  return `<p>Xem chi tiết và tiến độ xử lý tại: <a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`;
}
