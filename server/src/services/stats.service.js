import * as XLSX from 'xlsx';
import { db } from '../db/index.js';

const STATUS_LABELS = {
  new: 'Mới tiếp nhận',
  in_progress: 'Đang xử lý',
  resolved_pending: 'Đã xử lý - Chờ xác nhận',
  reopened: 'Mở lại',
  done: 'Hoàn thành',
  done_auto: 'Đã đóng (tự động)',
  rejected: 'Từ chối',
};

export function getSummary() {
  const total = db.prepare('SELECT COUNT(*) AS count FROM requests').get().count;

  const byStatus = db
    .prepare('SELECT status, COUNT(*) AS count FROM requests GROUP BY status')
    .all();

  const byDepartment = db
    .prepare(
      `SELECT departments.name AS label, COUNT(*) AS count
       FROM requests LEFT JOIN departments ON departments.id = requests.department_id
       GROUP BY requests.department_id ORDER BY count DESC`
    )
    .all();

  const byRequestType = db
    .prepare(
      `SELECT request_types.name AS label, COUNT(*) AS count
       FROM requests LEFT JOIN request_types ON request_types.id = requests.request_type_id
       GROUP BY requests.request_type_id ORDER BY count DESC`
    )
    .all();

  return { total, byStatus, byDepartment, byRequestType };
}

export function getByAssignee() {
  return db
    .prepare(
      `SELECT
         COALESCE(assignee_name, 'Chưa phân công') AS assignee_name,
         assignee_email,
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS new_count,
         SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_count,
         SUM(CASE WHEN status = 'resolved_pending' THEN 1 ELSE 0 END) AS resolved_pending_count,
         SUM(CASE WHEN status = 'reopened' THEN 1 ELSE 0 END) AS reopened_count,
         SUM(CASE WHEN status IN ('done', 'done_auto') THEN 1 ELSE 0 END) AS done_count,
         SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count
       FROM requests
       GROUP BY COALESCE(assignee_email, '__unassigned__')
       ORDER BY (assignee_email IS NULL), total DESC`
    )
    .all();
}

// Thống kê giai đoạn xác nhận hoàn thành (Resolution & Closure): CSAT, tỷ lệ tự đóng do
// không phản hồi, số lượt bị từ chối/mở lại, và thời gian chờ xác nhận trung bình.
export function getConfirmationStats() {
  const summary = db
    .prepare(
      `SELECT
         SUM(CASE WHEN status = 'resolved_pending' THEN 1 ELSE 0 END) AS pending_count,
         SUM(CASE WHEN status = 'reopened' THEN 1 ELSE 0 END) AS reopened_count,
         SUM(CASE WHEN status = 'done' AND confirmed_by = 'requester' THEN 1 ELSE 0 END) AS confirmed_count,
         SUM(CASE WHEN status = 'done' AND confirmed_by = 'delegate' THEN 1 ELSE 0 END) AS delegate_confirmed_count,
         SUM(CASE WHEN status = 'done_auto' THEN 1 ELSE 0 END) AS auto_closed_count,
         SUM(CASE WHEN escalated_at IS NOT NULL THEN 1 ELSE 0 END) AS escalated_count,
         SUM(CASE WHEN csat_rating IS NOT NULL THEN 1 ELSE 0 END) AS rating_count,
         AVG(csat_rating) AS avg_rating,
         AVG(CASE
           WHEN requester_confirmed_at IS NOT NULL AND resolved_at IS NOT NULL
           THEN (julianday(requester_confirmed_at) - julianday(resolved_at))
         END) AS avg_confirm_wait_days
       FROM requests`
    )
    .get();

  const ratingBreakdown = db
    .prepare(
      `SELECT csat_rating AS rating, COUNT(*) AS count
       FROM requests
       WHERE csat_rating IS NOT NULL
       GROUP BY csat_rating
       ORDER BY csat_rating DESC`
    )
    .all();

  return {
    pendingCount: summary.pending_count || 0,
    reopenedCount: summary.reopened_count || 0,
    confirmedCount: summary.confirmed_count || 0,
    delegateConfirmedCount: summary.delegate_confirmed_count || 0,
    autoClosedCount: summary.auto_closed_count || 0,
    escalatedCount: summary.escalated_count || 0,
    ratingCount: summary.rating_count || 0,
    avgRating: summary.avg_rating || null,
    avgConfirmWaitDays: summary.avg_confirm_wait_days || null,
    ratingBreakdown,
  };
}

