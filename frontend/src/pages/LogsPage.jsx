import { useState, useEffect } from 'react';
import { api } from '../utils/api';

const IconFileText = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = () => {
    setLoading(true);
    api.getLogs().then(setLogs).catch(err => alert(err.message)).finally(() => setLoading(false));
  };

  const getActionColor = (action) => {
    if (action.includes('PUNCH_IN')) return '#4ade80'; // Green
    if (action.includes('PUNCH_OUT')) return '#60a5fa'; // Blue
    if (action.includes('CREATE')) return '#f59e0b'; // Orange
    if (action.includes('UPDATE')) return '#c084fc'; // Purple
    if (action.includes('DELETE')) return '#ef4444'; // Red
    return 'var(--text-muted)';
  };

  const getActionLabel = (action) => {
    if (action === 'PUNCH_IN') return 'ลงเวลาเข้างาน';
    if (action === 'PUNCH_OUT') return 'ลงเวลาออกงาน';
    if (action === 'CREATE_SHIFT') return 'เพิ่มกะงาน';
    if (action === 'UPDATE_SHIFT') return 'แก้ไขกะงาน';
    if (action === 'DELETE_SHIFT') return 'ลบกะงาน';
    return action;
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">ประวัติการทำรายการ (Logs)</h1>
          <p className="page-subtitle">บันทึกการลงเวลาและการแก้ไขกะงานทั้งหมด</p>
        </div>
        <button className="btn btn-secondary" onClick={loadLogs}>รีเฟรช</button>
      </div>
      
      <div className="page-body">
        <div className="card animate-in">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>กำลังโหลดข้อมูล...</div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><IconFileText /></div>
              <h3>ยังไม่มีประวัติการทำรายการ</h3>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>วัน/เวลา</th>
                    <th>การกระทำ</th>
                    <th>รายละเอียด</th>
                    <th>พนักงานที่เกี่ยวข้อง</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {new Date(log.createdAt).toLocaleString('th-TH')}
                      </td>
                      <td>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: 4, 
                          fontSize: 12, 
                          fontWeight: 600, 
                          background: `${getActionColor(log.action)}20`, 
                          color: getActionColor(log.action) 
                        }}>
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>{log.details}</td>
                      <td>
                        {log.employee ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="user-avatar" style={{ background: log.employee.avatarColor, width: 24, height: 24, fontSize: 10 }}>
                              {log.employee.name.charAt(0)}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{log.employee.name}</span>
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
