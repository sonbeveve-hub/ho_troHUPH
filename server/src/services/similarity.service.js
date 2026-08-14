import { db } from '../db/index.js';
import { normalizeText } from '../utils/normalizeText.js';

// Tập trigram (3-gram ký tự liên tiếp) của 1 chuỗi, sau khi chuẩn hoá (bỏ dấu, hạ thường)
// để so khớp không phân biệt dấu/hoa-thường — cùng cách PostgreSQL pg_trgm dùng nội bộ.
function trigrams(text) {
  const s = ` ${normalizeText(text)} `; // đệm khoảng trắng để bắt trigram ở đầu/cuối từ
  const set = new Set();
  for (let i = 0; i < s.length - 2; i += 1) {
    set.add(s.slice(i, i + 3));
  }
  return set;
}

// Độ tương đồng Dice coefficient trên tập trigram: 2*|giao| / (|A|+|B|) — cùng công thức
// hàm similarity() của pg_trgm, chỉ khác chạy bằng JS thuần thay vì extension Postgres.
export function trigramSimilarity(a, b) {
  const setA = trigrams(a || '');
  const setB = trigrams(b || '');
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection += 1;
  }
  return (2 * intersection) / (setA.size + setB.size);
}

// Tìm request có nội dung mô tả giống nhất với description, trong số các request đang ở 1
// trong các statuses chỉ định, tạo trong windowDays gần đây. Trả về { id, request_code,
// similarity } của request giống nhất nếu vượt threshold, hoặc null nếu không có.
export function findMostSimilarRequest(description, { statuses, windowDays, threshold, excludeId = null }) {
  const placeholders = statuses.map(() => '?').join(',');
  const candidates = db
    .prepare(
      `SELECT id, request_code, description FROM requests
       WHERE status IN (${placeholders})
         AND created_at >= datetime('now', ?)
         ${excludeId ? 'AND id != ?' : ''}`
    )
    .all(...statuses, `-${windowDays} days`, ...(excludeId ? [excludeId] : []));

  let best = null;
  for (const candidate of candidates) {
    const score = trigramSimilarity(description, candidate.description);
    if (score >= threshold && (!best || score > best.similarity)) {
      best = { id: candidate.id, request_code: candidate.request_code, similarity: score };
    }
  }
  return best;
}
