import { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'];

const IconUsers = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconCalendar = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconCheck = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconClock = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.getDashboardStats().then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-body"><div className="empty-state"><div className="empty-icon"><IconClock /></div><p>กำลังโหลดข้อมูล...</p></div></div>;
  if (!stats) return null;

  const deptData = stats.departments.map((d, i) => ({ ...d, fill: COLORS[i % COLORS.length] }));

  const handleDownloadTemplate = async () => {
    try {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet([
        { 'รหัสพนักงาน': 'EMP001', 'วันที่': '2026-05-15', 'เวลาเข้า': '09:00', 'เวลาออก': '17:00', 'ประเภทกะ': 'NORMAL', 'หมายเหตุ': 'กะปกติ' },
        { 'รหัสพนักงาน': 'EMP002', 'วันที่': '2026-05-15', 'เวลาเข้า': '14:00', 'เวลาออก': '22:00', 'ประเภทกะ': 'OT', 'หมายเหตุ': '' }
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Shifts");
      XLSX.writeFile(wb, "Shift_Template.xlsx");
    } catch (e) { alert("เกิดข้อผิดพลาดในการโหลดไลบรารี"); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const employees = await api.getEmployees();
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target.result;
          const XLSX = await import('xlsx');
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { raw: false });
          
          const newShifts = [];
          let errors = 0;

          data.forEach(row => {
            const empCode = row['รหัสพนักงาน'];
            const dateStr = row['วันที่'];
            const startTime = row['เวลาเข้า'];
            const endTime = row['เวลาออก'];
            let shiftType = row['ประเภทกะ'] || 'NORMAL';
            const note = row['หมายเหตุ'] || '';

            const employee = employees.find(emp => emp.employeeCode === String(empCode));
            if (!employee || !dateStr || !startTime || !endTime) { errors++; return; }

            let formattedDate = dateStr;
            if (dateStr.includes('/')) {
              const parts = dateStr.split('/');
              if (parts.length === 3) formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }

            newShifts.push({
              employeeId: employee.id,
              date: formattedDate,
              startTime,
              endTime,
              shiftType: shiftType.toUpperCase(),
              note
            });
          });

          if (newShifts.length === 0) {
            alert('ไม่พบข้อมูลที่นำเข้าได้ กรุณาตรวจสอบรูปแบบไฟล์');
            return;
          }

          if (confirm(`พบกะงานที่นำเข้าได้ทั้งหมด ${newShifts.length} รายการ (ข้ามไป ${errors} รายการที่ไม่สมบูรณ์) ต้องการนำเข้าสู่ระบบหรือไม่?`)) {
            await api.createBulkShifts(newShifts);
            alert('นำเข้ากะทำงานเรียบร้อยแล้ว');
            api.getDashboardStats().then(setStats); // Refresh stats
          }
        } catch (err) {
          console.error(err);
          alert('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel');
        }
        if (fileInputRef.current) fileInputRef.current.value = null;
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      alert('ไม่สามารถดึงข้อมูลพนักงานได้');
    }
  };

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">แดชบอร์ด</h1><p className="page-subtitle">ภาพรวมระบบจัดการกะและเงินเดือน</p></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input type="file" accept=".xlsx, .xls" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
          <button className="btn btn-secondary" onClick={handleDownloadTemplate}>โหลดเทมเพลต Excel</button>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>นำเข้า Excel</button>
        </div>
      </div>
      <div className="page-body">
        <div className="grid grid-4" style={{ marginBottom: 24 }}>
          <div className="card stat-card animate-in animate-in-1">
            <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}><IconUsers /></div>
            <div><div className="stat-value">{stats.totalEmployees}</div><div className="stat-label">พนักงานทั้งหมด</div></div>
          </div>
          <div className="card stat-card animate-in animate-in-2">
            <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}><IconCalendar /></div>
            <div><div className="stat-value">{stats.shiftsToday}</div><div className="stat-label">กะวันนี้</div></div>
          </div>
          <div className="card stat-card animate-in animate-in-3">
            <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}><IconCheck /></div>
            <div><div className="stat-value">{stats.checkedInToday}</div><div className="stat-label">ลงเวลาวันนี้</div></div>
          </div>
          <div className="card stat-card animate-in animate-in-4">
            <div className="stat-icon" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}><IconClock /></div>
            <div><div className="stat-value">{stats.otShifts}</div><div className="stat-label">OT เดือนนี้</div></div>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="card animate-in" style={{ animationDelay: '0.25s' }}>
            <h3 style={{ marginBottom: 16, fontWeight: 700 }}>สัดส่วนพนักงานตามแผนก</h3>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={deptData} 
                    dataKey="count" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={90} 
                    strokeWidth={2} 
                    stroke="var(--bg-card)" 
                    label={(props) => {
                      const RADIAN = Math.PI / 180;
                      const { cx, cy, midAngle, outerRadius, name, count } = props;
                      const radius = outerRadius + 25;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text x={x} y={y} fill="var(--text-primary)" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={13}>
                          {name} ({count})
                        </text>
                      );
                    }}
                  >
                    {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-secondary)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card animate-in" style={{ animationDelay: '0.3s' }}>
            <h3 style={{ marginBottom: 16, fontWeight: 700 }}>สรุปกะประจำเดือน</h3>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'กะทั้งหมด', value: stats.monthlyShifts, fill: '#6366f1' },
                  { name: 'กะ OT', value: stats.otShifts, fill: '#f59e0b' },
                  { name: 'ลงเวลาวันนี้', value: stats.checkedInToday, fill: '#22c55e' },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-secondary)' }} cursor={{ fill: 'var(--bg-card-hover)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {[0,1,2].map(i => <Cell key={i} fill={['#6366f1','#f59e0b','#22c55e'][i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card animate-in" style={{ marginTop: 24, animationDelay: '0.35s' }}>
          <h3 style={{ marginBottom: 16, fontWeight: 700 }}>รายการลงเวลาล่าสุด</h3>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>พนักงาน</th><th>กะ</th><th>ประเภท</th><th>เวลาเข้า</th><th>เวลาออก</th></tr></thead>
              <tbody>
                {stats.recentAttendance.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="user-avatar" style={{ background: a.employee.avatarColor, width: 30, height: 30, fontSize: 12 }}>
                          {a.employee.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{a.employee.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.employee.employeeCode}</div>
                        </div>
                      </div>
                    </td>
                    <td>{a.shift.startTime} - {a.shift.endTime}</td>
                    <td><span className={`badge badge-${a.shift.shiftType.toLowerCase()}`}>{a.shift.shiftType === 'NORMAL' ? 'ปกติ' : a.shift.shiftType === 'OT' ? 'ล่วงเวลา' : 'วันหยุด'}</span></td>
                    <td style={{ fontSize: 13 }}>{a.checkIn ? new Date(a.checkIn).toLocaleTimeString('th-TH') : '-'}</td>
                    <td style={{ fontSize: 13 }}>{a.checkOut ? new Date(a.checkOut).toLocaleTimeString('th-TH') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
