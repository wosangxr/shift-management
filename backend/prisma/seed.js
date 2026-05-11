const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.payroll.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.employee.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create employees
  const employees = await Promise.all([
    prisma.employee.create({
      data: {
        employeeCode: 'EMP001',
        name: 'สมชาย วงศ์ดี',
        email: 'somchai@company.com',
        password: hashedPassword,
        role: 'ADMIN',
        position: 'ผู้จัดการทั่วไป',
        department: 'บริหาร',
        hourlyRate: 250,
        otRateMultiplier: 1.5,
        holidayRateMultiplier: 2.0,
        avatarColor: '#6366f1',
      },
    }),
    prisma.employee.create({
      data: {
        employeeCode: 'EMP002',
        name: 'สุดา แสงจันทร์',
        email: 'suda@company.com',
        password: hashedPassword,
        role: 'MANAGER',
        position: 'หัวหน้าแผนก',
        department: 'ฝ่ายผลิต',
        hourlyRate: 200,
        otRateMultiplier: 1.5,
        holidayRateMultiplier: 2.0,
        avatarColor: '#ec4899',
      },
    }),
    prisma.employee.create({
      data: {
        employeeCode: 'EMP003',
        name: 'วิชัย เจริญสุข',
        email: 'wichai@company.com',
        password: hashedPassword,
        role: 'EMPLOYEE',
        position: 'พนักงานทั่วไป',
        department: 'ฝ่ายผลิต',
        hourlyRate: 150,
        otRateMultiplier: 1.5,
        holidayRateMultiplier: 2.0,
        avatarColor: '#14b8a6',
      },
    }),
    prisma.employee.create({
      data: {
        employeeCode: 'EMP004',
        name: 'นภา พรมมา',
        email: 'napa@company.com',
        password: hashedPassword,
        role: 'EMPLOYEE',
        position: 'พนักงานทั่วไป',
        department: 'ฝ่ายบริการ',
        hourlyRate: 150,
        otRateMultiplier: 1.5,
        holidayRateMultiplier: 2.0,
        avatarColor: '#f59e0b',
      },
    }),
    prisma.employee.create({
      data: {
        employeeCode: 'EMP005',
        name: 'ธนา สมบูรณ์',
        email: 'tana@company.com',
        password: hashedPassword,
        role: 'EMPLOYEE',
        position: 'ช่างเทคนิค',
        department: 'ฝ่ายผลิต',
        hourlyRate: 180,
        otRateMultiplier: 1.5,
        holidayRateMultiplier: 2.0,
        avatarColor: '#ef4444',
      },
    }),
    prisma.employee.create({
      data: {
        employeeCode: 'EMP006',
        name: 'ปิยะ รุ่งเรือง',
        email: 'piya@company.com',
        password: hashedPassword,
        role: 'EMPLOYEE',
        position: 'พนักงานทั่วไป',
        department: 'ฝ่ายบริการ',
        hourlyRate: 150,
        otRateMultiplier: 1.5,
        holidayRateMultiplier: 2.0,
        avatarColor: '#8b5cf6',
      },
    }),
  ]);

  console.log(`✅ Created ${employees.length} employees`);

  // Create shifts for current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  const shiftTemplates = [
    { startTime: '06:00', endTime: '14:00', shiftType: 'NORMAL' },
    { startTime: '14:00', endTime: '22:00', shiftType: 'NORMAL' },
    { startTime: '22:00', endTime: '06:00', shiftType: 'NORMAL' },
    { startTime: '09:00', endTime: '17:00', shiftType: 'NORMAL' },
  ];

  const shifts = [];
  for (const emp of employees) {
    // Generate shifts for 15 days
    for (let day = 1; day <= 15; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();

      // Skip some Sundays
      if (dayOfWeek === 0 && Math.random() > 0.3) continue;

      const template = shiftTemplates[Math.floor(Math.random() * shiftTemplates.length)];
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const shift = await prisma.shift.create({
        data: {
          employeeId: emp.id,
          date: date,
          startTime: template.startTime,
          endTime: template.endTime,
          shiftType: isWeekend ? (dayOfWeek === 0 ? 'HOLIDAY' : 'OT') : template.shiftType,
          note: isWeekend ? 'กะวันหยุด' : '',
        },
      });
      shifts.push(shift);

      // Create attendance for past dates
      if (date < now) {
        const [startH, startM] = template.startTime.split(':').map(Number);
        const [endH, endM] = template.endTime.split(':').map(Number);

        const checkIn = new Date(year, month, day, startH, startM + Math.floor(Math.random() * 10));
        let checkOut;
        if (endH < startH) {
          checkOut = new Date(year, month, day + 1, endH, endM - Math.floor(Math.random() * 10));
        } else {
          checkOut = new Date(year, month, day, endH, endM - Math.floor(Math.random() * 10));
        }

        await prisma.attendance.create({
          data: {
            employeeId: emp.id,
            shiftId: shift.id,
            checkIn: checkIn,
            checkOut: checkOut,
          },
        });
      }
    }
  }

  console.log(`✅ Created ${shifts.length} shifts with attendance records`);
  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
