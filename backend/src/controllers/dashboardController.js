const prisma = require("../utils/db");

// GET /api/dashboard/:employeeId
exports.getDashboardData = async (req, res, next) => {
    try {
        const employeeId = Number(req.params.employeeId);
        const currentYear = new Date().getFullYear();

        // 1. Employee Profile Details
        const employee = await prisma.employees.findUnique({
            where: { employee_id: employeeId },
            include: {
                designations: true,
                departments: true,
                offices: true
            }
        });

        if (!employee) {
            const error = new Error("Employee not found");
            error.statusCode = 404;
            throw error;
        }

        const employeeProfile = {
            name: `${employee.first_name} ${employee.last_name}`,
            designation: employee.designations ? employee.designations.designation_name : "Employee",
            phone: employee.phone_number || "N/A",
            email: employee.email,
            office: employee.offices ? employee.offices.office_name : "N/A",
            joined_on: employee.date_of_joining
        };

        // 2. Leave Summary
        // Fetch from employee_leave_balances
        const leaveBalance = await prisma.employee_leave_balances.findUnique({
            where: {
                employee_id_calendar_year: {
                    employee_id: employeeId,
                    calendar_year: currentYear
                }
            }
        });

        const leaveSummary = {
            total_leaves: leaveBalance ? leaveBalance.total_leaves : 0,
            taken: leaveBalance ? Number(leaveBalance.taken_leaves) : 0,
            absent: leaveBalance ? leaveBalance.absent_days : 0,
            requests: leaveBalance ? leaveBalance.pending_request_count : 0,
            worked_days: leaveBalance ? leaveBalance.worked_days : 0,
            loss_of_pay: leaveBalance ? leaveBalance.loss_of_pay_days : 0
        };

        // 3. Attendance Summary & Daily Status
        // Get today's attendance record
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayAttendance = await prisma.attendance_records.findFirst({
            where: {
                employee_id: employeeId,
                attendance_date: {
                    gte: today
                }
            }
        });

        // Get total attendance counts for the year
        const startOfYear = new Date(currentYear, 0, 1);
        const endOfYear = new Date(currentYear, 11, 31);
        
        const yearlyAttendance = await prisma.attendance_records.findMany({
            where: {
                employee_id: employeeId,
                attendance_date: {
                    gte: startOfYear,
                    lte: endOfYear
                }
            }
        });

        const wfhRequests = await prisma.wfh_requests.count({
            where: {
                employee_id: employeeId,
                status: 'APPROVED',
                request_date: {
                    gte: startOfYear,
                    lte: endOfYear
                }
            }
        });

        const onTimeCount = yearlyAttendance.filter(a => !a.is_late && a.status === 'PRESENT').length;
        const lateCount = yearlyAttendance.filter(a => a.is_late).length;
        const absentCount = yearlyAttendance.filter(a => a.status === 'ABSENT').length;
        const sickCount = yearlyAttendance.filter(a => a.status === 'SICK').length;

        // Calculate actual percentile based on on-time attendance across org
        const allEmployeesYearlyAttendance = await prisma.attendance_records.findMany({
            where: {
                attendance_date: {
                    gte: startOfYear,
                    lte: endOfYear
                }
            },
            select: {
                employee_id: true,
                is_late: true,
                status: true
            }
        });

        const employeeOnTimeCounts = {};
        allEmployeesYearlyAttendance.forEach(a => {
            if (!employeeOnTimeCounts[a.employee_id]) employeeOnTimeCounts[a.employee_id] = 0;
            if (!a.is_late && a.status === 'PRESENT') {
                employeeOnTimeCounts[a.employee_id]++;
            }
        });
        
        const totalEmployees = Object.keys(employeeOnTimeCounts).length;
        let computedPercentile = 100;
        
        if (totalEmployees > 1) {
            const myOnTimeCount = employeeOnTimeCounts[employeeId] || 0;
            let strictlyWorse = 0;
            for (const empId in employeeOnTimeCounts) {
                if (Number(empId) !== employeeId && employeeOnTimeCounts[empId] < myOnTimeCount) {
                    strictlyWorse++;
                }
            }
            computedPercentile = Math.round((strictlyWorse / (totalEmployees - 1)) * 100);
        } else if (totalEmployees === 0) {
            computedPercentile = 0;
        }

        const attendanceSummary = {
            on_time: onTimeCount,
            late: lateCount,
            wfh: wfhRequests,
            absent: absentCount,
            sick_leave: sickCount,
            percentile: `Better than ${computedPercentile}% Employees`
        };

        const dailyStatus = {
            punch_in_time: todayAttendance ? todayAttendance.first_punch_in : null,
            total_hours: todayAttendance ? Number(todayAttendance.total_working_hours) : 0,
            production_hours: todayAttendance ? Number(todayAttendance.production_hours) : 0,
            is_punched_in: todayAttendance ? (todayAttendance.last_punch_out === null) : false
        };

        // 4. Performance
        const perfRecords = await prisma.employee_performance_records.findMany({
            where: {
                employee_id: employeeId,
                evaluation_year: currentYear
            },
            orderBy: {
                evaluation_month: 'asc'
            }
        });

        const currentPerf = perfRecords.length > 0 ? perfRecords[perfRecords.length - 1] : null;
        
        const performance = {
            score: currentPerf ? Number(currentPerf.score_percentage) : 0,
            growth: currentPerf ? `${Number(currentPerf.yoy_growth_percentage) > 0 ? '+' : ''}${Number(currentPerf.yoy_growth_percentage)}% vs last years` : "0% vs last years",
            chart_data: perfRecords.map(p => Number(p.score_percentage))
        };

        // 5. Team Members
        let formattedTeam = [];
        if (employee.department_id) {
            const teamMembers = await prisma.employees.findMany({
                where: {
                    department_id: employee.department_id,
                    employee_id: { not: employeeId }
                },
                take: 4,
                include: { designations: true }
            });

            formattedTeam = teamMembers.map(member => ({
                name: `${member.first_name} ${member.last_name}`,
                designation: member.designations ? member.designations.designation_name : "Team Member"
            }));
        }

        // 6. Notifications
        const notificationsRaw = await prisma.notifications.findMany({
            where: { recipient_id: employeeId },
            orderBy: { created_at: 'desc' },
            take: 4
        });
        
        const notifications = notificationsRaw.map(n => ({
            id: n.notification_id.toString(),
            message: n.title || n.message,
            time: n.created_at,
            type: n.notification_type
        }));

        // Combine everything
        res.json({
            success: true,
            data: {
                profile: employeeProfile,
                attendance_summary: attendanceSummary,
                leave_summary: leaveSummary,
                daily_status: dailyStatus,
                performance: performance,
                team_members: formattedTeam,
                notifications: notifications
            }
        });

    } catch (error) {
        next(error);
    }
};
