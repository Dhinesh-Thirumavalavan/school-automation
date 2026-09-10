import { useState } from 'react';
import type { ParentSession } from './types';
import { HomeIcon, InboxIcon, WalletIcon, UserIcon, ChevronLeftIcon, BellIcon } from './icons';
import Home from './screens/Home';
import Inbox from './screens/Inbox';
import Fees from './screens/Fees';
import Profile from './screens/Profile';
import AttendanceDetail from './screens/AttendanceDetail';
import HomeworkDetail from './screens/HomeworkDetail';
import EventsDetail from './screens/EventsDetail';

type Tab = 'home' | 'inbox' | 'fees' | 'profile';
type Pushed = 'attendance' | 'homework' | 'events' | null;

interface ParentAppProps {
  session: ParentSession;
  onLogout: () => void;
}

const tabs: { key: Tab; label: string; icon: typeof HomeIcon }[] = [
  { key: 'home', label: 'Home', icon: HomeIcon },
  { key: 'inbox', label: 'Inbox', icon: InboxIcon },
  { key: 'fees', label: 'Fees', icon: WalletIcon },
  { key: 'profile', label: 'Profile', icon: UserIcon },
];

const pushedTitles: Record<Exclude<Pushed, null>, string> = {
  attendance: 'Attendance',
  homework: 'Homework',
  events: 'Events',
};

export default function ParentApp({ session, onLogout }: ParentAppProps) {
  const [tab, setTab] = useState<Tab>('home');
  const [pushed, setPushed] = useState<Pushed>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const student = session.students[selectedIndex];

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
        <div>
          <p className="text-slate-700 font-medium">No student linked to this phone number yet.</p>
          <p className="text-sm text-slate-500 mt-1">Please contact the school office.</p>
          <button onClick={onLogout} className="mt-4 text-sm text-emerald-700 underline">Log out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        {pushed ? (
          <>
            <button onClick={() => setPushed(null)} className="text-slate-600"><ChevronLeftIcon /></button>
            <span className="font-semibold text-slate-900">{pushedTitles[pushed]}</span>
          </>
        ) : (
          <>
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-semibold text-sm shrink-0">
              EA
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">E.A.S. Academy</p>
              <p className="text-xs text-slate-500">School Portal</p>
            </div>
            <button onClick={() => setTab('inbox')} className="ml-auto text-slate-500 p-1.5 rounded-lg hover:bg-slate-100">
              <BellIcon />
            </button>
          </>
        )}
      </header>

      <main className="flex-1 overflow-y-auto pb-4">
        {pushed === 'attendance' && <AttendanceDetail student={student} />}
        {pushed === 'homework' && <HomeworkDetail student={student} />}
        {pushed === 'events' && <EventsDetail />}
        {!pushed && tab === 'home' && (
          <Home
            student={student}
            onOpenAttendance={() => setPushed('attendance')}
            onOpenFees={() => setTab('fees')}
            onOpenHomework={() => setPushed('homework')}
            onOpenEvents={() => setPushed('events')}
            onOpenInbox={() => setTab('inbox')}
          />
        )}
        {!pushed && tab === 'inbox' && <Inbox />}
        {!pushed && tab === 'fees' && <Fees student={student} />}
        {!pushed && tab === 'profile' && (
          <Profile students={session.students} selectedIndex={selectedIndex} onSelect={setSelectedIndex} onLogout={onLogout} />
        )}
      </main>

      {!pushed && (
        <nav className="bg-white border-t border-slate-200 flex sticky bottom-0">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs ${tab === key ? 'text-emerald-700' : 'text-slate-400'}`}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
