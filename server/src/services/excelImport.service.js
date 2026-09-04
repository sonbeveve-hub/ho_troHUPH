import * as XLSX from 'xlsx';
import { db } from '../db/index.js';
import { normalizeText } from '../utils/normalizeText.js';

function parseWorkbook(buffer, { cellDates = false } = {}) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates });
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

// executor: bản get/all/run gắn với transaction đang chạy (không dùng "db" dùng chung) — để mọi
// thao tác trong 1 lượt import nằm cùng 1 transaction, đúng như hành vi db.transaction() cũ.
async function nextSortOrder(executor, table) {
  return (await executor.get(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM ${table}`)).next;
}

async function resolveDepartmentId(executor, departmentName) {
  if (!departmentName) return null;
  const existing = await executor.get('SELECT id FROM departments WHERE name ILIKE ?', [departmentName]);
  if (existing) return existing.id;
  const sortOrder = await nextSortOrder(executor, 'departments');
  const info = await executor.run('INSERT INTO departments (name, sort_order) VALUES (?, ?) RETURNING id', [
    departmentName,
    sortOrder,
  ]);
  return info.lastInsertRowid;
}

export async function importStaffFromExcel(buffer) {
  const rows = parseWorkbook(buffer);
  const result = { inserted: 0, updated: 0, errors: [] };

  await db.transaction(async (tx) => {
    for (const [index, row] of rows.entries()) {
      const name = pickColumn(row, ['Họ tên', 'Ho ten', 'Tên', 'Ten', 'Name', 'Họ và tên']);
      const email = pickColumn(row, ['Email', 'Mail', 'Địa chỉ email']);
      const phone = pickColumn(row, ['Số điện thoại', 'So dien thoai', 'SĐT', 'SDT', 'Phone', 'Điện thoại']);
      const departmentName = pickColumn(row, [
        'Khoa/phòng/đơn vị',
        'Khoa phong don vi',
        'Phòng ban',
        'Đơn vị',
        'Department',
      ]);

      if (!name) {
        result.errors.push({ row: index + 2, reason: 'Thiếu tên' });
        continue;
      }

      const normalizedName = normalizeText(name);
      const departmentId = await resolveDepartmentId(tx, departmentName);

      let existing = null;
      if (email) {
        existing = await tx.get("SELECT id FROM staff WHERE email ILIKE ? AND email != ''", [email]);
      }
      if (!existing) {
        // "IS NOT DISTINCT FROM" thay cho "IS ?" kiểu SQLite (SQLite cho phép "IS" so sánh NULL-safe
        // với bất kỳ giá trị nào; Postgres chỉ chấp nhận "IS" với NULL/TRUE/FALSE theo chuẩn SQL,
        // không nhận tham số bind — "IS NOT DISTINCT FROM" là toán tử NULL-safe tương đương của Postgres).
        existing = await tx.get(
          'SELECT id FROM staff WHERE normalized_name = ? AND department_id IS NOT DISTINCT FROM ?',
          [normalizedName, departmentId]
        );
      }

      if (existing) {
        await tx.run(
          `UPDATE staff SET name = ?, normalized_name = ?, email = ?, phone = ?, department_id = ?, updated_at = now() WHERE id = ?`,
          [name, normalizedName, email || null, phone || null, departmentId, existing.id]
        );
        result.updated += 1;
      } else {
        await tx.run(
          `INSERT INTO staff (name, normalized_name, email, phone, department_id) VALUES (?, ?, ?, ?, ?)`,
          [name, normalizedName, email || null, phone || null, departmentId]
        );
        result.inserted += 1;
      }
    }
  });

  return result;
}

async function importSimpleCategory(buffer, table, hasDescription) {
  const rows = parseWorkbook(buffer);
  const result = { inserted: 0, updated: 0, errors: [] };

  await db.transaction(async (tx) => {
    for (const [index, row] of rows.entries()) {
      const name = pickColumn(row, ['Tên', 'Ten', 'Name']);
      const description = pickColumn(row, ['Mô tả', 'Mo ta', 'Description']);

      if (!name) {
        result.errors.push({ row: index + 2, reason: 'Thiếu tên' });
        continue;
      }

      const existing = await tx.get(`SELECT id FROM ${table} WHERE name ILIKE ?`, [name]);
      if (existing) {
        if (hasDescription) {
          await tx.run(`UPDATE ${table} SET description = ?, active = 1 WHERE id = ?`, [
            description || null,
            existing.id,
          ]);
        } else {
          await tx.run(`UPDATE ${table} SET active = 1 WHERE id = ?`, [existing.id]);
        }
        result.updated += 1;
      } else {
        const sortOrder = await nextSortOrder(tx, table);
        if (hasDescription) {
          await tx.run(`INSERT INTO ${table} (name, description, sort_order) VALUES (?, ?, ?)`, [
            name,
            description || null,
            sortOrder,
          ]);
        } else {
          await tx.run(`INSERT INTO ${table} (name, sort_order) VALUES (?, ?)`, [name, sortOrder]);
        }
        result.inserted += 1;
      }
    }
  });

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

function pad2(n) {
  return String(n).padStart(2, '0');
}

// Chấp nhận nhiều định dạng: ô ngày thật trong Excel (Date), 'DD/MM/YYYY' hoặc 'DD-MM-YYYY'
// (có năm → không lặp lại, trừ khi cột "Lặp lại" ghi đè), 'DD/MM' hoặc 'DD-MM' (không năm →
// mặc định lặp lại hàng năm). Trả về { date, recurring } hoặc null nếu không đọc được.
function parseHolidayDate(rawValue, recurringOverride) {
  if (rawValue instanceof Date && !Number.isNaN(rawValue.getTime())) {
    return {
      date: recurringOverride === false
        ? `${rawValue.getFullYear()}-${pad2(rawValue.getMonth() + 1)}-${pad2(rawValue.getDate())}`
        : `${pad2(rawValue.getMonth() + 1)}-${pad2(rawValue.getDate())}`,
      recurring: recurringOverride === false ? 0 : 1,
    };
  }

  const text = String(rawValue).trim();
  const withYear = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (withYear) {
    const [, d, m, y] = withYear;
    const recurring = recurringOverride === undefined ? false : recurringOverride;
    return {
      date: recurring ? `${pad2(m)}-${pad2(d)}` : `${y}-${pad2(m)}-${pad2(d)}`,
      recurring: recurring ? 1 : 0,
    };
  }
  const isoWithYear = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoWithYear) {
    const [, y, m, d] = isoWithYear;
    const recurring = recurringOverride === undefined ? false : recurringOverride;
    return {
      date: recurring ? `${pad2(m)}-${pad2(d)}` : `${y}-${pad2(m)}-${pad2(d)}`,
      recurring: recurring ? 1 : 0,
    };
  }
  const noYear = text.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (noYear) {
    const [, d, m] = noYear;
    return { date: `${pad2(m)}-${pad2(d)}`, recurring: recurringOverride === false ? 0 : 1 };
  }
  return null;
}

export async function importHolidaysFromExcel(buffer) {
  const rows = parseWorkbook(buffer, { cellDates: true });
  const result = { inserted: 0, updated: 0, errors: [] };

  await db.transaction(async (tx) => {
    for (const [index, row] of rows.entries()) {
      const rawDate = row['Ngày'] ?? row['Ngay'] ?? row['Date'] ?? pickColumn(row, ['Ngày', 'Ngay', 'Date']);
      const name = pickColumn(row, ['Tên', 'Ten', 'Name']);
      const recurringRaw = pickColumn(row, ['Lặp lại', 'Lap lai', 'Recurring']).toLowerCase();
      const recurringOverride =
        recurringRaw === '' ? undefined : ['có', 'co', 'yes', '1', 'true'].includes(recurringRaw);

      if (!name) {
        result.errors.push({ row: index + 2, reason: 'Thiếu tên' });
        continue;
      }
      const parsed = parseHolidayDate(rawDate, recurringOverride);
      if (!parsed) {
        result.errors.push({ row: index + 2, reason: 'Không đọc được ngày (dùng DD/MM hoặc DD/MM/YYYY)' });
        continue;
      }

      await tx.run('INSERT INTO holidays (date, name, recurring) VALUES (?, ?, ?)', [
        parsed.date,
        name,
        parsed.recurring,
      ]);
      result.inserted += 1;
    }
  });

  return result;
}
