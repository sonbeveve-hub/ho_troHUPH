// Nền blob hữu cơ mềm mại (phong cách "neo-apple"), đặt phía sau nội dung.
// z-0 (không phải z-index âm) + nội dung bọc trong "relative z-10" ở nơi dùng component này,
// vì phần tử static không có position sẽ luôn vẽ đè lên phần tử positioned có z-index âm.
// Ở chế độ tối, đổi sang quầng sáng xanh lime/mint mờ nhạt (thay cho khối màu thương hiệu
// nhạt) — hợp với nền gần đen thay vì nền trắng.
export default function OrganicBackdrop() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div
        className="absolute -top-24 -left-24 h-[420px] w-[420px] bg-brand-200/70 dark:bg-volt/10 blur-3xl"
        style={{ borderRadius: '42% 58% 70% 30% / 45% 45% 55% 55%' }}
      />
      <div
        className="absolute top-1/3 -right-32 h-[480px] w-[480px] bg-brand-100/80 dark:bg-mint/10 blur-3xl"
        style={{ borderRadius: '60% 40% 30% 70% / 50% 60% 40% 50%' }}
      />
      <div
        className="absolute -bottom-32 left-1/4 h-[380px] w-[380px] bg-emerald-100/70 dark:bg-volt/[0.07] blur-3xl"
        style={{ borderRadius: '38% 62% 63% 37% / 41% 44% 56% 59%' }}
      />
      <div
        className="absolute bottom-0 right-0 h-[300px] w-[300px] bg-white/60 dark:bg-white/[0.03] blur-3xl"
        style={{ borderRadius: '50% 50% 30% 70% / 60% 40% 60% 40%' }}
      />
    </div>
  );
}
