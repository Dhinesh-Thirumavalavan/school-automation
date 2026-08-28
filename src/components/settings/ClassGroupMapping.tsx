import { useState, useEffect } from 'react';
import { API_URL } from '../../config';

interface WhatsAppGroup {
  id: string;
  name: string;
}

interface ClassGroupMapping {
  class: string;
  group_chat_id: string;
  group_name: string;
}

const classOptions = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8'];

export default function ClassGroupMapping() {
  const [whatsappGroups, setWhatsappGroups] = useState<WhatsAppGroup[]>([]);
  const [mappings, setMappings] = useState<ClassGroupMapping[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchGroups = async () => {
    setLoadingGroups(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/students/groups`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Could not load WhatsApp groups');
        return;
      }
      const data = await res.json();
      setWhatsappGroups(data);
    } catch (err) {
      setError('Could not connect to WhatsApp service');
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchMappings = async () => {
    const res = await fetch(`${API_URL}/api/students/class-groups`);
    const data = await res.json();
    setMappings(data);
  };

  useEffect(() => {
    fetchGroups();
    fetchMappings();
  }, []);

  const getMappingForClass = (cls: string) => mappings.find((m) => m.class === cls);

  const handleAssign = async (cls: string, groupId: string) => {
    if (!groupId) return;
    setSaving(cls);
    try {
      const group = whatsappGroups.find((g) => g.id === groupId);
      await fetch(`${API_URL}/api/students/class-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class: cls, group_chat_id: groupId, group_name: group?.name || '' }),
      });
      await fetchMappings();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

  const handleUnassign = async (cls: string) => {
    setSaving(cls);
    try {
      await fetch(`${API_URL}/api/students/class-groups/${cls}`, { method: 'DELETE' });
      await fetchMappings();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="max-w-xl">
      <h3 className="text-sm font-semibold text-slate-800 mb-2">WhatsApp Group Mapping</h3>
      <p className="text-xs text-slate-500 mb-4">
        Link each class to its real WhatsApp Group, so messages post directly into the group parents already use — instead of individual messages.
      </p>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
          ⚠️ {error}
          <button onClick={fetchGroups} className="ml-2 underline">Retry</button>
        </div>
      )}

      {loadingGroups ? (
        <p className="text-sm text-slate-400">Loading WhatsApp groups...</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Class</th>
                <th className="px-4 py-2 font-medium">Mapped WhatsApp Group</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classOptions.map((cls) => {
                const mapping = getMappingForClass(cls);
                return (
                  <tr key={cls}>
                    <td className="px-4 py-2 font-medium text-slate-800">{cls}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={mapping?.group_chat_id || ''}
                          onChange={(e) => handleAssign(cls, e.target.value)}
                          disabled={saving === cls}
                          className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">Not linked — sends individually</option>
                          {whatsappGroups.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                        {mapping && (
                          <button
                            onClick={() => handleUnassign(cls)}
                            disabled={saving === cls}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Unlink
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}