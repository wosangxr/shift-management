import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function EmployeesPage({ user }) {
  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editEmp, setEditEmp] = useState(null);
  const [form, setForm] = useState({ employeeCode: '', name: '', email: '', role: 'EMPLOYEE', position: '', department: '', hourlyRate: 150, otRateMultiplier: 1.5, holidayRateMultiplier: 2.0 });
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const load = () => api.getEmployees().then(setEmployees).catch(console.error);
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editEmp) await api.updateEmployee(editEmp.id, form);
      else await api.createEmployee(form);
      setShowModal(false); load();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('ต้องการลบพนักงานนี้?')) return;
    try { await api.deleteEmployee(id); load(); } catch (err) { alert(err.message); }
  };

  const openEdit = (emp) => {
    setEditEmp(emp);
    setForm({ employeeCode: emp.employeeCode, name: emp.name, email: emp.email, role: emp.role, position: emp.position, department: emp.department, hourlyRate: emp.hourlyRate, otRateMultiplier: emp.otRateMultiplier, holidayRateMultiplier: emp.holidayRateMultiplier });
    setShowModal(true);
  };

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">จัดการพนักงาน</h1><p className="page-subtitle">รายชื่อพนักงานทั้งหมด {employees.length} คน</p></div>
        {isManager && <button className="btn btn-primary" onClick={() => { setEditEmp(null); setForm({ employeeCode: '', name: '', email: '', role: 'EMPLOYEE', position: '', department: '', hourlyRate: 150, otRateMultiplier: 1.5, holidayRateMultiplier: 2.0 }); setShowModal(true); }}>+ เพิ่มพนักงาน</button>}
      </div>
      <div className="page-body">
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>พนักงาน</th><th>ตำแหน่ง</th><th>แผนก</th><th>สิทธิ์</th><th>เรทรายชม.</th><th>OT ×</th>{isManager && <th>จัดการ</th>}</tr></thead>
            <tbody>
              {employees.map((emp, i) => (
                <tr key={emp.id} className={`animate-in animate-in-${(i % 4) + 1}`}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="user-avatar" style={{ background: emp.avatarColor }}>{emp.name.charAt(0)}</div>
                      <div><div style={{ fontWeight: 600 }}>{emp.name}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{emp.employeeCode} · {emp.email}</div></div>
                    </div>
                  </td>
                  <td>{emp.position || '-'}</td>
                  <td>{emp.department || '-'}</td>
                  <td><span className={`badge badge-${emp.role.toLowerCase()}`}>{emp.role}</span></td>
                  <td style={{ fontWeight: 600 }}>฿{emp.hourlyRate}</td>
                  <td>{emp.otRateMultiplier}×</td>
                  {isManager && <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(emp)}>แก้ไข</button>
                      {user?.role === 'ADMIN' && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(emp.id)}>ลบ</button>}
                    </div>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editEmp ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงานใหม่'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <div className="form-group"><label className="form-label">รหัสพนักงาน</label><input className="form-input" value={form.employeeCode} onChange={e => setForm({ ...form, employeeCode: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">ชื่อ-นามสกุล</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                </div>
                <div className="form-group"><label className="form-label">อีเมล</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
                <div className="grid grid-2">
                  <div className="form-group"><label className="form-label">ตำแหน่ง</label><input className="form-input" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">แผนก</label><input className="form-input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
                </div>
                <div className="grid grid-3">
                  <div className="form-group"><label className="form-label">เรทรายชม. (฿)</label><input className="form-input" type="number" value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: parseFloat(e.target.value) })} /></div>
                  <div className="form-group"><label className="form-label">OT ×</label><input className="form-input" type="number" step="0.1" value={form.otRateMultiplier} onChange={e => setForm({ ...form, otRateMultiplier: parseFloat(e.target.value) })} /></div>
                  <div className="form-group"><label className="form-label">วันหยุด ×</label><input className="form-input" type="number" step="0.1" value={form.holidayRateMultiplier} onChange={e => setForm({ ...form, holidayRateMultiplier: parseFloat(e.target.value) })} /></div>
                </div>
                <div className="form-group"><label className="form-label">สิทธิ์</label>
                  <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="EMPLOYEE">พนักงาน</option><option value="MANAGER">ผู้จัดการ</option><option value="ADMIN">ผู้ดูแลระบบ</option></select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary btn-sm">{editEmp ? 'บันทึก' : 'เพิ่ม'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
