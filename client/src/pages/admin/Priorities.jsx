import CategoryManager from '../../components/CategoryManager.jsx';

export default function Priorities() {
  return (
    <CategoryManager
      title="Mức độ ưu tiên"
      apiBase="/admin/priorities"
      hasDescription={false}
      importHint="File Excel cần cột 'Tên'."
    />
  );
}
