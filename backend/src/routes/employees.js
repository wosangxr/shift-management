const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/employees — List all employees
router.get('/', authenticate, async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        employeeCode: true,
        name: true,
        email: true,
        role: true,
        position: true,
        department: true,
        hourlyRate: true,
        otRateMultiplier: true,
        holidayRateMultiplier: true,
        avatarColor: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { employeeCode: 'asc' },
    });
    res.json(employees);
  } catch (error) {
    console.error('List employees error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/employees/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        employeeCode: true,
        name: true,
        email: true,
        role: true,
        position: true,
        department: true,
        hourlyRate: true,
        otRateMultiplier: true,
        holidayRateMultiplier: true,
        avatarColor: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!employee) return res.status(404).json({ error: 'ไม่พบพนักงาน' });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/employees
router.post('/', authenticate, authorizeRoles('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { employeeCode, name, email, password, role, position, department, hourlyRate, otRateMultiplier, holidayRateMultiplier, avatarColor } = req.body;

    const hashedPassword = await bcrypt.hash(password || 'password123', 10);

    const employee = await prisma.employee.create({
      data: {
        employeeCode,
        name,
        email,
        password: hashedPassword,
        role: role || 'EMPLOYEE',
        position: position || '',
        department: department || '',
        hourlyRate: hourlyRate || 0,
        otRateMultiplier: otRateMultiplier || 1.5,
        holidayRateMultiplier: holidayRateMultiplier || 2.0,
        avatarColor: avatarColor || '#6366f1',
      },
    });

    const { password: _, ...data } = employee;
    res.status(201).json(data);
  } catch (error) {
    console.error('Create employee error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'อีเมลหรือรหัสพนักงานซ้ำ' });
    }
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/employees/:id
router.put('/:id', authenticate, authorizeRoles('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { name, email, role, position, department, hourlyRate, otRateMultiplier, holidayRateMultiplier, avatarColor, isActive } = req.body;

    const employee = await prisma.employee.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(role !== undefined && { role }),
        ...(position !== undefined && { position }),
        ...(department !== undefined && { department }),
        ...(hourlyRate !== undefined && { hourlyRate }),
        ...(otRateMultiplier !== undefined && { otRateMultiplier }),
        ...(holidayRateMultiplier !== undefined && { holidayRateMultiplier }),
        ...(avatarColor !== undefined && { avatarColor }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    const { password: _, ...data } = employee;
    res.json(data);
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/employees/:id
router.delete('/:id', authenticate, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    await prisma.employee.delete({ where: { id: req.params.id } });
    res.json({ message: 'ลบพนักงานเรียบร้อย' });
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
