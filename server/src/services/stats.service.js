import { db } from '../db/index.js';

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
         SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done_count,
         SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count
       FROM requests
       GROUP BY COALESCE(assignee_email, '__unassigned__')
       ORDER BY (assignee_email IS NULL), total DESC`
    )
    .all();
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