export function getAiStats() {
  const summary = db
    .prepare(
      `SELECT
         SUM(CASE WHEN ai_suggestion IS NOT NULL THEN 1 ELSE 0 END) AS total_suggested,
         SUM(CASE WHEN ai_resolved = 1 THEN 1 ELSE 0 END) AS resolved_count,
         SUM(CASE WHEN ai_resolved = 0 THEN 1 ELSE 0 END) AS unresolved_count,
         SUM(CASE WHEN ai_suggestion IS NOT NULL AND ai_resolved IS NULL THEN 1 ELSE 0 END) AS no_feedback_count,
         SUM(CASE WHEN ai_rating IS NOT NULL THEN 1 ELSE 0 END) AS rating_count,
         AVG(ai_rating) AS avg_rating
       FROM requests`
    )
    .get();

  const ratingBreakdown = db
    .prepare(
      `SELECT ai_rating AS rating, COUNT(*) AS count
       FROM requests
       WHERE ai_rating IS NOT NULL
       GROUP BY ai_rating
       ORDER BY ai_rating DESC`
    )
    .all();

  return {
    totalSuggested: summary.total_suggested || 0,
    resolvedCount: summary.resolved_count || 0,
    unresolvedCount: summary.unresolved_count || 0,
    noFeedbackCount: summary.no_feedback_count || 0,
    ratingCount: summary.rating_count || 0,
    avgRating: summary.avg_rating || null,
    ratingBreakdown,
  };
}

export function getTimeseries(days = 30) {
  return db
    .prepare(
      `SELECT date(created_at) AS date, COUNT(*) AS count
       FROM requests
       WHERE created_at >= datetime('now', ?)
       GROUP BY date(created_at)
       ORDER BY date ASC`
    )
    .all(`-${days} days`);
}

// Xuất báo cáo Excel theo yêu cầu (không phải báo cáo tự động định kỳ) — admin bấm nút
// "Xuất Excel" ở trang Tổng quan khi cần, tự chọn tần suất gửi cho ban lãnh đạo.
export function buildStatsWorkbook() {
  const summary = getSummary();

  const overviewRows = [
    ['Tổng số yêu cầu', summary.total],
    [],
    ['Theo trạng thái', ''],
    ...summary.byStatus.map((s) => [STATUS_LABELS[s.status] || s.status, s.count]),
    [],
    ['Theo đơn vị', ''],
    ...summary.byDepartment.map((d) => [d.label || '(chưa rõ)', d.count]),
    [],
    ['Theo loại yêu cầu', ''],
    ...summary.byRequestType.map((t) => [t.label || '(chưa rõ)', t.count]),
  ];
  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewRows);
  overviewSheet['!cols'] = [{ wch: 40 }, { wch: 12 }];

  const requests = db
    .prepare(
      `SELECT requests.request_code, requests.requester_name, requests.requester_email,
              departments.name AS department_name, request_types.name AS request_type_name,
              priorities.name AS priority_name, requests.status,
              requests.assignee_name, requests.assignee_email,
              requests.csat_rating, requests.reject_count,
              requests.created_at, requests.updated_at
       FROM requests
       LEFT JOIN departments ON departments.id = requests.department_id
       LEFT JOIN request_types ON request_types.id = requests.request_type_id
       LEFT JOIN priorities ON priorities.id = requests.priority_id
       ORDER BY requests.created_at DESC`
    )
    .all();

  const listRows = [
    [
      'Mã yêu cầu', 'Người gửi', 'Email', 'Đơn vị', 'Loại yêu cầu', 'Mức độ ưu tiên',
      'Trạng thái', 'Người phụ trách', 'Email người phụ trách', 'Điểm CSAT', 'Số lần từ chối',
      'Thời gian gửi', 'Cập nhật gần nhất',
    ],
    ...requests.map((r) => [
      r.request_code,
      r.requester_name,
      r.requester_email,
      r.department_name || '',
      r.request_type_name || '',
      r.priority_name || '',
      STATUS_LABELS[r.status] || r.status,
      r.assignee_name || '',
      r.assignee_email || '',
      r.csat_rating || '',
      r.reject_count || 0,
      r.created_at,
      r.updated_at,
    ]),
  ];
  const listSheet = XLSX.utils.aoa_to_sheet(listRows);
  listSheet['!cols'] = [
    { wch: 12 }, { wch: 22 }, { wch: 24 }, { wch: 28 }, { wch: 24 }, { wch: 14 },
    { wch: 20 }, { wch: 20 }, { wch: 24 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Tổng quan');
  XLSX.utils.book_append_sheet(workbook, listSheet, 'Danh sách yêu cầu');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
