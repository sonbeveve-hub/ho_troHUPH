import { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { api } from './api/client.js';
import PublicRequestForm from './pages/PublicRequestForm.jsx';
import TrackRequest from './pages/TrackRequest.jsx';
import PublicFaq from './pages/PublicFaq.jsx';

// Toàn bộ khu quản trị tải lười (code-split) — người dùng công khai (đông hơn nhiều, thường vào
// từ mạng di động) không cần tải theo phần JS chỉ dành cho nhân viên xử lý yêu cầu.
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin.jsx'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'));
const Stats = lazy(() => import('./pages/admin/Stats.jsx'));
const RequestsList = lazy(() => import('./pages/admin/RequestsList.jsx'));
const RequestDetail = lazy(() => import('./pages/admin/RequestDetail.jsx'));
const Departments = lazy(() => import('./pages/admin/Departments.jsx'));
const RequestTypes = lazy(() => import('./pages/admin/RequestTypes.jsx'));
const ProcessingTimes = lazy(() => import('./pages/admin/ProcessingTimes.jsx'));
const Staff = lazy(() => import('./pages/admin/Staff.jsx'));
const Assignees = lazy(() => import('./pages/admin/Assignees.jsx'));
const FaqList = lazy(() => import('./pages/admin/FaqList.jsx'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers.jsx'));
const SlaRules = lazy(() => import('./pages/admin/SlaRules.jsx'));
const Holidays = lazy(() => import('./pages/admin/Holidays.jsx'));
const FaqCandidates = lazy(() => import('./pages/admin/FaqCandidates.jsx'));
const Changelog = lazy(() => import('./pages/admin/Changelog.jsx'));

function AdminFallback() {
  return <div className="min-h-screen flex items-center justify-center text-slate-500">Đang tải...</div>;
}

export default function App() {
  const [admin, setAdmin] = useState(undefined); // undefined = đang kiểm tra, null = chưa đăng nhập

  useEffect(() => {
    api
      .get('/admin/me')
      .then(setAdmin)
      .catch(() => setAdmin(null));
  }, []);

  if (admin === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Đang tải...</div>;
  }

  return (
    <Suspense fallback={<AdminFallback />}>
      <Routes>
        <Route path="/" element={<PublicRequestForm />} />
        <Route path="/tra-cuu" element={<TrackRequest />} />
        <Route path="/tra-cuu/:code" element={<TrackRequest />} />
        <Route path="/faq" element={<PublicFaq />} />

        <Route
          path="/admin/login"
          element={admin ? <Navigate to="/admin" replace /> : <AdminLogin onLoggedIn={setAdmin} />}
        />

        <Route
          path="/admin"
          element={
            admin ? (
              <AdminLayout admin={admin} onLoggedOut={() => setAdmin(null)} />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        >
          <Route index element={<Stats />} />
          <Route path="requests" element={<RequestsList />} />
          <Route path="requests/:id" element={<RequestDetail />} />
          <Route path="departments" element={<Departments />} />
          <Route path="request-types" element={<RequestTypes />} />
          <Route path="processing-times" element={<ProcessingTimes />} />
          <Route path="staff" element={<Staff />} />
          <Route path="assignees" element={<Assignees />} />
          <Route path="faq" element={<FaqList />} />
          <Route path="faq-candidates" element={<FaqCandidates />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="sla-rules" element={<SlaRules />} />
          <Route path="holidays" element={<Holidays />} />
          <Route path="changelog" element={<Changelog />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
