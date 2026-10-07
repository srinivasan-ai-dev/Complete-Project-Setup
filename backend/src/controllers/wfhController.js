const prisma = require("../utils/db");

// GET /api/wfh-requests/:employeeId
exports.getWfhRequests = async (req, res, next) => {
    try {
        const employeeId = Number(req.params.employeeId);
        const { page = 1, limit = 10, status, from_date, to_date } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const whereClause = {
            employee_id: employeeId
        };

        if (status) {
            whereClause.status = status;
        }

        if (from_date || to_date) {
            whereClause.request_date = {};
            if (from_date) {
                whereClause.request_date.gte = new Date(from_date);
            }
            if (to_date) {
                whereClause.request_date.lte = new Date(to_date);
            }
        }

        const [total, wfhRequests] = await Promise.all([
            prisma.wfh_requests.count({ where: whereClause }),
            prisma.wfh_requests.findMany({
                where: whereClause,
                orderBy: {
                    request_date: 'desc'
                },
                skip,
                take
            })
        ]);

        res.json({
            success: true,
            data: wfhRequests,
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

// POST /api/wfh-requests
exports.applyForWfh = async (req, res, next) => {
    try {
        // These fields match the Figma UI design for creating WFH request
        const { employee_id, from_date, to_date, work_location, reason, remarks } = req.body;

        if (!employee_id || !from_date || !reason) {
            const error = new Error("Employee, From Date, and Reason are required");
            error.statusCode = 400;
            throw error;
        }

        const count = await prisma.wfh_requests.count();
        const request_code = `WFH-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

        const request = await prisma.wfh_requests.create({
            data: {
                request_code,
                employee_id: Number(employee_id),
                request_date: new Date(from_date),
                to_date: to_date ? new Date(to_date) : null,
                work_location: work_location || null,
                remarks: remarks || null,
                reason,
                work_handover_details: null,
                status: "PENDING"
            }
        });

        res.status(201).json({ success: true, message: "WFH applied successfully", data: request });
    } catch (error) {
        next(error);
    }
};
