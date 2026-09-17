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

interface ResultsEntryProps {
  classOptions?: string[];
}

const defaultClassOptions = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8'];
const termPresets = ['Term 1', 'Term 2', 'Term 3', 'Half Yearly', 'Annual Exam'];
const subjectPresets = ['Tamil', 'English', 'Mathematics', 'Science', 'Social Science', 'Computer Science'];

function gradeFromMarks(marks: number, maxMarks: number) {
  const pct = (marks / maxMarks) * 100;
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  return 'D';
}

// Presets keep term/subject names consistent across entries (so results roll up correctly);
// "Other" falls back to free text for anything not on the list.
function ChipPicker({ label, presets, value, onChange, placeholder }: {
  label: string;
  presets: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [customMode, setCustomMode] = useState(value !== '' && !presets.includes(value));

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      <div className="flex gap-1.5 flex-wrap">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => { setCustomMode(false); onChange(p); }}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              !customMode && value === p ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => { setCustomMode(true); onChange(''); }}
          className={`text-xs px-3 py-1.5 rounded-full border ${
            customMode ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
          }`}
        >
          Other
        </button>
      </div>
      {customMode && (
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-2 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      )}
    </div>
  );
}

export default function ResultsEntry({ classOptions }: ResultsEntryProps) {
  const restricted = !!classOptions && classOptions.length > 0;
  const options = restricted ? classOptions! : defaultClassOptions;

  const [studentClass, setStudentClass] = useState(options[0]);
  const [term, setTerm] = useState('');
  const [subject, setSubject] = useState('');
  const [maxMarks, setMaxMarks] = useState(100);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rosterLoaded, setRosterLoaded] = useState(false);
  const [marksInput, setMarksInput] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canLoad = !!studentClass && term.trim() !== '' && subject.trim() !== '';

  const loadRoster = () => {
    if (!canLoad) return;
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
        setRosterLoaded(true);
      })
      .catch(() => setRoster([]))
      .finally(() => setLoading(false));
  };

  const editSetup = () => {
    setRosterLoaded(false);
    setRoster([]);
    setSaved(false);
  };

  useEffect(() => { setRosterLoaded(false); setRoster([]); }, [studentClass, term, subject]);

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

  const filledCount = roster.filter((s) => marksInput[s.student_id]?.trim() !== '').length;

  return (
    <div className="max-w-3xl">
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Results Entry</h2>
      <p className="text-sm text-slate-500 mb-4">Pick a class, term and subject, then enter marks for the whole class at once.</p>

      {!rosterLoaded ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Class</label>
            <div className="flex gap-1.5 flex-wrap">
              {options.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setStudentClass(c)}
                  className={`text-xs px-3 py-1.5 rounded-full border ${
                    studentClass === c ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <ChipPicker label="Term" presets={termPresets} value={term} onChange={setTerm} placeholder="e.g. Term 2 Revision" />
          <ChipPicker label="Subject" presets={subjectPresets} value={subject} onChange={setSubject} placeholder="e.g. Environmental Science" />

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Max Marks</label>
            <div className="flex items-center gap-2">
              {[50, 100].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMaxMarks(m)}
                  className={`text-xs px-3 py-1.5 rounded-full border ${
                    maxMarks === m ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {m}
                </button>
              ))}
              <input
                type="number"
                value={maxMarks}
                onChange={(e) => setMaxMarks(Number(e.target.value) || 100)}
                className="w-24 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            onClick={loadRoster}
            disabled={!canLoad || loading}
            className="w-full bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Loading class list...' : `Load Class ${studentClass} Roster`}
          </button>
        </div>
      ) : (
        <>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-800 truncate">Class {studentClass} · {subject} · {term}</p>
              <p className="text-xs text-emerald-600 mt-0.5">{filledCount} of {roster.length} students marked · out of {maxMarks}</p>
            </div>
            <button onClick={editSetup} className="text-xs font-medium text-emerald-700 underline shrink-0">Change</button>
          </div>

          {roster.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-400">
              No students found for Class {studentClass}.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
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
              </div>
              <div className="p-4 border-t border-slate-100 flex items-center gap-3 sticky bottom-0 bg-white">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : `Save All (${filledCount}/${roster.length})`}
                </button>
                {saved && <span className="text-sm text-emerald-600 font-medium">✅ Saved</span>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
