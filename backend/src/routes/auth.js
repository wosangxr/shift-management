const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' });
    }

    const employee = await prisma.employee.findUnique({ where: { email } });

    if (!employee) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const isValid = await bcrypt.compare(password, employee.password);
    if (!isValid) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const token = jwt.sign(
      {
        id: employee.id,
        email: employee.email,
        role: employee.role,
        name: employee.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...employeeData } = employee;

    res.json({ token, employee: employeeData });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'ไม่ได้เข้าสู่ระบบ' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const employee = await prisma.employee.findUnique({
      where: { id: decoded.id },
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
      },
    });

    if (!employee) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });

    res.json(employee);
  } catch (error) {
    res.status(401).json({ error: 'Token ไม่ถูกต้อง' });
  }
});

module.exports = router;
