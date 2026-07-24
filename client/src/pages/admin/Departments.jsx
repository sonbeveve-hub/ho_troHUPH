import CategoryManager from '../../components/CategoryManager.jsx';

export default function Departments() {
  return (
    <CategoryManager
      title="Khoa/phòng/đơn vị"
      apiBase="/admin/departments"
      hasDescription={false}
      importHint="File Excel cần 1 cột 'Tên'."
    />
  );
}
