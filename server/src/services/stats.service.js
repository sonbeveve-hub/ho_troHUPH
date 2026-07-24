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
