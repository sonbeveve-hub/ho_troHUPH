export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Đã có lỗi xảy ra, vui lòng thử lại.' });
}
