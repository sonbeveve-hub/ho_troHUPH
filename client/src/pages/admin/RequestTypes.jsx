import CategoryManager from '../../components/CategoryManager.jsx';

export default function RequestTypes() {
  return (
    <CategoryManager
      title="Loại yêu cầu"
      apiBase="/admin/request-types"
      hasDescription={true}
      importHint="File Excel cần cột 'Tên' và có thể có cột 'Mô tả'."
    />
  );
}
