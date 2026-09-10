import { useState } from 'react';
import { parentApi } from './api';
import type { ParentSession } from './types';

interface ParentLoginProps {
  onLogin: (session: ParentSession) => void;
}

export default function ParentLogin({ onLogin }: ParentLoginProps) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await parentApi.requestOtp(phone);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await parentApi.verifyOtp(phone, otp);
      onLogin({ phone: data.phone, students: data.students });
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-3">
            K
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Kalvi</h1>
          <p className="text-sm text-slate-500 mt-1">Parent &amp; Student Portal</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleRequestOtp} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Parent phone number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              <p className="text-xs text-slate-400 mt-1">The number registered with the school office</p>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Enter OTP</label>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code sent to your WhatsApp"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 tracking-widest"
                maxLength={6}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
              className="w-full text-xs text-slate-500 hover:underline"
            >
              Change phone number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
