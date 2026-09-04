import { db } from '../db/index.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pad2(n) {
  return String(n).padStart(2, '0');
}

// Kiểm tra 1 ngày (Date, giờ đã chuẩn hoá về 00:00 UTC) có phải ngày nghỉ không: Thứ 7/Chủ
// nhật, hoặc có trong bảng holidays (so theo MM-DD nếu recurring, theo ngày đầy đủ nếu không).
function isNonWorkingDay(date, holidaySet) {
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return true;
  const monthDay = `${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
  const fullDate = `${date.getUTCFullYear()}-${monthDay}`;
  return holidaySet.recurring.has(monthDay) || holidaySet.exact.has(fullDate);
}

async function loadHolidaySet() {
  const rows = await db.all('SELECT date, recurring FROM holidays');
  const recurring = new Set();
  const exact = new Set();
  for (const row of rows) {
    if (row.recurring) recurring.add(row.date);
    else exact.add(row.date);
  }
  return { recurring, exact };
}

// Cộng n ngày LÀM VIỆC vào fromDate (Date), bỏ qua Thứ 7/Chủ nhật và ngày nghỉ trong bảng
// holidays. Trả về Date ở mốc 00:00 UTC của ngày làm việc thứ n kể từ fromDate (không tính
// chính fromDate). Dùng để tính hạn nhắc nhở/tự đóng thay cho cộng ngày lịch trực tiếp.
export async function addWorkingDays(fromDate, n) {
  const holidaySet = await loadHolidaySet();
  const cursor = new Date(
    Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate())
  );
  let remaining = n;
  while (remaining > 0) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (!isNonWorkingDay(cursor, holidaySet)) {
      remaining -= 1;
    }
  }
  return cursor;
}

// Số ngày làm việc đã trôi qua kể từ fromDate tới hiện tại (dùng để so sánh "đã đủ N ngày
// làm việc chưa" trong các sweep — đếm từng ngày làm việc đã qua, không tính fromDate).
export async function workingDaysSince(fromDate) {
  const holidaySet = await loadHolidaySet();
  const cursor = new Date(
    Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate())
  );
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  let count = 0;
  while (cursor.getTime() < todayUtc.getTime()) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (!isNonWorkingDay(cursor, holidaySet)) {
      count += 1;
    }
  }
  return count;
}
