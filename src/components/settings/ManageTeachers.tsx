import { useState, useEffect } from 'react';
import { API_URL } from '../../config';

interface Teacher {
  id: string;
  name: string;
  email: string;
  assigned_classes: string[];
}

const classOptions = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8'];

export default function ManageTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const fetchTeachers = async () => {
    const res = await fetch(`${API_URL}/api/teachers`);
    const data = await res.json();
    setTeachers(data);
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const toggleClass = (cls: string) => {
    setSelectedClasses((prev) => (prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, assigned_classes: selectedClasses }),
      });
      setName('');
      setEmail('');
      setPassword('');
      setSelectedClasses([]);
      setShowForm(false);
      await fetchTeachers();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (teacherId: string, teacherName: string) => {
    const newPassword = prompt(`Enter a new password for ${teacherName}:`);
    if (!newPassword) return;
    setResettingId(teacherId);
    try {
      const res = await fetch(`${API_URL}/api/teachers/${teacherId}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPassword }),
      });
      if (res.ok) {
        alert(`Password reset for ${teacherName}`);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to reset password');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to reset password');
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">Teacher Accounts</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs font-medium bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700"
        >
          {showForm ? 'Cancel' : '+ Add Teacher'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Teacher name"
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Login email"
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Set a password"
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div>
            <p className="text-xs font-medium text-slate-600 mb-1.5">Assigned class(es)</p>
            <div className="flex flex-wrap gap-1.5">
              {classOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleClass(c)}
                  className={`text-xs px-2.5 py-1 rounded-md border ${
                    selectedClasses.includes(c) ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || selectedClasses.length === 0}
            className="w-full bg-emerald-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Teacher Account'}
          </button>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-125">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Classes</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teachers.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2 font-medium text-slate-800">{t.name}</td>
                  <td className="px-4 py-2 text-slate-600">{t.email}</td>
                  <td className="px-4 py-2 text-slate-600">{t.assigned_classes.join(', ')}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleResetPassword(t.id, t.name)}
                      disabled={resettingId === t.id}
                      className="text-xs text-emerald-700 hover:underline disabled:opacity-50"
                    >
                      {resettingId === t.id ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No teacher accounts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}