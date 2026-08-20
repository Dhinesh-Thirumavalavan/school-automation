type Screen = 'compose' | 'fees' | 'students' | 'dashboard' | 'history' | 'settings';

interface SidebarProps {
  active: Screen;
  onNavigate: (screen: Screen) => void;
}

const navItems: { key: Screen; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'compose', label: 'Compose', icon: '📢' },
  { key: 'history', label: 'History', icon: '🕓' },
  { key: 'fees', label: 'Fees', icon: '💰' },
  { key: 'students', label: 'Students', icon: '🎓' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar({ active, onNavigate }: SidebarProps) {
  return (
    <>
      <aside className="hidden md:flex w-64 h-screen bg-slate-900 text-slate-100 flex-col p-4">
        <div className="text-xl font-semibold mb-8 px-2">E.A.S. Academy</div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                active === item.key ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <span>{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around items-center py-2 z-40">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] ${
              active === item.key ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}