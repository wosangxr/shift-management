import { useState, useEffect } from 'react';
import { api } from '../utils/api';

const IconBaht = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const IconClock = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconOT = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/><path d="M20 4L22 2"/></svg>;
const IconCalHoliday = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="14" x2="15" y2="18"/><line x1="15" y1="14" x2="9" y2="18"/></svg>;

const MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

export default function PayrollPage({ user }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const load = () => {
    setLoading(true);
    api.getPayroll(month, year).then(setData).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, [month, year]);

  const fmt = (n) => n?.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00';

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">สรุปเงินเดือน</h1><p className="page-subtitle">คำนวณและออกรายงานเงินเดือนรายเดือน</p></div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select className="form-select" value={month} onChange={e => setMonth(+e.target.value)} style={{ width: 140 }}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <input className="form-input" type="number" value={year} onChange={e => setYear(+e.target.value)} style={{ width: 100 }} />
        </div>
      </div>
      <div className="page-body">
        {loading ? (
          <div className="empty-state"><div className="empty-icon"><IconClock /></div><p>กำลังคำนวณ...</p></div>
        ) : data ? (
          <>
            <div className="grid grid-4" style={{ marginBottom: 24 }}>
              <div className="card stat-card animate-in animate-in-1">
                <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}><IconBaht /></div>
                <div><div className="stat-value">฿{fmt(data.totals.totalPay)}</div><div className="stat-label">ยอดรวมทั้งหมด</div></div>
              </div>
              <div className="card stat-card animate-in animate-in-2">
                <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}><IconClock /></div>
                <div><div className="stat-value">{data.totals.normalHours.toFixed(0)} ชม.</div><div className="stat-label">ชั่วโมงปกติ</div></div>
              </div>
              <div className="card stat-card animate-in animate-in-3">
                <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}><IconOT /></div>
                <div><div className="stat-value">{data.totals.otHours.toFixed(0)} ชม.</div><div className="stat-label">ชั่วโมง OT</div></div>
              </div>
              <div className="card stat-card animate-in animate-in-4">
                <div className="stat-icon" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}><IconCalHoliday /></div>
                <div><div className="stat-value">{data.totals.holidayHours.toFixed(0)} ชม.</div><div className="stat-label">ชั่วโมงวันหยุด</div></div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 16, fontWeight: 700 }}>รายงานเงินเดือน — {MONTHS[month - 1]} {year}</h3>
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>พนักงาน</th><th>แผนก</th><th style={{ textAlign: 'right' }}>ชม.ปกติ</th><th style={{ textAlign: 'right' }}>ชม.OT</th><th style={{ textAlign: 'right' }}>ชม.วันหยุด</th><th style={{ textAlign: 'right' }}>เงินปกติ</th><th style={{ textAlign: 'right' }}>เงิน OT</th><th style={{ textAlign: 'right' }}>รวมสุทธิ</th><th>สถานะ</th><th></th></tr></thead>
                  <tbody>
                    {data.payroll.map((p, i) => (
                      <tr key={p.id} className={`animate-in animate-in-${(i % 4) + 1}`}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="user-avatar" style={{ background: p.employee?.avatarColor, width: 30, height: 30, fontSize: 12 }}>{p.employee?.name?.charAt(0)}</div>
                            <div><div style={{ fontWeight: 600, fontSize: 13 }}>{p.employee?.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.employee?.employeeCode}</div></div>
                          </div>
                        </td>
                        <td style={{ fontSize: 13 }}>{p.employee?.department || '-'}</td>
                        <td style={{ textAlign: 'right', fontSize: 13 }}>{p.normalHours}</td>
                        <td style={{ textAlign: 'right', fontSize: 13, color: '#fbbf24' }}>{p.otHours}</td>
                        <td style={{ textAlign: 'right', fontSize: 13, color: '#c084fc' }}>{p.holidayHours}</td>
                        <td style={{ textAlign: 'right', fontSize: 13 }}>฿{fmt(p.normalPay)}</td>
                        <td style={{ textAlign: 'right', fontSize: 13, color: '#fbbf24' }}>฿{fmt(p.otPay)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-hover)' }}>฿{fmt(p.totalPay)}</td>
                        <td><span className={`badge badge-${p.status.toLowerCase()}`}>{p.status === 'DRAFT' ? 'ร่าง' : p.status === 'APPROVED' ? 'อนุมัติ' : 'จ่ายแล้ว'}</span></td>
                        <td><button className="btn btn-secondary btn-sm" onClick={() => setSelectedSlip(p)}>ดูสลิป</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {selectedSlip && (
        <div className="modal-overlay" onClick={() => setSelectedSlip(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header"><h2 className="modal-title">สลิปเงินเดือน</h2><button className="modal-close" onClick={() => setSelectedSlip(null)}>✕</button></div>
            <div className="payslip">
              <div className="payslip-header">
                <div style={{ fontSize: 20, fontWeight: 800 }}>ShiftFlow</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>สลิปเงินเดือน — {MONTHS[month - 1]} {year}</div>
                <div style={{ marginTop: 12, fontSize: 14 }}><strong>{selectedSlip.employee?.name}</strong> ({selectedSlip.employee?.employeeCode})</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedSlip.employee?.position} | {selectedSlip.employee?.department}</div>
              </div>
              <div className="payslip-row"><span className="payslip-label">ชั่วโมงปกติ ({selectedSlip.normalHours} ชม. × ฿{selectedSlip.employee?.hourlyRate})</span><span>฿{fmt(selectedSlip.normalPay)}</span></div>
              <div className="payslip-row"><span className="payslip-label">ชั่วโมง OT ({selectedSlip.otHours} ชม. × ฿{selectedSlip.employee?.hourlyRate} × {selectedSlip.employee?.otRateMultiplier})</span><span style={{ color: '#fbbf24' }}>฿{fmt(selectedSlip.otPay)}</span></div>
              <div className="payslip-row"><span className="payslip-label">ชั่วโมงวันหยุด ({selectedSlip.holidayHours} ชม. × ฿{selectedSlip.employee?.hourlyRate} × {selectedSlip.employee?.holidayRateMultiplier})</span><span style={{ color: '#c084fc' }}>฿{fmt(selectedSlip.holidayPay)}</span></div>
              <div className="payslip-row total"><span>รวมสุทธิ</span><span>฿{fmt(selectedSlip.totalPay)}</span></div>
            </div>
            <div className="modal-footer">
              {isManager && selectedSlip.status === 'DRAFT' && <button className="btn btn-primary btn-sm" onClick={async () => { await api.updatePayrollStatus(selectedSlip.id, 'APPROVED'); setSelectedSlip(null); load(); }}>อนุมัติ</button>}
              {isManager && selectedSlip.status === 'APPROVED' && <button className="btn btn-primary btn-sm" onClick={async () => { await api.updatePayrollStatus(selectedSlip.id, 'PAID'); setSelectedSlip(null); load(); }}>จ่ายแล้ว</button>}
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedSlip(null)}>ปิด</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
