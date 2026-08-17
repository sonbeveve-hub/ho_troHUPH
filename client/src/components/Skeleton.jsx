// Khối chờ tải dạng "xương" (skeleton) — thay cho dòng chữ "Đang tải..." đơn điệu, giữ đúng
// hình dạng card/danh sách sắp hiện ra để tránh giật layout khi dữ liệu về.
function Bone({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 dark:bg-white/10 ${className}`} />;
}

export function CardSkeleton({ className = '' }) {
  return (
    <div
      className={`bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-5 ${className}`}
    >
      <Bone className="h-4 w-1/3 mb-3" />
      <Bone className="h-24 w-full" />
    </div>
  );
}

export function ListRowSkeleton() {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Bone className="h-4 w-2/5 mb-2" />
          <Bone className="h-3 w-4/5" />
        </div>
        <Bone className="h-3 w-16 shrink-0" />
      </div>
      <div className="mt-3 flex gap-2">
        <Bone className="h-5 w-20" />
        <Bone className="h-5 w-16" />
        <Bone className="h-5 w-24" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatsPageSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Bone className="h-8 w-40" />
        <Bone className="h-9 w-28" />
      </div>
      <Bone className="h-24 w-full rounded-3xl mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }, (_, i) => (
          <Bone key={i} className="h-20 w-full rounded-3xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="max-w-3xl space-y-5">
      <CardSkeleton className="!p-6" />
      <CardSkeleton className="!p-6" />
    </div>
  );
}

export default Bone;
