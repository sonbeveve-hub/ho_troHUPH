import * as XLSX from 'xlsx';
import { db } from '../db/index.js';
import { normalizeText } from '../utils/normalizeText.js';

function parseWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

// Tìm giá trị cột theo nhiều tên biến thể có thể có trong file Excel (không phân biệt hoa/thường, dấu)
function pickColumn(row, aliases) {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const aliasNorm = normalizeText(alias);
    const key = keys.find((k) => normalizeText(k) === aliasNorm);
    if (key !== undefined) return String(row[key]).trim();
  }
  return '';
}

function nextSortOrder(table) {
  return db.prepare(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM ${table}`).get().next;
}

function resolveDepartmentId(departmentName) {
  if (!departmentName) return null;
  const existing = db
    .prepare('SELECT id FROM departments WHERE name = ? COLLATE NOCASE')
    .get(departmentName);
  if (existing) return existing.id;
  const info = db
    .prepare('INSERT INTO departments (name, sort_order) VALUES (?, ?)')
    .run(departmentName, nextSortOrder('departments'));
  return info.lastInsertRowid;
}

export function importStaffFromExcel(buffer) {
  const rows = parseWorkbook(buffer);
  const result = { inserted: 0, updated: 0, errors: [] };

  const findByEmail = db.prepare('SELECT id FROM staff WHERE email = ? AND email != \'\'');
  const findByNameDept = db.prepare(
    'SELECT id FROM staff WHERE normalized_name = ? AND department_id IS ?'
  );
  const insertStaff = db.prepare(
    `INSERT INTO staff (name, normalized_name, email, department_id) VALUES (?, ?, ?, ?)`
  );
  const updateStaff = db.prepare(
    `UPDATE staff SET name = ?, normalized_name = ?, email = ?, department_id = ?, updated_at = datetime('now') WHERE id = ?`
  );

  const run = db.transaction(() => {
    rows.forEach((row, index) => {
      const name = pickColumn(row, ['Họ tên', 'Ho ten', 'Tên', 'Ten', 'Name', 'Họ và tên']);
      const email = pickColumn(row, ['Email', 'Mail', 'Địa chỉ email']);
      const departmentName = pickColumn(row, [
        'Khoa/phòng/đơn vị',
        'Khoa phong don vi',
        'Phòng ban',
        'Đơn vị',
        'Department',
      ]);

      if (!name) {
        result.errors.push({ row: index + 2, reason: 'Thiếu tên' });
        return;
      }

      const normalizedName = normalizeText(name);
      const departmentId = resolveDepartmentId(departmentName);

      let existing = null;
      if (email) existing = findByEmail.get(email);
      if (!existing) existing = findByNameDept.get(normalizedName, departmentId);

      if (existing) {
        updateStaff.run(name, normalizedName, email || null, departmentId, existing.id);
        result.updated += 1;
      } else {
        insertStaff.run(name, normalizedName, email || null, departmentId);
        result.inserted += 1;
      }
    });
  });

  run();
  return result;
}

function importSimpleCategory(buffer, table, hasDescription) {
  const rows = parseWorkbook(buffer);
  const result = { inserted: 0, updated: 0, errors: [] };

  const findByName = db.prepare(`SELECT id FROM ${table} WHERE name = ? COLLATE NOCASE`);
  const insert = hasDescription
    ? db.prepare(`INSERT INTO ${table} (name, description, sort_order) VALUES (?, ?, ?)`)
    : db.prepare(`INSERT INTO ${table} (name, sort_order) VALUES (?, ?)`);
  const update = hasDescription
    ? db.prepare(`UPDATE ${table} SET description = ?, active = 1 WHERE id = ?`)
    : db.prepare(`UPDATE ${table} SET active = 1 WHERE id = ?`);

  const run = db.transaction(() => {
    rows.forEach((row, index) => {
      const name = pickColumn(row, ['Tên', 'Ten', 'Name']);
      const description = pickColumn(row, ['Mô tả', 'Mo ta', 'Description']);

      if (!name) {
        result.errors.push({ row: index + 2, reason: 'Thiếu tên' });
        return;
      }

      const existing = findByName.get(name);
      if (existing) {
        if (hasDescription) update.run(description || null, existing.id);
        else update.run(existing.id);
        result.updated += 1;
      } else {
        const sortOrder = nextSortOrder(table);
        if (hasDescription) insert.run(name, description || null, sortOrder);
        else insert.run(name, sortOrder);
        result.inserted += 1;
      }
    });
  });

  run();
  return result;
}

export function importDepartmentsFromExcel(buffer) {
  return importSimpleCategory(buffer, 'departments', false);
}

export function importRequestTypesFromExcel(buffer) {
  return importSimpleCategory(buffer, 'request_types', true);
}

export function importProcessingTimesFromExcel(buffer) {
  return importSimpleCategory(buffer, 'processing_times', false);
}
