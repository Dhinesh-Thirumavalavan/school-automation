interface FeeStatusBadgeProps {
  status: 'paid' | 'unpaid' | 'overdue';
}

export default function FeeStatusBadge({ status }: FeeStatusBadgeProps) {
  const styles = {
    paid: 'bg-emerald-100 text-emerald-700',
    unpaid: 'bg-amber-100 text-amber-700',
    overdue: 'bg-red-100 text-red-700',
  };

  const labels = {
    paid: 'Paid',
    unpaid: 'Unpaid',
    overdue: 'Overdue',
  };

  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}