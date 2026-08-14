// Bộ minh hoạ flat-icon phong cách "soft tech" cho các trang công khai — kể chuyện bằng
// biểu tượng (laptop, tai nghe, chat, khiên bảo mật, đồng hồ...) thay vì ảnh chụp thật, vì
// đây là công cụ nội bộ trường học, không có ảnh nhân sự/case study thật để dùng.
// Mỗi icon dùng chung 1 bảng màu (xanh thương hiệu + cam ấm điểm nhấn) để đồng bộ phong cách.

const TEAL = '#1B7A4D';
const TEAL_LIGHT = '#9FE6C0';
const TEAL_BG = '#E6FFFA';
const AMBER = '#F59E0B';
const AMBER_LIGHT = '#FDE68A';

export function LaptopIllustration(props) {
  return (
    <svg viewBox="0 0 120 120" fill="none" {...props}>
      <circle cx="60" cy="60" r="56" fill={TEAL_BG} />
      <rect x="28" y="38" width="64" height="42" rx="4" fill="#fff" stroke={TEAL} strokeWidth="3" />
      <rect x="35" y="45" width="50" height="28" rx="2" fill={TEAL_LIGHT} />
      <path d="M20 84h80l-6 10H26l-6-10Z" fill={TEAL} />
      <circle cx="88" cy="30" r="10" fill={AMBER} />
      <path d="M84 30l3 3 6-6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HeadsetIllustration(props) {
  return (
    <svg viewBox="0 0 120 120" fill="none" {...props}>
      <circle cx="60" cy="60" r="56" fill={AMBER_LIGHT} />
      <path d="M32 62v-6a28 28 0 0 1 56 0v6" stroke={TEAL} strokeWidth="4" strokeLinecap="round" fill="none" />
      <rect x="24" y="58" width="14" height="24" rx="7" fill={TEAL} />
      <rect x="82" y="58" width="14" height="24" rx="7" fill={TEAL} />
      <path d="M38 82v4a10 10 0 0 0 10 10h6" stroke={TEAL} strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function ChatBubbleIllustration(props) {
  return (
    <svg viewBox="0 0 120 120" fill="none" {...props}>
      <circle cx="60" cy="60" r="56" fill={TEAL_BG} />
      <rect x="26" y="34" width="68" height="46" rx="14" fill="#fff" stroke={TEAL} strokeWidth="3" />
      <path d="M42 80v12l16-12" fill="#fff" stroke={TEAL} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="46" cy="57" r="4.5" fill={TEAL} />
      <circle cx="60" cy="57" r="4.5" fill={AMBER} />
      <circle cx="74" cy="57" r="4.5" fill={TEAL} />
    </svg>
  );
}

export function ShieldCheckIllustration(props) {
  return (
    <svg viewBox="0 0 120 120" fill="none" {...props}>
      <circle cx="60" cy="60" r="56" fill={AMBER_LIGHT} />
      <path
        d="M60 26l28 10v22c0 20-12 32-28 36-16-4-28-16-28-36V36l28-10Z"
        fill="#fff"
        stroke={TEAL}
        strokeWidth="3.5"
      />
      <path d="M47 60l9 9 17-18" stroke={AMBER} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ClockIllustration(props) {
  return (
    <svg viewBox="0 0 120 120" fill="none" {...props}>
      <circle cx="60" cy="60" r="56" fill={TEAL_BG} />
      <circle cx="60" cy="62" r="34" fill="#fff" stroke={TEAL} strokeWidth="4" />
      <path d="M60 44v20l14 10" stroke={TEAL} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="52" y="20" width="16" height="8" rx="4" fill={AMBER} />
    </svg>
  );
}

export function TicketIllustration(props) {
  return (
    <svg viewBox="0 0 120 120" fill="none" {...props}>
      <circle cx="60" cy="60" r="56" fill={AMBER_LIGHT} />
      <path
        d="M28 46a6 6 0 0 1 6-6h52a6 6 0 0 1 6 6v6a6 6 0 0 0 0 12v6a6 6 0 0 1-6 6H34a6 6 0 0 1-6-6v-6a6 6 0 0 0 0-12v-6Z"
        fill="#fff"
        stroke={TEAL}
        strokeWidth="3"
      />
      <path d="M66 40v40" stroke={TEAL_LIGHT} strokeWidth="3" strokeDasharray="4 4" />
      <path d="M40 60h10" stroke={AMBER} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function WifiIllustration(props) {
  return (
    <svg viewBox="0 0 120 120" fill="none" {...props}>
      <circle cx="60" cy="60" r="56" fill={TEAL_BG} />
      <path d="M32 52a40 40 0 0 1 56 0" stroke={TEAL} strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M42 66a24 24 0 0 1 36 0" stroke={TEAL} strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <circle cx="60" cy="80" r="7" fill={AMBER} />
    </svg>
  );
}

export function PrinterIllustration(props) {
  return (
    <svg viewBox="0 0 120 120" fill="none" {...props}>
      <circle cx="60" cy="60" r="56" fill={AMBER_LIGHT} />
      <rect x="34" y="50" width="52" height="28" rx="4" fill="#fff" stroke={TEAL} strokeWidth="3" />
      <rect x="42" y="34" width="36" height="20" rx="2" fill={TEAL_LIGHT} stroke={TEAL} strokeWidth="2.5" />
      <rect x="42" y="78" width="36" height="18" rx="2" fill="#fff" stroke={TEAL} strokeWidth="3" />
      <circle cx="78" cy="60" r="3" fill={AMBER} />
    </svg>
  );
}

// Vòng tròn nhỏ trang trí rải rác nền — hỗ trợ hiệu ứng "kể chuyện bằng icon" lấp đầy khoảng
// trắng mà không cần ảnh chụp thật.
export function DecorDot({ className = '', color = TEAL_LIGHT }) {
  return <span className={`inline-block rounded-full ${className}`} style={{ backgroundColor: color }} />;
}
