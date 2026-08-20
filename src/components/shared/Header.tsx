export default function Header({ title }: { title: string }) {
  return (
    <header className="border-b border-slate-200 px-6 py-4 bg-white">
      <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
    </header>
  );
}