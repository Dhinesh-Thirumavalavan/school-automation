import { useEffect, useState } from 'react';
import { API_URL } from '../../config';

interface RosterEntry {
  student_id: string;
  name: string;
  roll_no: string | null;
  progress_id: string | null;
  marks: number | null;
  max_marks: number;
  grade: string | null;
}

const classOptions = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8'];

function gradeFromMarks(marks: number, maxMarks: number) {
  const pct = (marks / maxMarks) * 100;
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  return 'D';
}

export default function ResultsEntry() {
  const [studentClass, setStudentClass] = useState(classOptions[0]);
  const [term, setTerm] = useState('');
  const [subject, setSubject] = useState('');
  const [maxMarks, setMaxMarks] = useState(100);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [marksInput, setMarksInput] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadRoster = () => {
    if (!studentClass || !term.trim() || !subject.trim()) return;
    setLoading(true);
    setSaved(false);
    fetch(`${API_URL}/api/results/roster?class=${studentClass}&term=${encodeURIComponent(term)}&subject=${encodeURIComponent(subject)}`)
      .then((r) => r.json())
      .then((data: RosterEntry[]) => {
        setRoster(data);
        const inputs: Record<string, string> = {};
        data.forEach((s) => { inputs[s.student_id] = s.marks !== null ? String(s.marks) : ''; });
        setMarksInput(inputs);
        if (data[0]) setMaxMarks(data[0].max_marks);
      })
      .catch(() => setRoster([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setRoster([]); }, [studentClass, term, subject]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const entries = roster
        .filter((s) => marksInput[s.student_id]?.trim() !== '')
        .map((s) => ({
          student_id: s.student_id,
          marks: Number(marksInput[s.student_id]),
          max_marks: maxMarks,
        }));
      await fetch(`${API_URL}/api/results/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term, subject, entries }),
      });
      setSaved(true);
      loadRoster();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Results Entry</h2>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Class</label>
          <select
            value={studentClass}
            onChange={(e) => setStudentClass(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Term</label>
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Term 1"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Mathematics"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Max Marks</label>
          <input
            type="number"
            value={maxMarks}
            onChange={(e) => setMaxMarks(Number(e.target.value) || 100)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="col-span-2 md:col-span-4">
          <button
            onClick={loadRoster}
            disabled={!term.trim() || !subject.trim()}
            className="bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-900 disabled:opacity-50"
          >
            Load Class {studentClass} Roster
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : roster.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left px-4 py-2">Roll</th>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Marks / {maxMarks}</th>
                <th className="text-left px-4 py-2">Grade</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((s) => {
                const val = marksInput[s.student_id] ?? '';
                const num = Number(val);
                const grade = val.trim() !== '' && !isNaN(num) ? gradeFromMarks(num, maxMarks) : s.grade;
                return (
                  <tr key={s.student_id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-500">{s.roll_no || '—'}</td>
                    <td className="px-4 py-2 text-slate-800">{s.name}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        max={maxMarks}
                        value={val}
                        onChange={(e) => setMarksInput((prev) => ({ ...prev, [s.student_id]: e.target.value }))}
                        className="w-20 border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-2 text-slate-600 font-medium">{grade || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="p-4 border-t border-slate-100 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save All'}
            </button>
            {saved && <span className="text-sm text-emerald-600 font-medium">✅ Saved</span>}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-400">
          Pick a class, term, and subject, then load the roster to enter marks.
        </div>
      )}
    </div>
  );
}
