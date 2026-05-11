/**
 * Calculate working hours between two time strings (HH:mm format)
 */
function calculateHours(startTime, endTime) {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let hours = endH - startH + (endM - startM) / 60;

  // Handle overnight shifts
  if (hours < 0) {
    hours += 24;
  }

  return Math.round(hours * 100) / 100;
}

/**
 * Calculate actual worked hours from attendance check-in/check-out
 */
function calculateActualHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;

  const diff = new Date(checkOut) - new Date(checkIn);
  const hours = diff / (1000 * 60 * 60);

  return Math.round(hours * 100) / 100;
}

/**
 * Calculate pay for a single shift
 */
function calculateShiftPay(hours, hourlyRate, shiftType, otMultiplier = 1.5, holidayMultiplier = 2.0) {
  switch (shiftType) {
    case 'OT':
      return hours * hourlyRate * otMultiplier;
    case 'HOLIDAY':
      return hours * hourlyRate * holidayMultiplier;
    default:
      return hours * hourlyRate;
  }
}

/**
 * Calculate monthly payroll summary for an employee
 */
function calculateMonthlyPayroll(shifts, employee) {
  let normalHours = 0;
  let otHours = 0;
  let holidayHours = 0;

  for (const shift of shifts) {
    const hours = calculateHours(shift.startTime, shift.endTime);
    switch (shift.shiftType) {
      case 'OT':
        otHours += hours;
        break;
      case 'HOLIDAY':
        holidayHours += hours;
        break;
      default:
        normalHours += hours;
    }
  }

  const normalPay = normalHours * employee.hourlyRate;
  const otPay = otHours * employee.hourlyRate * employee.otRateMultiplier;
  const holidayPay = holidayHours * employee.hourlyRate * employee.holidayRateMultiplier;
  const totalPay = normalPay + otPay + holidayPay;

  return {
    normalHours: Math.round(normalHours * 100) / 100,
    otHours: Math.round(otHours * 100) / 100,
    holidayHours: Math.round(holidayHours * 100) / 100,
    normalPay: Math.round(normalPay * 100) / 100,
    otPay: Math.round(otPay * 100) / 100,
    holidayPay: Math.round(holidayPay * 100) / 100,
    totalPay: Math.round(totalPay * 100) / 100,
  };
}

module.exports = {
  calculateHours,
  calculateActualHours,
  calculateShiftPay,
  calculateMonthlyPayroll,
};
