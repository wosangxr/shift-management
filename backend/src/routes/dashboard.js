const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/dashboard/stats — Dashboard summary stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 1);
    const today = new Date(year, now.getMonth(), now.getDate());
    const tomorrow = new Date(year, now.getMonth(), now.getDate() + 1);

    // Total employees
    const totalEmployees = await prisma.employee.count({ where: { isActive: true } });

    // Shifts today
    const shiftsToday = await prisma.shift.count({
      where: {
        date: { gte: today, lt: tomorrow },
      },
    });

    // Attendance today
    const checkedInToday = await prisma.attendance.count({
      where: {
        checkIn: { gte: today, lt: tomorrow },
      },
    });

    // Total shifts this month
    const monthlyShifts = await prisma.shift.count({
      where: {
        date: { gte: startOfMonth, lt: endOfMonth },
      },
    });

    // OT shifts this month
    const otShifts = await prisma.shift.count({
      where: {
        date: { gte: startOfMonth, lt: endOfMonth },
        shiftType: { in: ['OT', 'HOLIDAY'] },
      },
    });

    // Recent attendance
    const recentAttendance = await prisma.attendance.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: { name: true, employeeCode: true, avatarColor: true },
        },
        shift: {
          select: { startTime: true, endTime: true, shiftType: true, date: true },
        },
      },
    });

    // Department breakdown
    const departments = await prisma.employee.groupBy({
      by: ['department'],
      where: { isActive: true },
      _count: { id: true },
    });

    res.json({
      totalEmployees,
      shiftsToday,
      checkedInToday,
      monthlyShifts,
      otShifts,
      recentAttendance,
      departments: departments.map((d) => ({
        name: d.department || 'ไม่ระบุ',
        count: d._count.id,
      })),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
