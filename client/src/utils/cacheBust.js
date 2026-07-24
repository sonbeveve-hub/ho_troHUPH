// Timestamp cố định 1 lần khi bundle được build/tải — gắn vào URL các file tĩnh
// không có content-hash (như /logo.svg) để tránh trình duyệt/CDN cache bản cũ sau khi thay file.
export const FILE_TIME = Date.now();
