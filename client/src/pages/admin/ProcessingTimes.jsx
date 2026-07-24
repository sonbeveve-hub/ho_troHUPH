import CategoryManager from '../../components/CategoryManager.jsx';

export default function ProcessingTimes() {
  return (
    <CategoryManager
      title="Thời gian xử lý mong muốn"
      apiBase="/admin/processing-times"
      hasDescription={false}
      importHint="File Excel cần 1 cột 'Tên' (ví dụ: 1, 3, 7 — số ngày mong muốn xử lý xong)."
    />
  );
}
