interface HeaderProps {
  title: string;
  userName?: string;
  onLogout?: () => void;
}

export default function Header({ title, userName, onLogout }: HeaderProps) {
  return (
<header className="border-b border-slate-200 px-4 md:px-6 py-4 bg-white flex items-center justify-between gap-2 flex-wrap min-w-0">
      <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
      {userName && onLogout && (
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm text-slate-500 truncate max-w-25 md:max-w-none">{userName}</span>
          <button onClick={onLogout} className="text-xs font-medium text-slate-500 hover:text-red-600 hover:underline whitespace-nowrap">
            Logout
          </button>
        </div>
      )}
    </header>
  );
}