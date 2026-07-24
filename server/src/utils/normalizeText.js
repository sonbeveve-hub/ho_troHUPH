// Bỏ dấu tiếng Việt + hạ chữ thường, dùng để so khớp tên không phân biệt dấu/hoa-thường
export function normalizeText(input) {
  if (!input) return '';
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}
