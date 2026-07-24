import { db } from '../db/index.js';
import { normalizeText } from '../utils/normalizeText.js';

export function lookupStaff({ name }) {
  const normalized = normalizeText(name);
  if (!normalized || normalized.length < 2) return [];

  const query = `
    SELECT staff.id, staff.name, staff.email, staff.department_id,
           departments.name AS department_name
    FROM staff
    LEFT JOIN departments ON departments.id = staff.department_id
    WHERE staff.normalized_name LIKE ?
    ORDER BY staff.name LIMIT 20
  `;

  return db.prepare(query).all(`%${normalized}%`);
}
