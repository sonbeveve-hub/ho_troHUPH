import { useEffect, useRef, useState } from 'react';

const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const MAX_COUNT = 10;

function formatMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export default function ImagePicker({ files, onChange }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  const handlePick = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ''; // cho phép chọn lại cùng 1 file sau khi xoá
    setError('');

    const nonImages = picked.filter((f) => !f.type.startsWith('image/'));
    if (nonImages.length > 0) {
      setError('Chỉ chấp nhận file ảnh.');
      return;
    }

    let next = [...files, ...picked];
    if (next.length > MAX_COUNT) {
      setError(`Chỉ được đính kèm tối đa ${MAX_COUNT} ảnh.`);
      next = next.slice(0, MAX_COUNT);
    }

    const nextTotal = next.reduce((sum, f) => sum + f.size, 0);
    if (nextTotal > MAX_TOTAL_BYTES) {
      setError(`Tổng dung lượng ảnh vượt quá 20MB (hiện tại ${formatMB(nextTotal)}MB). Vui lòng bớt ảnh.`);
      return;
    }

    onChange(next);
  };

  const removeAt = (index) => {
    onChange(files.filter((_, i) => i !== index));
    setError('');
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        Ảnh đính kèm <span className="text-slate-400 font-normal">(không bắt buộc, tối đa 20MB)</span>
      </label>

      {previews.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-2">
          {previews.map((src, i) => (
            <div key={i} className="relative group aspect-square">
              <img src={src} alt="" className="w-full h-full object-cover rounded-lg border border-slate-200" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center opacity-90 hover:bg-red-600"
                aria-label="Xoá ảnh"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-xl border border-dashed border-slate-300 bg-white/50 px-3 py-2 text-sm text-slate-600 hover:bg-white/80 w-full"
      >
        + Thêm ảnh ({files.length}/{MAX_COUNT} · {formatMB(totalBytes)}MB/20MB)
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handlePick}
        className="hidden"
      />

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
