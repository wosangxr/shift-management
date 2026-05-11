const API_BASE = '/api';

function headers() {
  return { 'Content-Type': 'application/json' };
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...headers(), ...options.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),

  // Employees
  getEmployees: () => request('/employees'),
  getEmployee: (id) => request(`/employees/${id}`),
  createEmployee: (data) => request('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id, data) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id) => request(`/employees/${id}`, { method: 'DELETE' }),

  // Shifts
  getShifts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/shifts?${q}`);
  },
  createShift: (data) => request('/shifts', { method: 'POST', body: JSON.stringify(data) }),
  createBulkShifts: (shifts) => request('/shifts/bulk', { method: 'POST', body: JSON.stringify({ shifts }) }),
  updateShift: (id, data) => request(`/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShift: (id) => request(`/shifts/${id}`, { method: 'DELETE' }),

  // Attendance
  punch: (employeeId) => request('/attendance/punch', { method: 'POST', body: JSON.stringify({ employeeId }) }),
  getAttendanceStatus: (employeeId) => request(`/attendance/status?employeeId=${employeeId}`),
  checkIn: (shiftId) => request('/attendance/checkin', { method: 'POST', body: JSON.stringify({ shiftId }) }),
  checkOut: (shiftId) => request('/attendance/checkout', { method: 'POST', body: JSON.stringify({ shiftId }) }),
  getAttendance: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/attendance?${q}`);
  },

  // Payroll
  getPayroll: (month, year) => request(`/payroll/${month}/${year}`),
  updatePayrollStatus: (id, status) => request(`/payroll/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Logs
  getLogs: () => request('/logs'),

  // Dashboard
  getDashboardStats: () => request('/dashboard/stats'),
};
