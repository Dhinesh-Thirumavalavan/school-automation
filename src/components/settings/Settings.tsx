import { useState } from 'react';

export default function Settings() {
  const [schoolName, setSchoolName] = useState('E.A.S. Academy');
  const [adminPhone, setAdminPhone] = useState('+91 77083 34833');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-md">
      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">School Name</label>
          <input
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Admin WhatsApp Number</label>
          <input
            value={adminPhone}
            onChange={(e) => setAdminPhone(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">School Logo</label>
          <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center text-sm text-slate-400">
            📁 Click to upload logo (PNG/JPG)
          </div>
        </div>
        <button
          type="submit"
          className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-emerald-700"
        >
          Save Settings
        </button>
        {saved && <p className="text-sm text-emerald-600 font-medium">✅ Settings saved</p>}
      </form>
    </div>
  );
}