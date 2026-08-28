import { useState, useEffect } from 'react';
import { API_URL } from '../../config';

interface WhatsAppGroup {
  id: string;
  name: string;
}

interface ClassGroupMappingItem {
  class: string;
  group_chat_id: string;
  group_name: string;
}

const classOptions = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8'];

export default function ClassGroupMapping() {
  const [whatsappGroups, setWhatsappGroups] = useState<WhatsAppGroup[]>([]);
  const [mappings, setMappings] = useState<ClassGroupMappingItem[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchMappings = async () => {
    const res = await fetch(`${API_URL}/api/students/class-groups`);
    const data = await res.json();
    setMappings(data);
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  const getMappingForClass = (cls: string) => mappings.find((m) => m.class === cls);

  const startCapture = async () => {
    setCapturing(true);
    setWhatsappGroups([]);
    await fetch(`${API_URL}/api/students/groups/start-capture`, { method: 'POST' });
  };

  const checkCaptured = async () => {
    const res = await fetch(`${API_URL}/api/students/groups/captured`);
    const data = await res.json();
    setWhatsappGroups(data);
  };

  const stopCapture = async () => {
    await fetch(`${API_URL}/api/students/groups/stop-capture`, { method: 'POST' });
    setCapturing(false);
  };

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
        Link each class to its real WhatsApp Group, so messages post directly into the group parents already use.
      </p>

      {!capturing ? (
        <button
          onClick={startCapture}
          className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-emerald-700 mb-4"
        >
          Start Capturing Groups
        </button>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800 mb-2">
            📱 Now, from the linked phone, send any message (like "test") in each class WhatsApp group you want to map.
          </p>
          <div className="flex gap-2">
            <button
              onClick={checkCaptured}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
            >
              Refresh Captured List
            </button>
            <button
              onClick={stopCapture}
              className="text-xs bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-300"
            >
              Done Capturing
            </button>
          </div>
          <p className="text-xs text-blue-600 mt-2">{whatsappGroups.length} group(s) captured so far</p>
        </div>
      )}

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
                        <option value="">
                          {mapping ? mapping.group_name : 'Not linked — sends individually'}
                        </option>
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
    </div>
  );
}