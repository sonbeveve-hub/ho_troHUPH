import { Link } from 'react-router-dom';
import { FILE_TIME } from '../utils/cacheBust.js';

// Logo trên các trang công khai — luôn dẫn về trang gửi yêu cầu ("/"), và tự đổi sang bản
// logo màu sáng (chữ trắng) khi đang ở chế độ tối, vì logo gốc màu tối sẽ chìm vào nền đen.
export default function PublicLogo({ theme, className = 'h-16 w-auto mx-auto' }) {
  const src = theme === 'dark' ? `/logo-dark.svg?filetime=${FILE_TIME}` : `/logo.svg?filetime=${FILE_TIME}`;
  return (
    <Link to="/" className="inline-block">
      <img src={src} alt="Trung tâm Tin học" className={className} />
    </Link>
  );
}
