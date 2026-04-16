import React, { useState } from 'react';
import { CalendarOff, Plus, Trash2, X } from 'lucide-react';
import { Leave, Staff } from '../types';
import { newId } from '../utils';

interface LeaveTabProps {
  leaves: Leave[];
  setLeaves: React.Dispatch<React.SetStateAction<Leave[]>>;
  staffList: Staff[];
}

export function LeaveTab({ leaves, setLeaves, staffList }: LeaveTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLeave, setNewLeave] = useState<Partial<Leave>>({
    staffId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: ''
  });

  const handleAdd = () => {
    if (!newLeave.staffId || !newLeave.startDate || !newLeave.endDate) {
      return alert("Please fill all required fields.");
    }
    if (new Date(newLeave.endDate) < new Date(newLeave.startDate)) {
      return alert("End date cannot be before start date.");
    }
    setLeaves([...leaves, { ...newLeave, id: newId() } as Leave]);
    setIsModalOpen(false);
    setNewLeave({
      staffId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      reason: ''
    });
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 no-print">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><CalendarOff size={20} /> Leave & Time Off</h2>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"><Plus size={16}/> Add Leave</button>
      </div>
      <p className="mb-4 max-w-3xl text-xs text-slate-600">
        Dates use the calendar (YYYY-MM-DD). Leave stops auto-schedule and blocks new shifts. When leave is added or
        changed, any existing shifts on those dates are removed from the schedule automatically.
      </p>

      {leaves.length === 0 ? (
        <div className="text-center py-8 text-slate-500">No leave records added.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                <th className="p-3 font-medium">Staff</th>
                <th className="p-3 font-medium">Start Date</th>
                <th className="p-3 font-medium">End Date</th>
                <th className="p-3 font-medium">Reason</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {leaves.map(leave => {
                const staff = staffList.find(s => s.id === leave.staffId);
                return (
                  <tr key={leave.id} className="hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-900">{staff?.name || 'Unknown'}</td>
                    <td className="p-3">{leave.startDate}</td>
                    <td className="p-3">{leave.endDate}</td>
                    <td className="p-3 text-slate-500">{leave.reason || '-'}</td>
                    <td className="p-3 flex justify-end gap-2">
                      <button onClick={() => { if(confirm('Delete leave record?')) setLeaves(leaves.filter(l => l.id !== leave.id)) }} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Add Leave / Time Off</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Staff Member</label>
                <select value={newLeave.staffId} onChange={e => setNewLeave({...newLeave, staffId: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Staff...</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input type="date" value={newLeave.startDate} onChange={e => setNewLeave({...newLeave, startDate: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input type="date" value={newLeave.endDate} onChange={e => setNewLeave({...newLeave, endDate: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason (Optional)</label>
                <input type="text" value={newLeave.reason} onChange={e => setNewLeave({...newLeave, reason: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Vacation, Sick, etc." />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
              <button onClick={handleAdd} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Save Leave</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
