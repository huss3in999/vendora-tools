import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Users, Plus, Edit2, Trash2, X, Download, Upload, FileText, Clipboard, ListChecks } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Staff, DayOfWeek, DAYS_MONDAY_START, ShiftPreferenceBand, TimeRange } from '../types';
import { defaultAvailability } from '../constants';
import { newId } from '../utils';
import { normalizeStaffRecord } from '../staffAvailability';

function uniqOrderedDays(list: Iterable<DayOfWeek>): DayOfWeek[] {
  const set = new Set<DayOfWeek>(list);
  return DAYS_MONDAY_START.filter((d) => set.has(d));
}

interface StaffTabProps {
  staffList: Staff[];
  setStaffList: React.Dispatch<React.SetStateAction<Staff[]>>;
  onDeleteStaff: (staffId: string, staffName: string) => void;
}

export function StaffTab({ staffList, setStaffList, onDeleteStaff }: StaffTabProps) {
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filterName, setFilterName] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkMaxHoursEnabled, setBulkMaxHoursEnabled] = useState(false);
  const [bulkMaxHours, setBulkMaxHours] = useState(40);
  const [bulkReqCapMode, setBulkReqCapMode] = useState<'leave' | 'set' | 'clear'>('leave');
  const [bulkReqCap, setBulkReqCap] = useState(24);
  const [bulkExperienced, setBulkExperienced] = useState<'leave' | 'yes' | 'no'>('leave');
  const [bulkDeptMode, setBulkDeptMode] = useState<'leave' | 'set'>('leave');
  const [bulkDept, setBulkDept] = useState('');
  const [bulkFixedMode, setBulkFixedMode] = useState<'leave' | 'merge' | 'replace' | 'clear'>('leave');
  const [bulkFixedDays, setBulkFixedDays] = useState<Set<DayOfWeek>>(new Set());
  const [bulkPreferMode, setBulkPreferMode] = useState<'leave' | 'merge' | 'replace' | 'clear'>('leave');
  const [bulkPreferDays, setBulkPreferDays] = useState<Set<DayOfWeek>>(new Set());
  const [bulkStrongBand, setBulkStrongBand] = useState<'leave' | 'yes' | 'no'>('leave');

  const filteredStaff = useMemo(() => {
    const q = filterName.trim().toLowerCase();
    const d = filterDepartment.trim().toLowerCase();
    return staffList.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q) && !s.role.toLowerCase().includes(q)) return false;
      if (d && !(s.department || '').toLowerCase().includes(d)) return false;
      return true;
    });
  }, [staffList, filterName, filterDepartment]);

  const allFilteredSelected =
    filteredStaff.length > 0 && filteredStaff.every((s) => selectedIds.has(s.id));

  const toggleSelectStaff = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredStaff.forEach((s) => next.delete(s.id));
      } else {
        filteredStaff.forEach((s) => next.add(s.id));
      }
      return next;
    });
  }, [allFilteredSelected, filteredStaff]);

  const applyBulkEdits = useCallback(() => {
    if (selectedIds.size === 0) {
      window.alert('Select at least one person using the checkboxes (filter the list if needed).');
      return;
    }
    setStaffList((prev) =>
      prev.map((s) => {
        if (!selectedIds.has(s.id)) return s;
        let next: Staff = { ...s };
        if (bulkMaxHoursEnabled) {
          next.maxHoursWeek = Math.max(0, Number(bulkMaxHours) || 0);
        }
        if (bulkReqCapMode === 'set') {
          const v = Math.max(0, Number(bulkReqCap) || 0);
          next.requestedWeeklyHoursCap = v > 0 ? v : undefined;
        } else if (bulkReqCapMode === 'clear') {
          next.requestedWeeklyHoursCap = undefined;
        }
        if (bulkExperienced === 'yes') next.experienced = true;
        if (bulkExperienced === 'no') next.experienced = false;
        if (bulkDeptMode === 'set') next.department = bulkDept.trim();

        if (bulkFixedMode === 'clear') {
          next.fixedWeeklyDaysOff = undefined;
        } else if (bulkFixedMode === 'replace') {
          const arr = uniqOrderedDays([...bulkFixedDays]);
          next.fixedWeeklyDaysOff = arr.length ? arr : undefined;
        } else if (bulkFixedMode === 'merge') {
          const arr = uniqOrderedDays([...(next.fixedWeeklyDaysOff || []), ...bulkFixedDays]);
          next.fixedWeeklyDaysOff = arr.length ? arr : undefined;
        }

        if (bulkPreferMode === 'clear') {
          next.preferSchedulingOnDays = undefined;
        } else if (bulkPreferMode === 'replace') {
          const arr = uniqOrderedDays([...bulkPreferDays]);
          next.preferSchedulingOnDays = arr.length ? arr : undefined;
        } else if (bulkPreferMode === 'merge') {
          const arr = uniqOrderedDays([...(next.preferSchedulingOnDays || []), ...bulkPreferDays]);
          next.preferSchedulingOnDays = arr.length ? arr : undefined;
        }

        if (bulkStrongBand === 'yes') next.staffStrongBandPreference = true;
        if (bulkStrongBand === 'no') next.staffStrongBandPreference = false;

        return next;
      })
    );
    setBulkModalOpen(false);
  }, [
    selectedIds,
    bulkMaxHoursEnabled,
    bulkMaxHours,
    bulkReqCapMode,
    bulkReqCap,
    bulkExperienced,
    bulkDeptMode,
    bulkDept,
    bulkFixedMode,
    bulkFixedDays,
    bulkPreferMode,
    bulkPreferDays,
    bulkStrongBand,
  ]);

  const toggleBulkFixedDay = (day: DayOfWeek) => {
    setBulkFixedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const toggleBulkPreferDay = (day: DayOfWeek) => {
    setBulkPreferDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const handleAdd = () => {
    setEditingStaff({ 
      id: newId(), 
      name: '', 
      role: '', 
      department: '', 
      availability: JSON.parse(JSON.stringify(defaultAvailability)), 
      maxHoursWeek: 40, 
      notes: '',
      phone: '',
      experienced: false
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingStaff?.name) return alert("Name is required");
    const raw = { ...editingStaff };
    if (raw.unavailableDates?.length) {
      const dates = raw.unavailableDates.map((d) => d.trim()).filter(Boolean);
      raw.unavailableDates = dates.length ? dates : undefined;
    }
    if (raw.preferredBandExceptions?.length) {
      const ex = raw.preferredBandExceptions.filter((r) => r.date && r.date.trim());
      raw.preferredBandExceptions = ex.length ? ex : undefined;
    }
    setStaffList((prev) => {
      const exists = prev.find((s) => s.id === raw.id);
      if (exists) return prev.map((s) => (s.id === raw.id ? raw : s));
      return [...prev, raw];
    });
    setIsModalOpen(false);
  };

  const handleAvailabilityChange = (day: DayOfWeek, field: string, value: any) => {
    if (!editingStaff) return;
    setEditingStaff({
      ...editingStaff,
      availability: {
        ...editingStaff.availability,
        [day]: {
          ...editingStaff.availability[day],
          [field]: value
        }
      }
    });
  };

  const handleExportStaff = () => {
    const data = staffList.map(s => ({
      Name: s.name,
      Role: s.role,
      Department: s.department || '',
      MaxHoursWeek: s.maxHoursWeek,
      Phone: s.phone || '',
      Experienced: s.experienced ? 'Yes' : 'No',
      Notes: s.notes || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Staff");
    XLSX.writeFile(wb, `staff_list_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadTemplate = () => {
    const data = [
      { Name: 'John Doe', Role: 'Manager', Department: 'Sales', MaxHoursWeek: 40, Phone: '555-0100', Experienced: 'Yes', Notes: 'Can open' },
      { Name: 'Jane Smith', Role: 'Cashier', Department: 'Front End', MaxHoursWeek: 20, Phone: '555-0101', Experienced: 'No', Notes: 'Student' }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `staff_template.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        if (json.length === 0) {
          alert('The file appears to be empty.');
          return;
        }

        // Check headers
        const firstRow = json[0];
        const keys = Object.keys(firstRow).map(k => k.toLowerCase());
        if (!keys.some(k => k.includes('name')) || !keys.some(k => k.includes('role') || k.includes('position'))) {
          alert('Missing required columns. Please ensure your file has "Name" and "Role" columns.');
          return;
        }

        const newStaff: Staff[] = [];
        json.forEach(row => {
          // Find actual keys based on lowercased match to be forgiving
          const getVal = (possibleNames: string[]) => {
            const key = Object.keys(row).find(k => possibleNames.includes(k.toLowerCase().trim()));
            return key ? row[key] : undefined;
          };

          const name = getVal(['name']);
          const role = getVal(['role', 'position']);
          const dept = getVal(['department', 'dept']);
          const maxHrs = getVal(['maxhoursweek', 'max hours', 'max hrs', 'maximum hours']);
          const phone = getVal(['phone', 'phone number']);
          const exp = getVal(['experienced', 'experience']);
          const notes = getVal(['notes', 'note']);

          if (name) {
            newStaff.push({
              id: newId(),
              name: String(name).trim(),
              role: role ? String(role).trim() : 'Staff',
              department: dept ? String(dept).trim() : '',
              maxHoursWeek: parseInt(maxHrs) || 40,
              availability: JSON.parse(JSON.stringify(defaultAvailability)),
              phone: phone ? String(phone).trim() : '',
              experienced: exp ? String(exp).toLowerCase().includes('yes') || String(exp) === 'true' : false,
              notes: notes ? String(notes).trim() : ''
            });
          }
        });

        if (newStaff.length > 0) {
          setStaffList(prev => [...prev, ...newStaff]);
          alert(`Successfully imported ${newStaff.length} staff members!`);
        } else {
          alert('No valid staff found in file. Please check the format.');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to parse file. Please ensure it is a valid Excel (.xlsx) or CSV file.');
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePasteSubmit = () => {
    try {
      const lines = pasteText.split('\n').filter(l => l.trim());
      const newStaff: Staff[] = [];
      
      lines.forEach(line => {
        const parts = line.split('\t');
        if (parts.length >= 1 && parts[0].trim().toLowerCase() !== 'name') {
          newStaff.push({
            id: newId(),
            name: parts[0].trim(),
            role: parts[1]?.trim() || 'Staff',
            department: parts[2]?.trim() || '',
            maxHoursWeek: parseInt(parts[3]) || 40,
            availability: JSON.parse(JSON.stringify(defaultAvailability)),
            notes: ''
          });
        }
      });

      if (newStaff.length > 0) {
        setStaffList(prev => [...prev, ...newStaff]);
        alert(`Successfully imported ${newStaff.length} staff members!`);
        setIsPasteModalOpen(false);
        setPasteText('');
      } else {
        alert('No valid staff found. Please paste data from Excel (Name, Role, Dept, MaxHrs).');
      }
    } catch (err) {
      alert('Failed to parse pasted text.');
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 no-print">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Users size={20} /> Staff Management</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleDownloadTemplate} className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 flex items-center gap-1" title="Download Excel Template"><FileText size={16}/> Template</button>
          <button onClick={() => fileInputRef.current?.click()} className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 flex items-center gap-1" title="Import Excel/CSV"><Upload size={16}/> Import</button>
          <input type="file" accept=".xlsx, .csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button onClick={() => setIsPasteModalOpen(true)} className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 flex items-center gap-1" title="Paste from Excel"><Clipboard size={16}/> Paste</button>
          <button onClick={handleExportStaff} className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 flex items-center gap-1" title="Export Excel"><Download size={16}/> Export</button>
          <button onClick={handleAdd} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"><Plus size={16}/> Add Staff</button>
          <button
            type="button"
            onClick={() => setBulkModalOpen(true)}
            disabled={staffList.length === 0}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="Change max hours, caps, fixed days off, and more for everyone you select"
          >
            <ListChecks size={16} /> Bulk edit ({selectedIds.size})
          </button>
        </div>
      </div>

      {staffList.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">Filter by name or role</label>
            <input
              type="search"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Type to narrow the list…"
              className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">Filter by department</label>
            <input
              type="search"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              placeholder="e.g. Front End"
              className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-xs text-slate-600">
            Showing <strong>{filteredStaff.length}</strong> of {staffList.length}
            {selectedIds.size > 0 && (
              <>
                {' '}
                · <strong>{selectedIds.size}</strong> selected
              </>
            )}
          </div>
        </div>
      )}
      
      {staffList.length === 0 ? (
        <div className="text-center py-8 text-slate-500">No staff members added yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                <th className="w-10 p-2">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    title="Select or clear all visible rows"
                    disabled={filteredStaff.length === 0}
                  />
                </th>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Role</th>
                <th className="p-3 font-medium">Available Days</th>
                <th className="p-3 font-medium">Max Hrs</th>
                <th className="p-3 font-medium">Schedule hints</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {filteredStaff.map(staff => {
                // Handle legacy availability format
                const availDays: string[] = Array.isArray(staff.availability as unknown)
                  ? (staff.availability as unknown as string[])
                  : staff.legacyAvailability
                    ? staff.legacyAvailability
                    : Object.entries(staff.availability)
                        .filter(([, v]) => {
                          const tr = v as TimeRange;
                          return !!(tr && typeof tr.isAvailable === 'boolean' && tr.isAvailable);
                        })
                        .map(([k]) => k);

                const bandDays = staff.preferredBandByDay
                  ? Object.keys(staff.preferredBandByDay).length
                  : 0;
                const hasScheduleHints =
                  bandDays > 0 ||
                  !!staff.staffScheduleRequestBand ||
                  !!(staff.staffScheduleRequestNote && staff.staffScheduleRequestNote.trim()) ||
                  (typeof staff.minMorningDaysPerWeek === 'number' && staff.minMorningDaysPerWeek > 0) ||
                  !!(staff.fixedWeeklyDaysOff && staff.fixedWeeklyDaysOff.length > 0) ||
                  typeof staff.requestedWeeklyHoursCap === 'number' ||
                  !!(staff.preferSchedulingOnDays && staff.preferSchedulingOnDays.length > 0) ||
                  !!(staff.preferredBandExceptions && staff.preferredBandExceptions.length > 0) ||
                  !!(staff.unavailableDates && staff.unavailableDates.length > 0) ||
                  !!staff.staffStrongBandPreference;

                const fixedOffSet = new Set(staff.fixedWeeklyDaysOff || []);
                const schedulableAvailDays = (availDays as string[]).filter((d) => !fixedOffSet.has(d as DayOfWeek));
                const fixedOffList = staff.fixedWeeklyDaysOff || [];

                return (
                  <tr key={staff.id} className="hover:bg-slate-50">
                    <td className="p-2 align-middle">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300"
                        checked={selectedIds.has(staff.id)}
                        onChange={() => toggleSelectStaff(staff.id)}
                        title="Include in bulk edit"
                      />
                    </td>
                    <td className="p-3 font-medium text-slate-900">{staff.name}</td>
                    <td className="p-3">{staff.role} {staff.department && <span className="text-slate-400 text-xs">({staff.department})</span>}</td>
                    <td className="p-3 text-xs text-slate-600">
                      <div className="text-slate-500">
                        {schedulableAvailDays.length > 0
                          ? schedulableAvailDays.map((d) => d.substring(0, 3)).join(', ')
                          : '—'}
                      </div>
                      {fixedOffList.length > 0 && (
                        <div
                          className="mt-0.5 font-medium text-amber-800"
                          title="These weekdays are always off (rota + auto-schedule)"
                        >
                          Fixed off: {fixedOffList.map((d) => d.slice(0, 3)).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="p-3">{staff.maxHoursWeek}</td>
                    <td className="p-3 text-xs text-slate-600 max-w-[180px]">
                      {hasScheduleHints ? (
                        <span className="inline-flex flex-col gap-0.5">
                          <span className="font-medium text-blue-800">Yes</span>
                          {bandDays > 0 && <span>{bandDays} day band{bandDays !== 1 ? 's' : ''}</span>}
                          {staff.staffScheduleRequestBand && (
                            <span>Week: {staff.staffScheduleRequestBand}</span>
                          )}
                          {typeof staff.minMorningDaysPerWeek === 'number' &&
                            staff.minMorningDaysPerWeek > 0 && (
                              <span>≥{staff.minMorningDaysPerWeek} mornings</span>
                            )}
                          {staff.fixedWeeklyDaysOff && staff.fixedWeeklyDaysOff.length > 0 && (
                            <span>Fixed off {staff.fixedWeeklyDaysOff.length}d</span>
                          )}
                          {typeof staff.requestedWeeklyHoursCap === 'number' &&
                            staff.requestedWeeklyHoursCap > 0 && (
                              <span>Cap {staff.requestedWeeklyHoursCap}h</span>
                            )}
                          {staff.preferredBandExceptions && staff.preferredBandExceptions.length > 0 && (
                            <span>{staff.preferredBandExceptions.length} date band</span>
                          )}
                          {staff.unavailableDates && staff.unavailableDates.length > 0 && (
                            <span>{staff.unavailableDates.length} date off</span>
                          )}
                          {staff.staffStrongBandPreference && <span>Strong band</span>}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-3 flex justify-end gap-2">
                      <button onClick={() => { 
                        let editData = normalizeStaffRecord({ ...staff });
                        if (editData.legacyAvailability) {
                          const newAvail = JSON.parse(JSON.stringify(defaultAvailability));
                          DAYS_MONDAY_START.forEach(d => {
                            newAvail[d].isAvailable = editData.legacyAvailability!.includes(d);
                          });
                          editData.availability = newAvail;
                          delete editData.legacyAvailability;
                        }
                        setEditingStaff(editData); 
                        setIsModalOpen(true); 
                      }} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 size={16}/></button>
                      <button
                        onClick={() => onDeleteStaff(staff.id, staff.name)}
                        className="p-1 text-slate-400 hover:text-red-600"
                        title="Remove staff"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold">Bulk edit staff</h3>
                <p className="text-xs text-slate-500">
                  Applies only to checked people ({selectedIds.size}). Use filters above to pick a group, then Select all.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 p-6 text-sm">
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded"
                  checked={bulkMaxHoursEnabled}
                  onChange={(e) => setBulkMaxHoursEnabled(e.target.checked)}
                />
                <span>
                  Set max hours / week to{' '}
                  <input
                    type="number"
                    min={0}
                    className="inline w-20 rounded border border-slate-300 px-2 py-1"
                    value={bulkMaxHours}
                    onChange={(e) => setBulkMaxHours(Number(e.target.value))}
                  />
                </span>
              </label>

              <div>
                <div className="mb-1 font-medium text-slate-800">Requested weekly hours cap (softer limit)</div>
                <div className="flex flex-col gap-2 text-xs">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="bulkCap"
                      checked={bulkReqCapMode === 'leave'}
                      onChange={() => setBulkReqCapMode('leave')}
                    />
                    Leave unchanged
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="bulkCap"
                      checked={bulkReqCapMode === 'clear'}
                      onChange={() => setBulkReqCapMode('clear')}
                    />
                    Clear cap (use only max hours / week)
                  </label>
                  <label className="flex flex-wrap items-center gap-2">
                    <input
                      type="radio"
                      name="bulkCap"
                      checked={bulkReqCapMode === 'set'}
                      onChange={() => setBulkReqCapMode('set')}
                    />
                    Set to
                    <input
                      type="number"
                      min={0}
                      className="w-20 rounded border border-slate-300 px-2 py-1"
                      value={bulkReqCap}
                      onChange={(e) => setBulkReqCap(Number(e.target.value))}
                    />
                    hours (0 clears)
                  </label>
                </div>
              </div>

              <div>
                <div className="mb-1 font-medium text-slate-800">Experienced flag</div>
                <select
                  className="w-full rounded-lg border border-slate-300 p-2"
                  value={bulkExperienced}
                  onChange={(e) => setBulkExperienced(e.target.value as typeof bulkExperienced)}
                >
                  <option value="leave">Leave unchanged</option>
                  <option value="yes">Set to experienced</option>
                  <option value="no">Set to not experienced</option>
                </select>
              </div>

              <div>
                <div className="mb-1 font-medium text-slate-800">Department</div>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="radio"
                      name="bulkDept"
                      checked={bulkDeptMode === 'leave'}
                      onChange={() => setBulkDeptMode('leave')}
                    />
                    Leave unchanged
                  </label>
                  <label className="flex flex-wrap items-center gap-2 text-xs">
                    <input
                      type="radio"
                      name="bulkDept"
                      checked={bulkDeptMode === 'set'}
                      onChange={() => setBulkDeptMode('set')}
                    />
                    Set to
                    <input
                      type="text"
                      className="min-w-[12rem] flex-1 rounded border border-slate-300 px-2 py-1"
                      value={bulkDept}
                      onChange={(e) => setBulkDept(e.target.value)}
                      placeholder="Department name"
                    />
                  </label>
                </div>
              </div>

              <div>
                <div className="mb-1 font-medium text-slate-800">Fixed weekly days off (same every week)</div>
                <select
                  className="mb-2 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  value={bulkFixedMode}
                  onChange={(e) => setBulkFixedMode(e.target.value as typeof bulkFixedMode)}
                >
                  <option value="leave">Leave unchanged</option>
                  <option value="merge">Add these weekdays to existing fixed offs</option>
                  <option value="replace">Replace fixed offs with selection below</option>
                  <option value="clear">Clear fixed weekly days off</option>
                </select>
                <div className="flex flex-wrap gap-2">
                  {DAYS_MONDAY_START.map((day) => (
                    <label key={day} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={bulkFixedDays.has(day)}
                        onChange={() => toggleBulkFixedDay(day)}
                      />
                      {day.slice(0, 3)}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1 font-medium text-slate-800">Prefer scheduling on (soft bonus)</div>
                <select
                  className="mb-2 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  value={bulkPreferMode}
                  onChange={(e) => setBulkPreferMode(e.target.value as typeof bulkPreferMode)}
                >
                  <option value="leave">Leave unchanged</option>
                  <option value="merge">Add these weekdays to existing preferences</option>
                  <option value="replace">Replace with selection below</option>
                  <option value="clear">Clear</option>
                </select>
                <div className="flex flex-wrap gap-2">
                  {DAYS_MONDAY_START.map((day) => (
                    <label key={day} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={bulkPreferDays.has(day)}
                        onChange={() => toggleBulkPreferDay(day)}
                      />
                      {day.slice(0, 3)}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1 font-medium text-slate-800">Strong band preference</div>
                <select
                  className="w-full rounded-lg border border-slate-300 p-2"
                  value={bulkStrongBand}
                  onChange={(e) => setBulkStrongBand(e.target.value as typeof bulkStrongBand)}
                >
                  <option value="leave">Leave unchanged</option>
                  <option value="yes">Turn on (stronger auto-schedule weight)</option>
                  <option value="no">Turn off</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyBulkEdits}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Apply to {selectedIds.size} staff
              </button>
            </div>
          </div>
        </div>
      )}

      {isPasteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Paste Staff List</h3>
              <button onClick={() => setIsPasteModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-2">Copy rows from Excel and paste them here. Columns should be: Name, Role, Department, Max Hours.</p>
              <textarea 
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                className="w-full h-64 p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="John Doe&#9;Manager&#9;Sales&#9;40&#10;Jane Smith&#9;Cashier&#9;Front End&#9;20"
              />
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setIsPasteModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
              <button onClick={handlePasteSubmit} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Import Staff</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && editingStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-semibold">Edit Staff</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input type="text" value={editingStaff.name} onChange={e => setEditingStaff({...editingStaff, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <input type="text" value={editingStaff.role} onChange={e => setEditingStaff({...editingStaff, role: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Manager" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department (Optional)</label>
                  <input type="text" value={editingStaff.department} onChange={e => setEditingStaff({...editingStaff, department: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Hrs/Week</label>
                  <input type="number" value={editingStaff.maxHoursWeek} onChange={e => setEditingStaff({...editingStaff, maxHoursWeek: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone (Optional)</label>
                  <input type="text" value={editingStaff.phone || ''} onChange={e => setEditingStaff({...editingStaff, phone: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="555-0100" />
                </div>
                <div className="flex items-center mt-6">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={editingStaff.experienced || false} onChange={e => setEditingStaff({...editingStaff, experienced: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                    Experienced Staff (Preferred for auto-scheduling)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Time-Based Availability</label>
                <div className="space-y-2 border rounded-lg p-4 bg-slate-50">
                  {DAYS_MONDAY_START.map(day => {
                    const avail = editingStaff.availability[day];
                    return (
                      <div key={day} className="flex items-center gap-3 text-sm">
                        <div className="w-24 font-medium text-slate-700">{day}</div>
                        <label className="flex items-center gap-1 w-24">
                          <input 
                            type="checkbox" 
                            checked={avail.isAvailable}
                            onChange={e => handleAvailabilityChange(day, 'isAvailable', e.target.checked)}
                          />
                          Available
                        </label>
                        {avail.isAvailable ? (
                          <div className="flex items-center gap-2">
                            <input 
                              type="time" 
                              value={avail.startTime}
                              onChange={e => handleAvailabilityChange(day, 'startTime', e.target.value)}
                              className="p-1 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                            <span className="text-slate-500">to</span>
                            <input 
                              type="time" 
                              value={avail.endTime}
                              onChange={e => handleAvailabilityChange(day, 'endTime', e.target.value)}
                              className="p-1 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                          </div>
                        ) : (
                          <div className="text-slate-400 italic">Unavailable</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
                <h4 className="text-sm font-semibold text-slate-800">Every week and hour caps</h4>
                <p className="text-xs text-slate-600">
                  Optional. Fixed days off repeat every week on the schedule and in auto-schedule. The requested cap is a
                  softer weekly limit (student hours, etc.); the hard ceiling is still Max Hrs/Week above.
                </p>
                <div>
                  <div className="mb-2 text-xs font-medium text-slate-700">Fixed weekly days off</div>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_MONDAY_START.map((day) => (
                      <label key={day} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={(editingStaff.fixedWeeklyDaysOff || []).includes(day)}
                          onChange={() => {
                            const cur = new Set<DayOfWeek>(editingStaff.fixedWeeklyDaysOff || []);
                            if (cur.has(day)) cur.delete(day);
                            else cur.add(day);
                            const arr = uniqOrderedDays(cur);
                            setEditingStaff({
                              ...editingStaff,
                              fixedWeeklyDaysOff: arr.length ? arr : undefined,
                            });
                          }}
                        />
                        {day.slice(0, 3)}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Requested weekly hours cap
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="Empty = no extra cap"
                      value={
                        typeof editingStaff.requestedWeeklyHoursCap === 'number'
                          ? editingStaff.requestedWeeklyHoursCap
                          : ''
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '') {
                          setEditingStaff({ ...editingStaff, requestedWeeklyHoursCap: undefined });
                          return;
                        }
                        const n = Math.max(0, parseInt(v, 10) || 0);
                        setEditingStaff({
                          ...editingStaff,
                          requestedWeeklyHoursCap: n > 0 ? n : undefined,
                        });
                      }}
                      className="w-full rounded-lg border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={!!editingStaff.staffStrongBandPreference}
                        onChange={(e) =>
                          setEditingStaff({
                            ...editingStaff,
                            staffStrongBandPreference: e.target.checked ? true : undefined,
                          })
                        }
                        className="rounded text-blue-600"
                      />
                      Strong band preference (auto-schedule weights Morning/Mid/Closing requests more)
                    </label>
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium text-slate-700">
                    Prefer scheduling on these weekdays (soft bonus when possible)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_MONDAY_START.map((day) => (
                      <label key={day} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={(editingStaff.preferSchedulingOnDays || []).includes(day)}
                          onChange={() => {
                            const cur = new Set<DayOfWeek>(editingStaff.preferSchedulingOnDays || []);
                            if (cur.has(day)) cur.delete(day);
                            else cur.add(day);
                            const arr = uniqOrderedDays(cur);
                            setEditingStaff({
                              ...editingStaff,
                              preferSchedulingOnDays: arr.length ? arr : undefined,
                            });
                          }}
                        />
                        {day.slice(0, 3)}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/90 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-800">Auto-schedule: shift type by weekday</h4>
                <p className="text-xs text-slate-600">
                  Set Morning, Mid, or Closing for specific days (for example VM: morning Monday–Wednesday). “Any” leaves
                  that day unconstrained. These apply when Setup has “Honor per-staff shift requests” turned on.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {DAYS_MONDAY_START.map((day) => (
                    <div key={day}>
                      <label className="block text-[10px] font-medium text-slate-600 mb-0.5">{day.slice(0, 3)}</label>
                      <select
                        className="w-full rounded border border-slate-300 p-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value={editingStaff.preferredBandByDay?.[day] || ''}
                        onChange={(e) => {
                          const v = e.target.value as '' | 'Morning' | 'Mid' | 'Closing';
                          const next: Partial<Record<DayOfWeek, 'Morning' | 'Mid' | 'Closing'>> = {
                            ...(editingStaff.preferredBandByDay || {}),
                          };
                          if (!v) {
                            delete next[day];
                          } else {
                            next[day] = v;
                          }
                          const keys = Object.keys(next) as DayOfWeek[];
                          setEditingStaff({
                            ...editingStaff,
                            preferredBandByDay: keys.length ? next : undefined,
                          });
                        }}
                      >
                        <option value="">Any</option>
                        <option value="Morning">Morning</option>
                        <option value="Mid">Mid</option>
                        <option value="Closing">Closing</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-800">Staff scheduling request</h4>
                <p className="text-xs text-slate-600">
                  Capture what they asked for: usual shift type, fewer mornings, or free-text. Combine with “Requested
                  weekly hours cap” and date rules below for “work less”, “morning on this date”, or “off this date”.
                  Per-day dropdowns above apply unless a calendar rule overrides that date.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Usual shift type (whole week)</label>
                    <select
                      value={editingStaff.staffScheduleRequestBand || ''}
                      onChange={(e) => {
                        const v = e.target.value as Staff['staffScheduleRequestBand'];
                        setEditingStaff({
                          ...editingStaff,
                          staffScheduleRequestBand: v || undefined,
                        });
                      }}
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">No request</option>
                      <option value="Morning">Morning</option>
                      <option value="Mid">Mid</option>
                      <option value="Closing">Closing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Minimum morning-style days / week
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={7}
                      placeholder="0 = off"
                      value={
                        typeof editingStaff.minMorningDaysPerWeek === 'number'
                          ? editingStaff.minMorningDaysPerWeek
                          : ''
                      }
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          setEditingStaff({ ...editingStaff, minMorningDaysPerWeek: undefined });
                          return;
                        }
                        const n = Math.min(7, Math.max(0, parseInt(raw, 10) || 0));
                        setEditingStaff({
                          ...editingStaff,
                          minMorningDaysPerWeek: n <= 0 ? undefined : n,
                        });
                      }}
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Auto-schedule favors morning-style templates until this count is reached (soft rule).
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Request notes (visible to you)</label>
                  <textarea
                    value={editingStaff.staffScheduleRequestNote || ''}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        staffScheduleRequestNote: e.target.value || undefined,
                      })
                    }
                    className="w-full min-h-[64px] p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Only opening shifts until mid-March, no Sunday closes…"
                  />
                </div>

                <div className="space-y-3 border-t border-blue-200 pt-3">
                  <p className="text-xs font-semibold text-slate-800">Calendar rules</p>
                  <p className="text-[11px] text-slate-600">
                    <strong>Date + band</strong> nudges auto-schedule toward that template on that day only.{' '}
                    <strong>Unavailable</strong> blocks that calendar day (one-off day off).
                  </p>
                  <div>
                    <div className="mb-1 text-xs font-medium text-slate-700">Specific date → shift band</div>
                    <div className="space-y-2">
                      {(editingStaff.preferredBandExceptions || []).map((row, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-2">
                          <input
                            type="date"
                            value={row.date}
                            onChange={(e) => {
                              const next = [...(editingStaff.preferredBandExceptions || [])];
                              next[i] = { ...next[i], date: e.target.value };
                              setEditingStaff({
                                ...editingStaff,
                                preferredBandExceptions: next,
                              });
                            }}
                            className="rounded border border-slate-300 p-1 text-sm"
                          />
                          <select
                            value={row.band}
                            onChange={(e) => {
                              const next = [...(editingStaff.preferredBandExceptions || [])];
                              next[i] = { ...next[i], band: e.target.value as ShiftPreferenceBand };
                              setEditingStaff({
                                ...editingStaff,
                                preferredBandExceptions: next,
                              });
                            }}
                            className="rounded border border-slate-300 p-1 text-sm"
                          >
                            <option value="Morning">Morning</option>
                            <option value="Mid">Mid</option>
                            <option value="Closing">Closing</option>
                          </select>
                          <button
                            type="button"
                            className="text-xs text-red-600 hover:underline"
                            onClick={() => {
                              const next = (editingStaff.preferredBandExceptions || []).filter((_, j) => j !== i);
                              setEditingStaff({
                                ...editingStaff,
                                preferredBandExceptions: next.length ? next : undefined,
                              });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="text-sm font-medium text-blue-700 hover:underline"
                        onClick={() =>
                          setEditingStaff({
                            ...editingStaff,
                            preferredBandExceptions: [
                              ...(editingStaff.preferredBandExceptions || []),
                              {
                                date: new Date().toISOString().slice(0, 10),
                                band: 'Morning' as ShiftPreferenceBand,
                              },
                            ],
                          })
                        }
                      >
                        Add date + band
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-medium text-slate-700">One-off unavailable dates</div>
                    <div className="space-y-2">
                      {(editingStaff.unavailableDates || []).map((ud, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-2">
                          <input
                            type="date"
                            value={ud}
                            onChange={(e) => {
                              const next = [...(editingStaff.unavailableDates || [])];
                              next[i] = e.target.value;
                              setEditingStaff({ ...editingStaff, unavailableDates: next });
                            }}
                            className="rounded border border-slate-300 p-1 text-sm"
                          />
                          <button
                            type="button"
                            className="text-xs text-red-600 hover:underline"
                            onClick={() => {
                              const next = (editingStaff.unavailableDates || []).filter((_, j) => j !== i);
                              setEditingStaff({
                                ...editingStaff,
                                unavailableDates: next.length ? next : undefined,
                              });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="text-sm font-medium text-blue-700 hover:underline"
                        onClick={() =>
                          setEditingStaff({
                            ...editingStaff,
                            unavailableDates: [...(editingStaff.unavailableDates || []), ''],
                          })
                        }
                      >
                        Add unavailable date
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
                Before/after day off preferences only affect <strong>auto-schedule</strong> when Setup →{' '}
                <strong>Day off rules</strong> is enabled. Fixed weekly days off count as &quot;off&quot; for those rules
                (e.g. Friday can be treated as before a fixed Saturday off).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Before day off — prefer shift</label>
                  <select
                    value={editingStaff.beforeDayOffPrefer || ''}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        beforeDayOffPrefer: (e.target.value || '') as Staff['beforeDayOffPrefer'],
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No preference</option>
                    <option value="Morning">Morning</option>
                    <option value="Mid">Mid</option>
                    <option value="Closing">Closing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">After day off — prefer shift</label>
                  <select
                    value={editingStaff.afterDayOffPrefer || ''}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        afterDayOffPrefer: (e.target.value || '') as Staff['afterDayOffPrefer'],
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No preference</option>
                    <option value="Morning">Morning</option>
                    <option value="Mid">Mid</option>
                    <option value="Closing">Closing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea value={editingStaff.notes} onChange={e => setEditingStaff({...editingStaff, notes: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]" placeholder="Any specific requirements or notes..." />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Save Staff</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
