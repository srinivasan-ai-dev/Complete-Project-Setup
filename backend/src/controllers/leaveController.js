const prisma = require("../utils/db");

// GET /api/leave-requests
exports.getAllLeaveRequests = async (req, res, next) => {
    try {
        const requests = await prisma.leave_requests.findMany({
            // include: {} --> get the related tables too 
            //(Here we access "leave_requests" table, but we also access "leave_type" table)
            include: {

                leave_types: true, 

                employees_leave_requests_employee_idToemployees: {
                    select: { 
                        first_name: true, 
                        last_name: true, 
                        employee_code: true }
                }
            },
            orderBy: {
                created_at: "desc"
            }
        });

        res.json({
            success: true,
            data: requests
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/leave-requests/:id
exports.getLeaveRequestById = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        const request = await prisma.leave_requests.findUnique({
            where: { leave_request_id: id },
            include: {
                leave_types: true,
                employees_leave_requests_employee_idToemployees: true,
                employees_leave_requests_reviewed_byToemployees: true
            }
        });

        if (!request) {
            const error = new Error("Leave request not found");
            error.statusCode = 404;
            throw error;
        }

        res.json({ success: true, data: request });
    } catch (error) {
        next(error);
    }
};

// POST /api/leave-requests
exports.applyForLeave = async (req, res, next) => {
    try {
        const { employee_id, leave_type_id, from_date, to_date, reason, no_of_days } = req.body;

        if (!employee_id || !leave_type_id || !from_date || !to_date || !reason) {
            const error = new Error("All fields are required");
            error.statusCode = 400;
            throw error;
        }

        const employee = await prisma.employees.findUnique({
            where: { employee_id: Number(employee_id) }
        });

        if (!employee) {
            const error = new Error("Employee not found");
            error.statusCode = 404;
            throw error;
        }

        const leaveType = await prisma.leave_types.findUnique({
            where: { leave_type_id: Number(leave_type_id) }
        });

        if (!leaveType) {
            const error = new Error("Leave type not found");
            error.statusCode = 404;
            throw error;
        }

        const from = new Date(from_date);
        const to = new Date(to_date);
        
        let total_days;
        if (no_of_days) {
            total_days = Number(no_of_days);
        } else {
            total_days = Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1;
        }

        if (total_days <= 0) {
            const error = new Error("Invalid date range or no. of days");
            error.statusCode = 400;
            throw error;
        }

        const count = await prisma.leave_requests.count();
        const request_code = `LV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

        const request = await prisma.leave_requests.create({
            data: {
                request_code,
                employee_id: Number(employee_id),
                leave_type_id: Number(leave_type_id),
                from_date: from,
                to_date: to,
                total_days,
                reason,
                status: "PENDING"
            }
        });

        res.status(201).json({ success: true, message: "Leave applied successfully", data: request });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/leave-requests/:id/status
exports.updateLeaveStatus = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const { status, reviewed_by, reviewer_comments } = req.body;

        if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
            const error = new Error("Invalid status");
            error.statusCode = 400;
            throw error;
        }

        const existingRequest = await prisma.leave_requests.findUnique({
            where: { leave_request_id: id }
        });

        if (!existingRequest) {
            const error = new Error("Leave request not found");
            error.statusCode = 404;
            throw error;
        }

        const updatedRequest = await prisma.leave_requests.update({
            where: { leave_request_id: id },
            data: {
                status,
                reviewed_by: reviewed_by ? Number(reviewed_by) : null,
                reviewed_at: new Date(),
                reviewer_comments: reviewer_comments || null
            }
        });

        res.json({ success: true, message: `Leave ${status.toLowerCase()}`, data: updatedRequest });
    } catch (error) {
        next(error);
    }
};

// GET /api/leave-requests/balances/:employeeId
exports.getLeaveBalances = async (req, res, next) => {
    try {
        const employeeId = Number(req.params.employeeId);
        const year = new Date().getFullYear();

        const leaveTypes = await prisma.leave_types.findMany();

        const startOfYear = new Date(`${year}-01-01T00:00:00Z`);
        const endOfYear = new Date(`${year}-12-31T23:59:59Z`);

        const approvedLeaves = await prisma.leave_requests.groupBy({
            by: ['leave_type_id'],
            where: {
                employee_id: employeeId,
                status: 'APPROVED',
                from_date: {
                    gte: startOfYear,
                },
                to_date: {
                    lte: endOfYear,
                }
            },
            _sum: {
                total_days: true
            }
        });

        const balances = leaveTypes.map(type => {
            const takenData = approvedLeaves.find(l => l.leave_type_id === type.leave_type_id);
            const takenDays = takenData && takenData._sum.total_days ? Number(takenData._sum.total_days) : 0;
            return {
                leave_type_id: type.leave_type_id,
                type_name: type.type_name,
                type_code: type.type_code,
                annual_quota: type.annual_quota,
                taken_leaves: takenDays,
                available_balance: type.annual_quota - takenDays
            };
        });

        res.json({
            success: true,
            data: balances
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/leave-requests/history/:employeeId
exports.getLeaveHistory = async (req, res, next) => {
    try {
        const employeeId = Number(req.params.employeeId);
        const { from_date, to_date, page = 1, limit = 10 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const whereClause = {
            employee_id: employeeId
        };

        if (from_date || to_date) {
            whereClause.from_date = {};
            if (from_date) {
                whereClause.from_date.gte = new Date(from_date);
            }
            if (to_date) {
                whereClause.from_date.lte = new Date(to_date);
            }
        }

        const [total, history] = await Promise.all([
            prisma.leave_requests.count({ where: whereClause }),
            prisma.leave_requests.findMany({
                where: whereClause,
                include: {
                    leave_types: {
                        select: {
                            type_name: true,
                            type_code: true
                        }
                    },
                    employees_leave_requests_reviewed_byToemployees: {
                        select: {
                            first_name: true,
                            last_name: true,
                        }
                    }
                },
                orderBy: {
                    from_date: 'desc'
                },
                skip,
                take
            })
        ]);

        res.json({
            success: true,
            data: history,
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
