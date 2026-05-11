const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/shifts — List shifts with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { employeeId, startDate, endDate, month, year } = req.query;

    const where = {};

    if (employeeId) where.employeeId = employeeId;


    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (month && year) {
      const m = parseInt(month) - 1;
      const y = parseInt(year);
      where.date = {
        gte: new Date(y, m, 1),
        lt: new Date(y, m + 1, 1),
      };
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            avatarColor: true,
            department: true,
          },
        },
        attendance: true,
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    res.json(shifts);
  } catch (error) {
    console.error('List shifts error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/shifts — Create a shift
router.post('/', authenticate, authorizeRoles('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { employeeId, date, startTime, endTime, shiftType, note } = req.body;

    const shift = await prisma.shift.create({
      data: {
        employeeId,
        date: new Date(date),
        startTime,
        endTime,
        shiftType: shiftType || 'NORMAL',
        note: note || '',
      },
      include: {
        employee: {
          select: { id: true, name: true, employeeCode: true, avatarColor: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE_SHIFT',
        details: `เพิ่มกะงานใหม่ วันที่ ${date} เวลา ${startTime}-${endTime}`,
        employeeId: employeeId
      }
    });

    res.status(201).json(shift);
  } catch (error) {
    console.error('Create shift error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/shifts/:id — Update a shift (including drag-and-drop reschedule)
router.put('/:id', authenticate, authorizeRoles('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { employeeId, date, startTime, endTime, shiftType, note } = req.body;

    const shift = await prisma.shift.update({
      where: { id: req.params.id },
      data: {
        ...(employeeId !== undefined && { employeeId }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(shiftType !== undefined && { shiftType }),
        ...(note !== undefined && { note }),
      },
      include: {
        employee: {
          select: { id: true, name: true, employeeCode: true, avatarColor: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_SHIFT',
        details: `แก้ไขกะงาน วันที่ ${shift.date.toISOString().split('T')[0]} เวลา ${shift.startTime}-${shift.endTime}`,
        employeeId: shift.employeeId
      }
    });

    res.json(shift);
  } catch (error) {
    console.error('Update shift error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/shifts/:id
router.delete('/:id', authenticate, authorizeRoles('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const shift = await prisma.shift.findUnique({ where: { id: req.params.id } });
    if (shift) {
      await prisma.auditLog.create({
        data: {
          action: 'DELETE_SHIFT',
          details: `ลบกะงาน วันที่ ${shift.date.toISOString().split('T')[0]} เวลา ${shift.startTime}-${shift.endTime}`,
          employeeId: shift.employeeId
        }
      });
      await prisma.shift.delete({ where: { id: req.params.id } });
    }
    res.json({ message: 'ลบกะเรียบร้อย' });
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/shifts/bulk — Create multiple shifts at once
router.post('/bulk', authenticate, authorizeRoles('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { shifts } = req.body; // Array of shift objects

    const created = await prisma.shift.createMany({
      data: shifts.map((s) => ({
        employeeId: s.employeeId,
        date: new Date(s.date),
        startTime: s.startTime,
        endTime: s.endTime,
        shiftType: s.shiftType || 'NORMAL',
        note: s.note || '',
      })),
    });

    res.status(201).json({ count: created.count });
  } catch (error) {
    console.error('Bulk create shifts error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
