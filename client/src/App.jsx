import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { api } from './api/client.js';
import PublicRequestForm from './pages/PublicRequestForm.jsx';
import TrackRequest from './pages/TrackRequest.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Stats from './pages/admin/Stats.jsx';
import RequestsList from './pages/admin/RequestsList.jsx';
import RequestDetail from './pages/admin/RequestDetail.jsx';
import Departments from './pages/admin/Departments.jsx';
import RequestTypes from './pages/admin/RequestTypes.jsx';
import ProcessingTimes from './pages/admin/ProcessingTimes.jsx';
import Staff from './pages/admin/Staff.jsx';
import Assignees from './pages/admin/Assignees.jsx';
import FaqList from './pages/admin/FaqList.jsx';
import PublicFaq from './pages/PublicFaq.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import SlaRules from './pages/admin/SlaRules.jsx';
import Holidays from './pages/admin/Holidays.jsx';
import FaqCandidates from './pages/admin/FaqCandidates.jsx';
import Changelog from './pages/admin/Changelog.jsx';

export default function App() {
  const [admin, setAdmin] = useState(undefined); // undefined = đang kiểm tra, null = chưa đăng nhập

  useEffect(() => {
    api
      .get('/admin/me')
      .then(setAdmin)
      .catch(() => setAdmin(null));
  }, []);

  if (admin === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Đang tải...</div>;
  }

  return (
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
  );
}
