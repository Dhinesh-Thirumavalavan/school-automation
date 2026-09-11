import { useEffect, useState } from 'react';
import type { ParentStudent } from '../types';
import { LogOutIcon, SwapIcon, BellIcon } from '../icons';
import { Card, SectionLabel } from '../ui';
import { getExistingSubscription, isPushSupported, subscribeToPush, unsubscribeFromPush } from '../push';

interface ProfileProps {
  students: ParentStudent[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onLogout: () => void;
  phone: string;
}

export default function Profile({ students, selectedIndex, onSelect, onLogout, phone }: ProfileProps) {
  const student = students[selectedIndex];
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState('');

  useEffect(() => {
    getExistingSubscription().then((sub) => setPushEnabled(!!sub));
  }, []);

  const togglePush = async () => {
    setPushError('');
    setPushBusy(true);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush(phone);
        setPushEnabled(false);
      } else {
        const ok = await subscribeToPush(phone);
        if (!ok) setPushError('Notifications permission was not granted.');
        setPushEnabled(ok);
      }
    } catch {
      setPushError('Could not update notification settings.');
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Card className="p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-semibold shrink-0">
          {student.name.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-slate-900">{student.name}</p>
          <p className="text-sm text-slate-500">Class {student.class}{student.section ? `-${student.section}` : ''}{student.roll_no ? ` · Roll ${student.roll_no}` : ''}</p>
        </div>
      </Card>

      {students.length > 1 && (
        <Card className="p-4">
          <SectionLabel>
            <span className="inline-flex items-center gap-1"><SwapIcon className="w-3.5 h-3.5" /> Switch child</span>
          </SectionLabel>
          <div className="space-y-1.5">
            {students.map((s, i) => (
              <button
                key={s.id}
                onClick={() => onSelect(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${i === selectedIndex ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
              >
                {s.name} — Class {s.class}
              </button>
            ))}
          </div>
        </Card>
      )}

      {isPushSupported() && (
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0"><BellIcon /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">Notifications</p>
              <p className="text-xs text-slate-500">Fees, homework &amp; announcements</p>
            </div>
            <button
              onClick={togglePush}
              disabled={pushBusy}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${pushEnabled ? 'bg-emerald-600' : 'bg-slate-200'} disabled:opacity-50`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${pushEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {pushError && <p className="text-xs text-red-600 mt-2">{pushError}</p>}
        </Card>
      )}

      <Card onClick={onLogout} className="p-4 flex items-center gap-3 text-red-600 text-sm font-medium">
        <LogOutIcon /> Log Out
      </Card>
    </div>
  );
}
