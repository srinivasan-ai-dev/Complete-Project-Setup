const prisma = require("../utils/db");

// GET /api/trainings
exports.getTrainings = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, category } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const whereClause = {};

        if (category) {
            whereClause.category = category;
        }

        const [total, courses] = await Promise.all([
            prisma.training_courses.count({ where: whereClause }),
            prisma.training_courses.findMany({
                where: whereClause,
                include: {
                    _count: {
                        select: { employee_trainings: true }
                    }
                },
                orderBy: {
                    created_at: 'desc'
                },
                skip,
                take
            })
        ]);

        const formattedTrainings = courses.map(course => {
            const startDate = course.start_date || course.created_at || new Date();
            const endDate = course.end_date || new Date(startDate);
            if (!course.end_date) endDate.setDate(endDate.getDate() + 30); // Fallback for old records

            return {
                training_id: `TRN-${course.course_id.toString().padStart(3, '0')}`,
                name: course.course_title,
                category: course.category || 'General',
                trainer: course.trainer || "Unassigned",
                mode: course.mode || "Online",
                start_end_date: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
                participants: course._count.employee_trainings,
                status: course.status || "Active"
            };
        });

        res.json({
            success: true,
            data: formattedTrainings,
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

// GET /api/trainings/attendance
exports.getTrainingAttendance = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, employee_id, course_id } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const whereClause = {};

        if (employee_id) {
            whereClause.employee_id = Number(employee_id);
        }

        if (course_id) {
            whereClause.course_id = Number(course_id);
        }

        const [total, enrollments] = await Promise.all([
            prisma.employee_trainings.count({ where: whereClause }),
            prisma.employee_trainings.findMany({
                where: whereClause,
                include: {
                    employees: {
                        select: {
                            first_name: true,
                            last_name: true
                        }
                    },
                    training_courses: {
                        select: {
                            course_title: true
                        }
                    }
                },
                orderBy: {
                    enrollment_id: 'desc'
                },
                skip,
                take
            })
        ]);

        // Map data to match the UI columns
        const formattedAttendance = enrollments.map(enrollment => {
            const emp = enrollment.employees;
            const course = enrollment.training_courses;

            return {
                enrollment_id: enrollment.enrollment_id,
                employee: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
                training: course ? course.course_title : 'Unknown',
                date: enrollment.completion_date || new Date(), // Using completion date or current date
                attendance: enrollment.attendance || "Absent",
                completion: `${enrollment.progress_percentage || 0}%`,
                remarks: enrollment.remarks || (enrollment.status === "COMPLETED" ? "Completed successfully" : "In Progress"),
                status: enrollment.status
            };
        });

        res.json({
            success: true,
            data: formattedAttendance,
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

// POST /api/trainings/attendance
exports.createTrainingAttendance = async (req, res, next) => {
    try {
        // These fields match the Figma UI design for creating attendance
        const { employee_id, course_id, date, attendance, remarks } = req.body;

        if (!employee_id || !course_id) {
            const error = new Error("Employee and Training are required");
            error.statusCode = 400;
            throw error;
        }

        // Map the Figma fields to the existing database schema
        const enrollment = await prisma.employee_trainings.create({
            data: {
                employee_id: Number(employee_id),
                course_id: Number(course_id),
                completion_date: date ? new Date(date) : new Date(),
                attendance: attendance,
                remarks: remarks,
                // If attendance is marked as present/completed, we can update status
                status: attendance === 'Present' || attendance === 'Completed' ? 'COMPLETED' : 'ENROLLED',
                progress_percentage: attendance === 'Present' || attendance === 'Completed' ? 100 : 0
            }
        });

        res.status(201).json({ 
            success: true, 
            message: "Training attendance created successfully", 
            data: enrollment 
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/trainings/calendar
exports.getTrainingCalendar = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, search } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const whereClause = {};

        if (search) {
            whereClause.course_title = { contains: search, mode: 'insensitive' };
        }

        const [total, courses] = await Promise.all([
            prisma.training_courses.count({ where: whereClause }),
            prisma.training_courses.findMany({
                where: whereClause,
                include: {
                    _count: {
                        select: { employee_trainings: true }
                    }
                },
                orderBy: {
                    created_at: 'desc'
                },
                skip,
                take
            })
        ]);

        // Map data to match the UI columns
        const formattedCalendar = courses.map(course => {
            const startDate = course.created_at || new Date();

            return {
                training_id: course.course_id,
                training: course.course_title,
                trainer: course.trainer || "Unassigned",
                date: (course.start_date || startDate).toISOString().split('T')[0],
                location: course.location || "TBD",
                participants: course._count.employee_trainings,
                status: course.status || "Scheduled"
            };
        });

        res.json({
            success: true,
            data: formattedCalendar,
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
