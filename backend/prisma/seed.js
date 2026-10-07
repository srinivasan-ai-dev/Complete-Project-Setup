require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding started...');

  const employeeId = 1;

  // Ensure employee exists
  const emp = await prisma.employees.findUnique({ where: { employee_id: employeeId } });
  if (!emp) {
    console.log('Employee 1 does not exist.');
    return;
  }

  // 1. Seed Claims
  await prisma.claims.createMany({
    skipDuplicates: true,
    data: [
      { claim_code: `CLM-2026-0003`, employee_id: employeeId, category: 'Travel', amount: 4500.50, bill_date: new Date('2026-10-02'), description: 'Flight tickets', status: 'APPROVED', approved_at: new Date('2026-10-06T15:30:00Z'), approved_by: 1 },
      { claim_code: `CLM-2026-0004`, employee_id: employeeId, category: 'Internet', amount: 1500.00, bill_date: new Date('2026-10-05'), description: 'Broadband', status: 'PENDING' }
    ]
  });

  // 2. Seed WFH Requests
  try {
    await prisma.wfh_requests.create({
      data: { request_code: 'WFH-2026-0003', employee_id: employeeId, request_date: new Date('2026-10-16'), to_date: new Date('2026-10-18'), work_location: 'Home', reason: 'Doctor appointment', remarks: 'Will be online after 2pm', status: 'PENDING' }
    });
  } catch (e) {} // ignore if exists

  // 3. Seed HR Requests
  try {
    await prisma.hr_requests.create({
      data: { request_code: 'HR-2026-0003', employee_id: employeeId, request_type: 'Address Change', subject: 'Update address', description: 'Moved to a new apartment', priority: 'Normal', expected_date: new Date('2026-10-15'), status: 'PENDING' }
    });
  } catch (e) {}

  // 4. Seed Competencies
  try {
    await prisma.competencies.create({
      data: { skill: 'React.js', competency: 'Frontend Dev', category: 'Technical', proficiency_level: 'Advanced', applicable_role: 'Software Engineer' }
    });
  } catch (e) {}

  // 5. Seed Trainings
  let course;
  try {
    course = await prisma.training_courses.create({
      data: { course_title: 'Advanced React', category: 'Frontend', duration_hours: 30.5, trainer: 'John Doe', mode: 'Online', start_date: new Date('2026-11-01'), end_date: new Date('2026-11-30'), location: 'Zoom', status: 'Scheduled' }
    });
  } catch (e) {
    course = await prisma.training_courses.findFirst({ where: { course_title: 'Advanced React' }});
  }

  try {
    if (course) {
      await prisma.employee_trainings.create({
        data: { employee_id: employeeId, course_id: course.course_id, attendance: 'Present', remarks: 'Good progress', status: 'IN_PROGRESS', progress_percentage: 50, completion_date: new Date('2026-11-15') }
      });
    }
  } catch(e) {}

  // 6. Seed Employee Certifications
  try {
    await prisma.employee_certifications.create({
      data: { employee_id: employeeId, certification_name: 'AWS Certified Developer', issuing_authority: 'AWS', issue_date: new Date('2026-01-01') }
    });
  } catch (e) {}

  // 7. Seed Policies
  try {
    await prisma.company_policies.create({
      data: { title: 'Leave Policy 2026', category: 'HR', published_date: new Date('2026-01-01'), version: '1.0', applicable_to: 'All Employees', status: 'Active' }
    });
  } catch (e) {}

  // 8. Seed Payslips
  try {
    await prisma.payslips.create({
      data: {
        employee_id: employeeId,
        pay_month: 9,
        pay_year: 2026,
        basic_salary: 80000.00,
        hra: 20000.00,
        allowances: 10000.00,
        deductions: 5000.00,
        pf: 2000.00,
        esi: 500.00,
        tds: 1500.00,
        professional_tax: 500.00,
        other_deductions: 500.00,
        net_salary: 105000.00,
        payment_status: 'PAID'
      }
    });
  } catch (e) {}

  console.log('Seeding completed successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
