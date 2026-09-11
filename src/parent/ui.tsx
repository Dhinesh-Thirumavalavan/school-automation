import type { ReactNode } from 'react';

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const interactive = onClick ? 'text-left w-full active:scale-[0.99] transition-transform' : '';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={`bg-white border border-slate-200 rounded-2xl shadow-sm shadow-slate-200/60 ${interactive} ${className}`}>
      {children}
    </Tag>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">{children}</p>;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200/80 rounded-md ${className}`} />;
}

export function SkeletonCard() {
  return (
    <Card className="p-4 space-y-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-3 w-40" />
    </Card>
  );
}

export function EmptyState({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 text-slate-400">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">{icon}</div>
      <p className="text-sm">{title}</p>
    </div>
  );
}
