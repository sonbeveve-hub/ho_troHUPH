import pg from 'pg';
import { env } from '../config/env.js';

const { Pool, types } = pg;

// node-postgres mặc định trả BIGINT (vd COUNT(*)) và NUMERIC (vd AVG()/SUM()) dưới dạng CHUỖI,
// không phải number — để tránh mất độ chính xác với số cực lớn. Nhưng toàn bộ codebase (kế thừa
// thói quen từ better-sqlite3, luôn trả number cho các hàm này) mong đợi number, nên ép kiểu
// ngay tại đây (áp dụng toàn cục cho cả process), thay vì phải sửa Number(...) rải rác khắp nơi
// mỗi khi dùng COUNT/AVG/SUM. Số lượng bản ghi của hệ thống này (vài trăm/nghìn request) không
// bao giờ chạm ngưỡng mất độ chính xác của Number (2^53).
types.setTypeParser(20, (val) => parseInt(val, 10)); // BIGINT — vd COUNT(*)
types.setTypeParser(1700, (val) => parseFloat(val)); // NUMERIC — vd AVG(), SUM()

// Pool dùng chung cho toàn app (routes/services) VÀ cho session store (app.js) — chỉ 1 pool duy
// nhất, không tạo pool riêng ở nơi khác.
export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: env.dbPoolMax,
});

// Không giống better-sqlite3 (lỗi luôn nổi ngay tại chỗ gọi vì chạy đồng bộ trong cùng
// process), 1 client đang rảnh trong pool có thể tự phát sinh lỗi bất đồng bộ (vd server Postgres
// đóng kết nối đột ngột) — nếu không bắt sự kiện 'error' này, Node sẽ coi là unhandled error và
// crash cả process.
pool.on('error', (err) => {
  console.error('[db] Lỗi không mong đợi từ 1 client đang rảnh trong pool:', err);
});

// Dịch placeholder kiểu better-sqlite3 (?) sang kiểu pg ($1, $2, ...). Toàn bộ ~215 câu SQL
// trong codebase đều dùng "?" theo thứ tự, không có placeholder đặt tên, và không có "?" nằm
// trong chuỗi literal nào (đã rà soát) — nên chỉ cần đếm tuần tự, không cần né chuỗi trong SQL.
function toPositional(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function query(client, sql, params = []) {
  return client.query(toPositional(sql), params);
}

// Bọc 1 "kết nối" (pool dùng chung, hoặc 1 client riêng khi đang trong transaction) thành cùng
// hình dạng get/all/run/exec như better-sqlite3's db.prepare(sql).get()/.all()/.run() — để mọi
// điểm gọi trong routes/services chỉ cần thêm "await" + "async" mà không phải viết lại SQL.
function makeExecutor(client) {
  return {
    // .get() — trả về 1 dòng đầu tiên, hoặc undefined nếu không có (giống better-sqlite3, KHÔNG
    // phải null, để code hiện tại kiểm tra "if (!row)" vẫn đúng như cũ).
    async get(sql, params = []) {
      const res = await query(client, sql, params);
      return res.rows[0] ?? undefined;
    },
    async all(sql, params = []) {
      const res = await query(client, sql, params);
      return res.rows;
    },
    // .run() — trả { changes, lastInsertRowid } giống better-sqlite3's RunResult. lastInsertRowid
    // CHỈ có giá trị nếu câu INSERT có "RETURNING id" — những chỗ code cũ dùng .lastInsertRowid
    // sau 1 INSERT đã được thêm RETURNING id tương ứng khi chuyển đổi từng file.
    async run(sql, params = []) {
      const res = await query(client, sql, params);
      const lastInsertRowid = res.rows[0]?.id;
      return {
        changes: res.rowCount,
        get lastInsertRowid() {
          if (lastInsertRowid === undefined) {
            throw new Error(
              '[db] .run().lastInsertRowid được gọi nhưng câu INSERT thiếu "RETURNING id".'
            );
          }
          return lastInsertRowid;
        },
      };
    },
    // .exec() — chạy nhiều câu lệnh cùng lúc (dùng để nạp schema.sql), giống better-sqlite3's
    // db.exec(). pg hỗ trợ multi-statement trong 1 query() y hệt.
    async exec(sql) {
      await client.query(sql);
    },
  };
}

export const db = makeExecutor(pool);

// Thay cho better-sqlite3's db.transaction(fn) đồng bộ — bản async này tự checkout 1 client
// RIÊNG từ pool (không dùng chung pool, để mọi câu lệnh trong transaction chạy trên cùng 1 kết
// nối) rồi BEGIN/COMMIT, ROLLBACK nếu fn ném lỗi. Callback fn nhận vào 1 executor gắn với đúng
// client đó (cùng hình dạng get/all/run) — dùng transactionDb bên trong fn, KHÔNG dùng "db"
// (pool dùng chung) để tránh câu lệnh chạy lạc sang kết nối khác, phá vỡ tính atomic.
db.transaction = async function transaction(fn) {
  const client = await pool.connect();
  const transactionDb = makeExecutor(client);
  try {
    await client.query('BEGIN');
    const result = await fn(transactionDb);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Đóng pool sạch sẽ khi process nhận tín hiệu dừng (Ctrl+C khi dev, "docker stop"/SIGTERM khi
// chạy container) — để các kết nối đang dở không bị cắt đột ngột, tránh Postgres phải tự dọn
// bằng TCP timeout.
export async function closePool() {
  await pool.end();
}
