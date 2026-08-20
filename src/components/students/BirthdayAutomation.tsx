import type { Student } from '../../types';

function isUpcoming(birthday: string): boolean {
  const today = new Date();
  const [month, day] = birthday.split('-').map(Number);
  const bday = new Date(today.getFullYear(), month - 1, day);
  const diffDays = Math.ceil((bday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 30;
}

function formatBirthday(birthday: string): string {
  const [month, day] = birthday.split('-').map(Number);
  const date = new Date(2000, month - 1, day);
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

interface BirthdayAutomationProps {
  students: Student[];
}

export default function BirthdayAutomation({ students }: BirthdayAutomationProps) {
  const upcoming = students?.filter((s) => isUpcoming(s.birthday));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">Upcoming Birthdays</h3>
        <span className="text-xs text-slate-400">Auto-wishes scheduled</span>
      </div>

      {upcoming.length === 0 ? (
        <p className="text-sm text-slate-400">No birthdays in the next 30 days.</p>
      ) : (
        <div className="space-y-3">
          {upcoming.map((s) => (
            <div key={s.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-semibold">
                  {s.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.class}</p>
                </div>
              </div>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                🎂 {formatBirthday(s.birthday)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}