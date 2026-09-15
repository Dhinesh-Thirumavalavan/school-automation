import { useState } from 'react';

export interface BusFormValues {
  bus_number: string;
  driver_name: string;
  driver_phone: string;
  pin: string;
}

interface BusFormModalProps {
  initial?: BusFormValues;
  onSave: (values: BusFormValues) => void;
  onClose: () => void;
}

export default function BusFormModal({ initial, onSave, onClose }: BusFormModalProps) {
  const [busNumber, setBusNumber] = useState(initial?.bus_number ?? '');
  const [driverName, setDriverName] = useState(initial?.driver_name ?? '');
  const [driverPhone, setDriverPhone] = useState(initial?.driver_phone ?? '');
  const [pin, setPin] = useState(initial?.pin ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ bus_number: busNumber, driver_name: driverName, driver_phone: driverPhone, pin });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">{initial ? 'Edit Bus' : 'Add Bus'}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bus Number</label>
            <input
              value={busNumber}
              onChange={(e) => setBusNumber(e.target.value)}
              placeholder="e.g. Bus 04"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Driver Name</label>
            <input
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Driver Phone</label>
            <input
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Driver PIN</label>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 1234"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
            <p className="text-xs text-slate-400 mt-1">The driver enters this with the bus number to log into the trip tracker.</p>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 text-sm font-medium py-2 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="flex-1 bg-emerald-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-emerald-700">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
