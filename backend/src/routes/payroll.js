const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { calculateMonthlyPayroll } = require('../utils/payroll');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/payroll/:month/:year — Calculate & get payroll for a month
router.get('/:month/:year', authenticate, async (req, res) => {
  try {
    const month = parseInt(req.params.month);
    const year = parseInt(req.params.year);

    // Get all employees
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      select: {
        id: true,
        employeeCode: true,
        name: true,
        department: true,
        position: true,
        hourlyRate: true,
        otRateMultiplier: true,
        holidayRateMultiplier: true,
        avatarColor: true,
      },
    });

    const payrollData = [];

    for (const emp of employees) {
      // Get shifts for this employee in this month
      const shifts = await prisma.shift.findMany({
        where: {
          employeeId: emp.id,
          date: {
            gte: new Date(year, month - 1, 1),
            lt: new Date(year, month, 1),
          },
        },
      });

      const calculation = calculateMonthlyPayroll(shifts, emp);

      // Upsert payroll record
      const payroll = await prisma.payroll.upsert({
        where: {
          employeeId_month_year: {
            employeeId: emp.id,
            month,
            year,
          },
        },
        update: {
          ...calculation,
        },
        create: {
          employeeId: emp.id,
          month,
          year,
          ...calculation,
        },
      });

      payrollData.push({
        ...payroll,
        employee: emp,
      });
    }

    // Calculate totals
    const totals = payrollData.reduce(
      (acc, p) => ({
        normalHours: acc.normalHours + p.normalHours,
        otHours: acc.otHours + p.otHours,
        holidayHours: acc.holidayHours + p.holidayHours,
        normalPay: acc.normalPay + p.normalPay,
        otPay: acc.otPay + p.otPay,
        holidayPay: acc.holidayPay + p.holidayPay,
        totalPay: acc.totalPay + p.totalPay,
      }),
      { normalHours: 0, otHours: 0, holidayHours: 0, normalPay: 0, otPay: 0, holidayPay: 0, totalPay: 0 }
    );

    res.json({ payroll: payrollData, totals, month, year });
  } catch (error) {
    console.error('Payroll calculation error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการคำนวณเงินเดือน' });
  }
});

// PUT /api/payroll/:id/status — Update payroll status (approve/pay)
router.put('/:id/status', authenticate, authorizeRoles('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { status } = req.body;

    const payroll = await prisma.payroll.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json(payroll);
  } catch (error) {
    console.error('Update payroll status error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/payroll/employee/:employeeId — Get payroll history for an employee
router.get('/employee/:employeeId', authenticate, async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Store terminal mode: Allow open viewing

    const payrolls = await prisma.payroll.findMany({
      where: { employeeId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    res.json(payrolls);
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
