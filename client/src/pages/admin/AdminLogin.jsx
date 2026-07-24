import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import OrganicBackdrop from '../../components/OrganicBackdrop.jsx';

export default function AdminLogin({ onLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const admin = await api.post('/admin/login', { username, password });
      onLoggedIn(admin);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <OrganicBackdrop />
      <div className="relative z-10 max-w-sm w-full">
        <div className="flex items-center justify-center mb-6">
          <img src="/logo.svg" alt="Trung tâm Tin học" className="h-16 w-auto" />
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tên đăng nhập
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-2.5 text-white font-semibold shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 transition disabled:opacity-60"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'} {!loading && <span aria-hidden="true">→</span>}
          </button>
        </form>
      </div>
    </div>
  );
}
