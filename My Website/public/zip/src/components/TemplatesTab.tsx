import React, { useState } from 'react';
import { Clock, Plus, Edit2, Trash2, X, Copy } from 'lucide-react';
import { ShiftTemplate, BusinessSettings, DAYS_MONDAY_START } from '../types';
import { shiftColors } from '../constants';
import { newId, shiftTimingNoteForDay } from '../utils';

interface TemplatesTabProps {
  templates: ShiftTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<ShiftTemplate[]>>;
  settings: BusinessSettings;
}

export function TemplatesTab({ templates, setTemplates, settings }: TemplatesTabProps) {
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAdd = () => {
    setEditingTemplate({
      id: newId(),
      name: 'Morning',
      startTime: '09:00',
      endTime: '17:00',
      requiredStaffCount: 1,
      requiredRole: '',
      requiredRoles: {},
      colorTag: shiftColors[0].value,
      inChargeAllowed: true,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleDuplicate = (tpl: ShiftTemplate) => {
    setEditingTemplate({
      ...tpl,
      id: newId(),
      name: `${tpl.name} (Copy)`
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingTemplate?.name) return alert("Name is required");
    setTemplates(prev => {
      const exists = prev.find(t => t.id === editingTemplate.id);
      if (exists) return prev.map(t => t.id === editingTemplate.id ? editingTemplate : t);
      return [...prev, editingTemplate];
    });
    setIsModalOpen(false);
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 no-print">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Clock size={20} /> Shift Templates</h2>
        <button onClick={handleAdd} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"><Plus size={16}/> Add Template</button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center text-slate-600">
          <p className="mb-2 font-medium text-slate-800">No shift templates yet</p>
          <p className="mx-auto mb-4 max-w-lg text-sm">
            Create templates for each type of shift (times, how many people, roles). Faster: open{' '}
            <strong>Setup</strong>, pick a <strong>business type</strong> (Retail, Restaurant, Clinic, …) and load the
            preset pack.
          </p>
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add your first template
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                <th className="p-3 font-medium">Shift Name</th>
                <th className="p-3 font-medium">Time</th>
                <th className="p-3 font-medium">Req. Staff</th>
                <th className="p-3 font-medium">Roles</th>
                <th className="p-3 font-medium">Day fit</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {templates.map(tpl => (
                <tr key={tpl.id} className="hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-900">
                    <span className={`inline-block px-2 py-1 rounded text-xs border ${tpl.colorTag || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                      {tpl.name}
                    </span>
                  </td>
                  <td className="p-3">{tpl.startTime} - {tpl.endTime}</td>
                  <td className="p-3">{tpl.requiredStaffCount}</td>
                  <td className="p-3">
                    {tpl.requiredRoles && Object.keys(tpl.requiredRoles).length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {Object.entries(tpl.requiredRoles).map(([role, count]) => (
                          <span key={role} className="text-xs bg-slate-100 px-2 py-0.5 rounded">
                            {count}× {role}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span>
                        {tpl.requiredStaffCount}× {tpl.requiredRole || 'Any'}
                      </span>
                    )}
                    {tpl.inChargeAllowed === false && (
                      <div className="text-[10px] text-slate-500 mt-1">In charge not allowed</div>
                    )}
                  </td>
                  <td className="p-3 text-xs text-amber-800 max-w-[200px]">
                    {DAYS_MONDAY_START.filter((d) => {
                      const w = shiftTimingNoteForDay(d, tpl.startTime, tpl.endTime, settings);
                      return w !== null;
                    }).length === 0 ? (
                      <span className="text-emerald-700">OK all days</span>
                    ) : (
                      <ul className="list-disc list-inside space-y-0.5">
                        {DAYS_MONDAY_START.map((d) => {
                          const w = shiftTimingNoteForDay(d, tpl.startTime, tpl.endTime, settings);
                          if (!w) return null;
                          return (
                            <li key={d}>
                              {d}: {w}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </td>
                  <td className="p-3 flex justify-end gap-2">
                    <button onClick={() => handleDuplicate(tpl)} className="p-1 text-slate-400 hover:text-blue-600" title="Duplicate Template"><Copy size={16}/></button>
                    <button onClick={() => { setEditingTemplate(tpl); setIsModalOpen(true); }} className="p-1 text-slate-400 hover:text-blue-600" title="Edit Template"><Edit2 size={16}/></button>
                    <button
                      onClick={() => {
                        if (!confirm('Delete template?')) return;
                        setTemplates((prev) => prev.filter((t) => t.id !== tpl.id));
                      }}
                      className="p-1 text-slate-400 hover:text-red-600"
                      title="Delete Template"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && editingTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Edit Shift Template</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Shift Name</label>
                <input type="text" value={editingTemplate.name} onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Morning Shift" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                  <input type="time" value={editingTemplate.startTime} onChange={e => setEditingTemplate({...editingTemplate, startTime: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                  <input type="time" value={editingTemplate.endTime} onChange={e => setEditingTemplate({...editingTemplate, endTime: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Total Req. Staff</label>
                  <input type="number" min="1" value={editingTemplate.requiredStaffCount} onChange={e => setEditingTemplate({...editingTemplate, requiredStaffCount: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Req. Role (Legacy)</label>
                  <input type="text" value={editingTemplate.requiredRole} onChange={e => setEditingTemplate({...editingTemplate, requiredRole: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Any" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Required Roles (Advanced)</label>
                <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
                  {Object.entries(editingTemplate.requiredRoles || {}).map(([role, count]) => (
                    <div key={role} className="flex items-center gap-2">
                      <input type="text" value={role} readOnly className="flex-1 p-1.5 border border-slate-300 rounded bg-slate-100 text-sm" />
                      <input type="number" min="1" value={count} onChange={e => {
                        const newRoles = { ...editingTemplate.requiredRoles };
                        newRoles[role] = Number(e.target.value);
                        setEditingTemplate({...editingTemplate, requiredRoles: newRoles});
                      }} className="w-20 p-1.5 border border-slate-300 rounded text-sm" />
                      <button onClick={() => {
                        const newRoles = { ...editingTemplate.requiredRoles };
                        delete newRoles[role];
                        setEditingTemplate({...editingTemplate, requiredRoles: newRoles});
                      }} className="p-1 text-red-500 hover:bg-red-50 rounded"><X size={16}/></button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 mt-2">
                    <input type="text" id="newRoleInput" placeholder="New Role (e.g. Manager)" className="flex-1 p-1.5 border border-slate-300 rounded text-sm" />
                    <input type="number" id="newRoleCount" defaultValue={1} min={1} className="w-20 p-1.5 border border-slate-300 rounded text-sm" />
                    <button onClick={() => {
                      const roleInput = document.getElementById('newRoleInput') as HTMLInputElement;
                      const countInput = document.getElementById('newRoleCount') as HTMLInputElement;
                      if (roleInput.value) {
                        setEditingTemplate({
                          ...editingTemplate,
                          requiredRoles: { ...(editingTemplate.requiredRoles || {}), [roleInput.value]: Number(countInput.value) }
                        });
                        roleInput.value = '';
                        countInput.value = '1';
                      }
                    }} className="p-1.5 bg-slate-200 hover:bg-slate-300 rounded text-slate-700"><Plus size={16}/></button>
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editingTemplate.inChargeAllowed !== false}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, inChargeAllowed: e.target.checked })
                  }
                />
                Allow “In charge” / backup lead for this shift (when enabled in Setup)
              </label>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={editingTemplate.notes || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g. Needs two on floor"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Color Tag</label>
                <div className="flex flex-wrap gap-2">
                  {shiftColors.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setEditingTemplate({...editingTemplate, colorTag: color.value})}
                      className={`w-8 h-8 rounded-full border-2 ${color.value.split(' ')[0]} ${editingTemplate.colorTag === color.value ? 'ring-2 ring-offset-2 ring-blue-500 border-transparent' : 'border-slate-200'}`}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Save Template</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
