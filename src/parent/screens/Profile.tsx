import type { ParentStudent } from '../types';
import { LogOutIcon, SwapIcon } from '../icons';

interface ProfileProps {
  students: ParentStudent[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onLogout: () => void;
}

export default function Profile({ students, selectedIndex, onSelect, onLogout }: ProfileProps) {
  const student = students[selectedIndex];

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-semibold">
          {student.name.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-slate-900">{student.name}</p>
          <p className="text-sm text-slate-500">Class {student.class}{student.section ? `-${student.section}` : ''}{student.roll_no ? ` · Roll ${student.roll_no}` : ''}</p>
        </div>
      </div>

      {students.length > 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <SwapIcon className="w-3.5 h-3.5" /> Switch child
          </p>
          <div className="space-y-1.5">
            {students.map((s, i) => (
              <button
                key={s.id}
                onClick={() => onSelect(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${i === selectedIndex ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-700'}`}
              >
                {s.name} — Class {s.class}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onLogout}
        className="w-full bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 text-red-600 text-sm font-medium"
      >
        <LogOutIcon /> Log Out
      </button>
    </div>
  );
}
