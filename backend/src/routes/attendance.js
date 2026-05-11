const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/attendance/punch — Single button: press once = check-in, press again = check-out
router.post('/punch', authenticate, async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ error: 'กรุณาระบุพนักงาน' });
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Find today's open attendance (checked-in but not checked-out)
    const openAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        checkIn: { gte: todayStart, lt: todayEnd },
        checkOut: null,
      },
      include: { shift: true },
    });

    if (openAttendance) {
      // Already checked in → check out
      const updated = await prisma.attendance.update({
        where: { id: openAttendance.id },
        data: { checkOut: now },
        include: {
          shift: true,
          employee: { select: { id: true, name: true, employeeCode: true, avatarColor: true } },
        },
      });

      // Update the shift end time to actual check-out
      if (openAttendance.shiftId) {
        const hours = (now - new Date(openAttendance.checkIn)) / (1000 * 60 * 60);
        await prisma.shift.update({
          where: { id: openAttendance.shiftId },
          data: {
            endTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
          },
        });
      }

      // Log the action
      await prisma.auditLog.create({
        data: {
          action: 'PUNCH_OUT',
          details: `ลงเวลาออกงาน (เวลา ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')})`,
          employeeId: employeeId
        }
      });

      return res.json({ action: 'checkout', attendance: updated, message: 'เช็คเอาท์สำเร็จ' });
    }

    // Not checked in yet → create shift + check in
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const shift = await prisma.shift.create({
      data: {
        employeeId,
        date: todayStart,
        startTime: timeStr,
        endTime: '00:00', // will be updated on check-out
        shiftType: 'NORMAL',
        note: 'บันทึกอัตโนมัติจากระบบลงเวลา',
      },
    });

    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        shiftId: shift.id,
        checkIn: now,
      },
      include: {
        shift: true,
        employee: { select: { id: true, name: true, employeeCode: true, avatarColor: true } },
      },
    });

      // Log the action
      await prisma.auditLog.create({
        data: {
          action: 'PUNCH_IN',
          details: `ลงเวลาเข้างาน (เวลา ${timeStr})`,
          employeeId: employeeId
        }
      });

    return res.status(201).json({ action: 'checkin', attendance, message: 'เช็คอินสำเร็จ' });
  } catch (error) {
    console.error('Punch error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/attendance/status — Get today's check-in status for the current user
router.get('/status', authenticate, async (req, res) => {
  try {
    const { employeeId } = req.query;
    if (!employeeId) return res.json({ isClockedIn: false, currentRecord: null, todayRecords: [] });
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Get all today's attendance records
    const todayRecords = await prisma.attendance.findMany({
      where: {
        employeeId,
        checkIn: { gte: todayStart, lt: todayEnd },
      },
      include: { shift: true },
      orderBy: { checkIn: 'desc' },
    });

    const openRecord = todayRecords.find((r) => !r.checkOut);

    res.json({
      isClockedIn: !!openRecord,
      currentRecord: openRecord || null,
      todayRecords,
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/attendance/checkin (legacy — kept for compatibility)
router.post('/checkin', authenticate, async (req, res) => {
  try {
    const { shiftId } = req.body;
    const employeeId = req.user.id;

    const existing = await prisma.attendance.findUnique({
      where: { shiftId },
    });

    if (existing) {
      return res.status(400).json({ error: 'เช็คอินแล้ว' });
    }

    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        shiftId,
        checkIn: new Date(),
      },
    });

    res.status(201).json(attendance);
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/attendance/checkout (legacy — kept for compatibility)
router.post('/checkout', authenticate, async (req, res) => {
  try {
    const { shiftId } = req.body;

    const attendance = await prisma.attendance.findUnique({
      where: { shiftId },
    });

    if (!attendance) {
      return res.status(400).json({ error: 'ยังไม่ได้เช็คอิน' });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ error: 'เช็คเอาท์แล้ว' });
    }

    const updated = await prisma.attendance.update({
      where: { shiftId },
      data: { checkOut: new Date() },
    });

    res.json(updated);
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/attendance — List attendance records
router.get('/', authenticate, async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;

    const where = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (month && year) {
      const m = parseInt(month) - 1;
      const y = parseInt(year);
      where.shift = {
        date: {
          gte: new Date(y, m, 1),
          lt: new Date(y, m + 1, 1),
        },
      };
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: { id: true, name: true, employeeCode: true, avatarColor: true },
        },
        shift: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(records);
  } catch (error) {
    console.error('List attendance error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
