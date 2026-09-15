import { lazy, Suspense, useState } from 'react';
import type { ParentSession } from './types';
import { HomeIcon, InboxIcon, WalletIcon, UserIcon, ChevronLeftIcon, BellIcon } from './icons';
import Home from './screens/Home';
import Inbox from './screens/Inbox';
import Fees from './screens/Fees';
import Profile from './screens/Profile';
import AttendanceDetail from './screens/AttendanceDetail';
import HomeworkDetail from './screens/HomeworkDetail';
import EventsDetail from './screens/EventsDetail';
import { Skeleton } from './ui';

// mapbox-gl is a large dependency — only fetch it when the Bus screen is opened
const BusDetail = lazy(() => import('./screens/BusDetail'));

type Tab = 'home' | 'inbox' | 'fees' | 'profile';
type Pushed = 'attendance' | 'homework' | 'events' | 'bus' | null;

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
  bus: 'Bus Tracking',
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
      <header className="bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm shadow-slate-200/50">
        {pushed ? (
          <>
            <button onClick={() => setPushed(null)} className="text-slate-600 -ml-1 p-1 rounded-lg hover:bg-slate-100 active:scale-95 transition-transform">
              <ChevronLeftIcon />
            </button>
            <span className="font-semibold text-slate-900">{pushedTitles[pushed]}</span>
          </>
        ) : (
          <>
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm shadow-emerald-900/20">
              EA
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate leading-tight">E.A.S. Academy</p>
              <p className="text-[11px] text-slate-500 leading-tight">School Portal</p>
            </div>
            <button onClick={() => setTab('inbox')} className="ml-auto text-slate-500 p-1.5 rounded-lg hover:bg-slate-100 active:scale-95 transition-transform">
              <BellIcon />
            </button>
          </>
        )}
      </header>

      <main className="flex-1 overflow-y-auto pb-4">
        {pushed === 'attendance' && <AttendanceDetail student={student} />}
        {pushed === 'homework' && <HomeworkDetail student={student} />}
        {pushed === 'events' && <EventsDetail />}
        {pushed === 'bus' && (
          <Suspense fallback={<div className="p-4"><Skeleton className="h-64 rounded-2xl" /></div>}>
            <BusDetail student={student} />
          </Suspense>
        )}
        {!pushed && tab === 'home' && (
          <Home
            student={student}
            onOpenAttendance={() => setPushed('attendance')}
            onOpenFees={() => setTab('fees')}
            onOpenHomework={() => setPushed('homework')}
            onOpenEvents={() => setPushed('events')}
            onOpenBus={() => setPushed('bus')}
            onOpenInbox={() => setTab('inbox')}
          />
        )}
        {!pushed && tab === 'inbox' && <Inbox />}
        {!pushed && tab === 'fees' && <Fees student={student} />}
        {!pushed && tab === 'profile' && (
          <Profile students={session.students} selectedIndex={selectedIndex} onSelect={setSelectedIndex} onLogout={onLogout} phone={session.phone} />
        )}
      </main>

      {!pushed && (
        <nav className="bg-white border-t border-slate-200 flex sticky bottom-0 pb-[env(safe-area-inset-bottom)]">
          {tabs.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors ${active ? 'text-emerald-700' : 'text-slate-400'}`}
              >
                <span className={`px-3 py-1 rounded-full transition-colors ${active ? 'bg-emerald-50' : ''}`}>
                  <Icon />
                </span>
                <span className={active ? 'font-semibold' : ''}>{label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
