const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/logs — Get all audit logs
router.get('/', authenticate, async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        employee: {
          select: { name: true, employeeCode: true, avatarColor: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Limit to recent 100 logs for performance
    });
    res.json(logs);
  } catch (error) {
    console.error('List logs error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล Log' });
  }
});

module.exports = router;
