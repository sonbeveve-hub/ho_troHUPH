import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { trigramSimilarity } from './similarity.service.js';

// request đã từng nằm trong BẤT KỲ candidate nào (pending/approved/rejected) — không đề
// xuất lại nhóm đã có ý kiến, kể cả khi quản lý đã từ chối.
function getAlreadyGroupedIds() {
  const rows = db.prepare('SELECT request_ids FROM faq_candidates').all();
  const ids = new Set();
  for (const row of rows) {
    try {
      JSON.parse(row.request_ids).forEach((id) => ids.add(id));
    } catch {
      // bỏ qua dòng dữ liệu hỏng, không chặn cả sweep
    }
  }
  return ids;
}

// Nhóm các request "Hoàn thành" có admin_notes (giải pháp) tương tự nhau — thuật toán đơn
// giản: duyệt tuần tự, request nào similarity >= threshold với PHẦN TỬ ĐẦU của 1 nhóm thì
// vào nhóm đó, không thì mở nhóm mới. Đủ tốt cho quy mô dữ liệu nội bộ (không cần tối ưu).
function groupBySimilarity(rows, threshold) {
  const groups = [];
  for (const row of rows) {
    let placed = false;
    for (const group of groups) {
      if (trigramSimilarity(row.admin_notes, group[0].admin_notes) >= threshold) {
        group.push(row);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([row]);
  }
  return groups;
}

// Job định kỳ: nhóm các yêu cầu Hoàn thành có giải pháp tương tự nhau, tạo 1 faq_candidate
// mới cho mỗi nhóm đủ lớn (>= minGroupSize) chưa từng được đề xuất trước đó. Câu hỏi/trả lời
// gợi ý lấy từ request có admin_notes dài nhất trong nhóm làm bản nháp — quản lý luôn phải
// sửa lại trước khi duyệt (không gọi AI tóm tắt để tránh phát sinh chi phí API định kỳ).
export function runFaqCandidateSweep() {
  const { minGroupSize } = env.faqCandidate;
  const alreadyGrouped = getAlreadyGroupedIds();

  const rows = db
    .prepare(
      `SELECT id, description, admin_notes FROM requests
       WHERE status = 'done' AND admin_notes IS NOT NULL AND trim(admin_notes) != ''`
    )
    .all()
    .filter((r) => !alreadyGrouped.has(r.id));

  const groups = groupBySimilarity(rows, env.duplicateSimilarityThreshold).filter(
    (g) => g.length >= minGroupSize
  );

  const insert = db.prepare(
    `INSERT INTO faq_candidates (request_ids, suggested_question, suggested_answer)
     VALUES (?, ?, ?)`
  );

  let created = 0;
  for (const group of groups) {
    const draft = group.reduce((longest, r) =>
      (r.admin_notes || '').length > (longest.admin_notes || '').length ? r : longest
    );
    insert.run(
      JSON.stringify(group.map((r) => r.id)),
      draft.description,
      draft.admin_notes
    );
    created += 1;
  }
  return { groupsFound: groups.length, created };
}

export function startFaqCandidateSweep() {
  const intervalMs = env.faqCandidate.sweepIntervalHours * 60 * 60 * 1000;
  const run = () => {
    try {
      runFaqCandidateSweep();
    } catch (err) {
      console.error('[faq-candidate-sweep] Lỗi khi nhóm đề xuất FAQ:', err.message);
    }
  };
  // Trễ 2 phút sau khi khởi động (không cạnh tranh tài nguyên với các sweep khác lúc mới
  // chạy), sau đó lặp lại theo chu kỳ cấu hình (mặc định 24h).
  setTimeout(run, 2 * 60 * 1000);
  setInterval(run, intervalMs);
}
