import readline from 'node:readline/promises';
import bcrypt from 'bcrypt';
import { db, closePool } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';

await migrate();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

try {
  const username = (await rl.question('Tên đăng nhập admin: ')).trim();
  if (!username) throw new Error('Tên đăng nhập không được để trống.');

  const password = await rl.question('Mật khẩu admin: ');
  if (!password || password.length < 6) {
    throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await db.get('SELECT id FROM admin_users WHERE username = ?', [username]);
  if (existing) {
    await db.run('UPDATE admin_users SET password_hash = ? WHERE username = ?', [
      passwordHash,
      username,
    ]);
    console.log(`Đã cập nhật mật khẩu cho admin "${username}".`);
  } else {
    await db.run('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)', [
      username,
      passwordHash,
    ]);
    console.log(`Đã tạo tài khoản admin "${username}".`);
  }
} catch (err) {
  console.error('Lỗi:', err.message);
  process.exitCode = 1;
} finally {
  rl.close();
  // Đóng pool để script thoát hẳn — pg.Pool giữ tiến trình sống cho tới khi được đóng, khác
  // better-sqlite3 (không có khái niệm kết nối/pool nên script tự thoát ngay sau finally).
  await closePool();
}
