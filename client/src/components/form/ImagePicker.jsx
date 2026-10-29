import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faCamera } from '@fortawesome/free-solid-svg-icons';

// Vercel giới hạn mỗi request tối đa 4.5MB → tổng ảnh (sau khi nén) giữ dưới 4MB, chừa chỗ cho
// các trường text còn lại của form. Khớp với MAX_TOTAL_ATTACHMENT_BYTES ở server/public.routes.js.
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const MAX_COUNT = 10;
const MAX_DIMENSION = 1600;
const COMPRESS_ABOVE_BYTES = 300 * 1024;

function formatMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

// Thu ảnh về cạnh dài tối đa 1600px, JPEG chất lượng 0.82 — ảnh chụp điện thoại 3–8MB còn
// khoảng 200–500KB, vẫn đủ rõ để đọc thông báo lỗi trên màn hình. Ảnh nhỏ giữ nguyên. Trình
// duyệt không giải mã được (vd HEIC trên Chrome) thì cũng giữ nguyên file gốc.
async function compressImage(file) {
  if (file.size <= COMPRESS_ABOVE_BYTES || file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export default function ImagePicker({ files, onChange }) {
  const inputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [error, setError] = useState('');
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  const handlePick = async (e) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = ''; // cho phép chọn lại cùng 1 file sau khi xoá
    setError('');

    const nonImages = selected.filter((f) => !f.type.startsWith('image/'));
    if (nonImages.length > 0) {
      setError('Chỉ chấp nhận file ảnh.');
      return;
    }

    const picked = await Promise.all(selected.map(compressImage));
    let next = [...files, ...picked];
    if (next.length > MAX_COUNT) {
      setError(`Chỉ được đính kèm tối đa ${MAX_COUNT} ảnh.`);
      next = next.slice(0, MAX_COUNT);
    }

    const nextTotal = next.reduce((sum, f) => sum + f.size, 0);
    if (nextTotal > MAX_TOTAL_BYTES) {
      setError(`Tổng dung lượng ảnh vượt quá 4MB (hiện tại ${formatMB(nextTotal)}MB). Vui lòng bớt ảnh.`);
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
      <label className="block text-sm font-medium text-slate-700 dark:text-paper/90 mb-1">
        Ảnh đính kèm <span className="text-slate-500 dark:text-ash font-normal">(không bắt buộc, tối đa 4MB, ảnh lớn được tự nén)</span>
      </label>

      {previews.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-2">
          {previews.map((src, i) => (
            <div key={i} className="relative group aspect-square">
              <img src={src} alt="" className="w-full h-full object-cover rounded-lg border border-slate-200 dark:border-white/10" />
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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex-1 rounded-xl border border-dashed border-slate-300 bg-white/50 px-3 py-2 text-sm text-slate-600 hover:bg-white/80 dark:border-white/20 dark:bg-ink-3/50 dark:text-ash dark:hover:bg-ink-3"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-1" />
          Thêm ảnh ({files.length}/{MAX_COUNT} · {formatMB(totalBytes)}MB/4MB)
        </button>
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          title="Chụp ảnh bằng camera"
          className="shrink-0 rounded-xl border border-dashed border-slate-300 bg-white/50 px-3 py-2 text-sm text-slate-600 hover:bg-white/80 dark:border-white/20 dark:bg-ink-3/50 dark:text-ash dark:hover:bg-ink-3"
        >
          <FontAwesomeIcon icon={faCamera} className="mr-1" />
          Chụp ảnh
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handlePick}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePick}
        className="hidden"
      />

      {error && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
}
