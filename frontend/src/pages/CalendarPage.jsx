import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import { api } from '../utils/api';

const SHIFT_COLORS = { NORMAL: '#3b82f6', OT: '#f59e0b', HOLIDAY: '#a855f7' };

export default function CalendarPage({ user }) {
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editShift, setEditShift] = useState(null);
  const [form, setForm] = useState({ employeeId: '', date: '', startTime: '09:00', endTime: '17:00', shiftType: 'NORMAL', note: '' });
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const calRef = useRef(null);
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  // Time clock state
  const [selectedEmployeeForPunch, setSelectedEmployeeForPunch] = useState('');
  const [clockStatus, setClockStatus] = useState({ isClockedIn: false, currentRecord: null, todayRecords: [] });
  const [clockLoading, setClockLoading] = useState(false);
  const [clockTime, setClockTime] = useState(new Date());
  const [punchFeedback, setPunchFeedback] = useState(null);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setClockTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load clock status
  const loadClockStatus = async (empId = selectedEmployeeForPunch) => {
    if (!empId) {
      setClockStatus({ isClockedIn: false, currentRecord: null, todayRecords: [] });
      return;
    }
    try {
      const status = await api.getAttendanceStatus(empId);
      setClockStatus(status);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadClockStatus(); }, [selectedEmployeeForPunch]);

  // Handle punch (single button for in/out)
  const handlePunch = async () => {
    if (!selectedEmployeeForPunch) {
      setPunchFeedback({ action: 'error', message: 'กรุณาเลือกพนักงานก่อนลงเวลา' });
      setTimeout(() => setPunchFeedback(null), 4000);
      return;
    }
    setClockLoading(true);
    setPunchFeedback(null);
    try {
      const result = await api.punch(selectedEmployeeForPunch);
      setPunchFeedback(result);
      await loadClockStatus(selectedEmployeeForPunch);
      // Reload calendar data
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      loadData(start, end);
      // Clear feedback after 4s
      setTimeout(() => setPunchFeedback(null), 4000);
    } catch (err) {
      setPunchFeedback({ action: 'error', message: err.message });
      setTimeout(() => setPunchFeedback(null), 4000);
    } finally {
      setClockLoading(false);
    }
  };

  // Calculate elapsed time
  const getElapsed = () => {
    if (!clockStatus.currentRecord?.checkIn) return null;
    const diff = clockTime - new Date(clockStatus.currentRecord.checkIn);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Calendar data
  const loadData = async (start, end) => {
    try {
      const params = {};
      if (start && end) { params.startDate = start; params.endDate = end; }
      const [s, e] = await Promise.all([api.getShifts(params), isManager ? api.getEmployees() : Promise.resolve([])]);
      setShifts(s);
      if (e.length) setEmployees(e);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    loadData(start, end);
  }, []);

  const events = shifts.map(s => {
    const dateStr = new Date(s.date).toISOString().split('T')[0];
    return {
      id: s.id, title: `${s.employee?.name || ''} ${s.startTime}-${s.endTime}`,
      start: `${dateStr}T${s.startTime}`, end: `${dateStr}T${s.endTime}`,
      backgroundColor: SHIFT_COLORS[s.shiftType] || SHIFT_COLORS.NORMAL,
      extendedProps: { ...s },
    };
  });

  const handleDateClick = (info) => {
    setSelectedDateStr(info.dateStr);
    setShowDailyModal(true);
  };

  const handleEventClick = (info) => {
    const dateStr = info.event.startStr.split('T')[0];
    setSelectedDateStr(dateStr);
    setShowDailyModal(true);
  };

  const handleEventDrop = async (info) => {
    if (!isManager) { info.revert(); return; }
    try {
      await api.updateShift(info.event.id, { date: info.event.startStr.split('T')[0] });
    } catch { info.revert(); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editShift) { await api.updateShift(editShift.id, form); }
      else { await api.createShift(form); }
      setShowModal(false);
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      loadData(start, end);
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async () => {
    if (!editShift || !confirm('ต้องการลบกะนี้?')) return;
    try {
      await api.deleteShift(editShift.id);
      setShowModal(false);
      const now = new Date();
      loadData(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
    } catch (err) { alert(err.message); }
  };

  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">ปฏิทินกะการทำงาน</h1><p className="page-subtitle">ลงเวลาเข้า-ออกงาน และจัดการตารางกะ</p></div>
        {isManager && <button className="btn btn-primary" onClick={() => { setEditShift(null); setForm({ employeeId: employees[0]?.id || '', date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '17:00', shiftType: 'NORMAL', note: '' }); setShowModal(true); }}>+ เพิ่มกะ</button>}
      </div>
      <div className="page-body">
        {/* ===== Time Clock Section ===== */}
        <div className="card animate-in" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>ระบบลงเวลาทำงาน</h3>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>กรุณาเลือกชื่อของคุณก่อนลงเวลาเข้า-ออกงาน</div>
            </div>
            <select 
              className="form-select" 
              value={selectedEmployeeForPunch} 
              onChange={(e) => setSelectedEmployeeForPunch(e.target.value)}
              style={{ width: 260, fontWeight: 600, fontSize: 15 }}
            >
              <option value="">-- เลือกพนักงาน --</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>

          <div style={{
            background: clockStatus.isClockedIn
              ? 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(16,185,129,0.08) 100%)'
              : 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)',
            padding: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            flexWrap: 'wrap',
          }}>
            {/* Live Clock */}
            <div style={{ flex: '1 1 0', minWidth: 200, textAlign: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px', lineHeight: 1.1 }}>
                {clockTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8 }}>
                {clockTime.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            {/* Punch Button */}
            <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center' }}>
              <button
                id="punch-button"
                onClick={handlePunch}
                disabled={clockLoading}
                style={{
                  width: 140, height: 140, borderRadius: '50%',
                  border: clockStatus.isClockedIn ? '4px solid rgba(239,68,68,0.5)' : '4px solid rgba(34,197,94,0.5)',
                  background: clockStatus.isClockedIn
                    ? 'radial-gradient(circle, #ef4444 0%, #b91c1c 100%)'
                    : 'radial-gradient(circle, #22c55e 0%, #15803d 100%)',
                  color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 4,
                  transition: 'all 0.3s ease',
                  boxShadow: clockStatus.isClockedIn
                    ? '0 0 30px rgba(239,68,68,0.3), 0 4px 20px rgba(0,0,0,0.3)'
                    : '0 0 30px rgba(34,197,94,0.3), 0 4px 20px rgba(0,0,0,0.3)',
                  transform: clockLoading ? 'scale(0.95)' : 'scale(1)',
                }}
              >
                {clockStatus.isClockedIn
                  ? <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
                  : <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>
                }
                <span>{clockLoading ? 'กำลังบันทึก...' : (clockStatus.isClockedIn ? 'ลงเวลาออก' : 'ลงเวลาเข้า')}</span>
              </button>
            </div>

            {/* Status Info */}
            <div style={{ flex: '1 1 0', minWidth: 200, textAlign: 'center' }}>
              <div style={{
                display: 'inline-block', padding: '6px 16px', borderRadius: 20,
                fontSize: 13, fontWeight: 700, marginBottom: 12,
                background: clockStatus.isClockedIn ? 'rgba(34,197,94,0.2)' : 'rgba(148,163,184,0.15)',
                color: clockStatus.isClockedIn ? '#4ade80' : 'var(--text-muted)',
              }}>
                {clockStatus.isClockedIn ? 'สถานะ: กำลังปฏิบัติงาน' : 'สถานะ: ยังไม่ได้ลงเวลาเข้า'}
              </div>

              {clockStatus.isClockedIn && clockStatus.currentRecord && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    เวลาเข้างาน: <strong style={{ color: '#4ade80' }}>{fmtTime(clockStatus.currentRecord.checkIn)}</strong>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    ระยะเวลาปฏิบัติงาน: <strong style={{ color: '#fbbf24', fontSize: 18, fontVariantNumeric: 'tabular-nums' }}>{getElapsed()}</strong>
                  </div>
                </div>
              )}

              {/* Punch feedback */}
              {punchFeedback && (
                <div style={{
                  padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginTop: 8,
                  animation: 'slideUp 0.3s ease',
                  background: punchFeedback.action === 'checkin' ? 'rgba(34,197,94,0.15)' :
                              punchFeedback.action === 'checkout' ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)',
                  color: punchFeedback.action === 'checkin' ? '#4ade80' :
                         punchFeedback.action === 'checkout' ? '#60a5fa' : '#f87171',
                }}>
                  {punchFeedback.action === 'error' ? '[ผิดพลาด] ' : ''}
                  {punchFeedback.message}
                </div>
              )}
            </div>

            {/* Today's Records */}
            {clockStatus.todayRecords?.length > 0 && (
              <div style={{ flex: '0 0 auto', minWidth: 220 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  บันทึกวันนี้
                </div>
                {clockStatus.todayRecords.map((r, i) => (
                  <div key={r.id} style={{
                    display: 'flex', gap: 12, alignItems: 'center',
                    fontSize: 13, padding: '5px 0', borderBottom: i < clockStatus.todayRecords.length - 1 ? '1px solid var(--border-color)' : 'none',
                  }}>
                    <span style={{ color: '#4ade80' }}>เข้า {fmtTime(r.checkIn)}</span>
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                    <span style={{ color: r.checkOut ? '#60a5fa' : 'var(--text-muted)' }}>
                      {r.checkOut ? `ออก ${fmtTime(r.checkOut)}` : 'ยังไม่ลงเวลาออก'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== Calendar ===== */}
        <div className="card" style={{ padding: 20 }}>
          <FullCalendar
            ref={calRef} plugins={[dayGridPlugin, multiMonthPlugin, interactionPlugin]}
            initialView="dayGridMonth" locale="th" headerToolbar={{ left: 'today prev,next title', center: '', right: 'dayGridMonth,multiMonthYear' }}
            views={{
              multiMonthYear: { buttonText: 'ปี' },
              dayGridMonth: { buttonText: 'เดือน' }
            }}
            buttonText={{ today: 'วันนี้' }}
            eventDisplay="block"
            events={events} editable={isManager} droppable={isManager} dateClick={handleDateClick}
            eventClick={handleEventClick} eventDrop={handleEventDrop} height="auto"
            dayMaxEvents={3}
            moreLinkContent={(args) => `+${args.num} เพิ่มเติม`}
            datesSet={(info) => loadData(info.startStr.split('T')[0], info.endStr.split('T')[0])}
          />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          {Object.entries(SHIFT_COLORS).map(([k, c]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: c }} />{k === 'NORMAL' ? 'ปกติ' : k === 'OT' ? 'OT' : 'วันหยุด'}
            </div>
          ))}
        </div>
      </div>

      {showDailyModal && (
        <div className="modal-overlay" onClick={() => setShowDailyModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h2 className="modal-title">รายละเอียดกะประจำวันที่ {new Date(selectedDateStr).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</h2>
              <button className="modal-close" onClick={() => setShowDailyModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>พนักงาน</th>
                    <th>เวลาเข้า-ออก (กะ)</th>
                    <th>ประเภท</th>
                    <th>สถานะลงเวลา</th>
                    {isManager && <th>จัดการ</th>}
                  </tr>
                </thead>
                <tbody>
                  {shifts.filter(s => s.date.startsWith(selectedDateStr)).length > 0 ? shifts.filter(s => s.date.startsWith(selectedDateStr)).map(s => {
                    const att = Array.isArray(s.attendance) ? s.attendance[0] : s.attendance;
                    return (
                      <tr key={s.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="user-avatar" style={{ background: s.employee?.avatarColor || '#6366f1', width: 28, height: 28, fontSize: 11 }}>
                              {s.employee?.name?.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{s.employee?.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.employee?.employeeCode}</div>
                            </div>
                          </div>
                        </td>
                        <td>{s.startTime} - {s.endTime}</td>
                        <td>
                          <span className={`badge badge-${s.shiftType.toLowerCase()}`}>
                            {s.shiftType === 'NORMAL' ? 'ปกติ' : s.shiftType === 'OT' ? 'ล่วงเวลา' : 'วันหยุด'}
                          </span>
                        </td>
                        <td>
                          {att ? (
                            <div style={{ fontSize: 12 }}>
                              <div style={{ color: '#4ade80' }}>เข้า: {new Date(att.checkIn).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
                              {att.checkOut ? (
                                <div style={{ color: '#60a5fa' }}>ออก: {new Date(att.checkOut).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
                              ) : (
                                <div style={{ color: 'var(--text-muted)' }}>ยังไม่ลงเวลาออก</div>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>ยังไม่ลงเวลา</span>
                          )}
                        </td>
                        {isManager && (
                          <td>
                            <button className="btn btn-secondary btn-sm" onClick={() => {
                              setEditShift(s);
                              setForm({ employeeId: s.employeeId, date: new Date(s.date).toISOString().split('T')[0], startTime: s.startTime, endTime: s.endTime, shiftType: s.shiftType, note: s.note || '' });
                              setShowDailyModal(false);
                              setShowModal(true);
                            }}>แก้ไข</button>
                          </td>
                        )}
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={isManager ? 5 : 4} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>ไม่มีข้อมูลกะในวันนี้</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <div>
                {isManager && (
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    setEditShift(null);
                    setForm({ employeeId: employees[0]?.id || '', date: selectedDateStr, startTime: '09:00', endTime: '17:00', shiftType: 'NORMAL', note: '' });
                    setShowDailyModal(false);
                    setShowModal(true);
                  }}>+ เพิ่มกะใหม่</button>
                )}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDailyModal(false)}>ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editShift ? 'แก้ไขกะ' : 'เพิ่มกะใหม่'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">พนักงาน</label>
                  <select className="form-select" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} required>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.employeeCode} — {emp.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">วันที่</label>
                  <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">เวลาเริ่ม</label>
                    <input className="form-input" type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">เวลาสิ้นสุด</label>
                    <input className="form-input" type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">ประเภทกะ</label>
                  <select className="form-select" value={form.shiftType} onChange={e => setForm({ ...form, shiftType: e.target.value })}>
                    <option value="NORMAL">ปกติ</option><option value="OT">OT (ล่วงเวลา)</option><option value="HOLIDAY">วันหยุด</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">หมายเหตุ</label>
                  <input className="form-input" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="ไม่บังคับ" />
                </div>
              </div>
              <div className="modal-footer">
                {editShift && <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>ลบ</button>}
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary btn-sm">{editShift ? 'บันทึก' : 'เพิ่มกะ'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
