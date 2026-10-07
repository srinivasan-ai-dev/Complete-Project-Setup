const prisma = require("../utils/db");

// GET /api/attendance/:employeeId
exports.getAttendanceList = async (req, res, next) => {
    try {
        const employeeId = Number(req.params.employeeId);
        const { from_date, to_date, page = 1, limit = 10 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const whereClause = {
            employee_id: employeeId
        };

        if (from_date || to_date) {
            whereClause.attendance_date = {};
            if (from_date) {
                whereClause.attendance_date.gte = new Date(from_date);
            }
            if (to_date) {
                whereClause.attendance_date.lte = new Date(to_date);
            }
        }

        const [total, attendance] = await Promise.all([
            prisma.attendance_records.count({ where: whereClause }),
            prisma.attendance_records.findMany({
                where: whereClause,
                include: {
                    shifts: {
                        select: {
                            shift_name: true
                        }
                    }
                },
                orderBy: {
                    attendance_date: 'desc'
                },
                skip,
                take
            })
        ]);

        // "Day" column can be easily derived on the frontend using the Date, 
        // but we can ensure everything matches the Prisma schema fields:
        // attendance_date, in_time, out_time, total_working_hours, status, shifts.shift_name

        // Because BigInt cannot be serialized to JSON automatically, we need to convert it to string
        const serializedAttendance = attendance.map(record => {
            return {
                ...record,
                attendance_id: record.attendance_id.toString()
            };
        });

        res.json({
            success: true,
            data: serializedAttendance,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        next(error);
    }
};
