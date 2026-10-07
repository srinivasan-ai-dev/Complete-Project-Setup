const prisma = require("../utils/db");

// GET /api/hr-requests
exports.getHrRequests = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, status, request_type } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const whereClause = {};

        if (status) {
            whereClause.status = status;
        }

        if (request_type) {
            whereClause.request_type = request_type;
        }

        const [total, hrRequests] = await Promise.all([
            prisma.hr_requests.count({ where: whereClause }),
            prisma.hr_requests.findMany({
                where: whereClause,
                include: {
                    employees_hr_requests_employee_idToemployees: {
                        select: {
                            first_name: true,
                            last_name: true,
                            departments: {
                                select: {
                                    department_name: true
                                }
                            }
                        }
                    },
                    employees_hr_requests_assigned_toToemployees: {
                        select: {
                            first_name: true,
                            last_name: true
                        }
                    }
                },
                orderBy: {
                    created_at: 'desc'
                },
                skip,
                take
            })
        ]);

        // Map data to match UI columns
        const formattedRequests = hrRequests.map(request => {
            const emp = request.employees_hr_requests_employee_idToemployees;
            const assigned = request.employees_hr_requests_assigned_toToemployees;
            
            return {
                request_id: request.request_code,
                employee: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
                department: emp && emp.departments ? emp.departments.department_name : 'Unknown',
                request_type: request.request_type,
                date: request.created_at,
                priority: "Normal", // Simulated as priority doesn't exist in schema
                assigned_to: assigned ? `${assigned.first_name} ${assigned.last_name}` : 'Unassigned',
                status: request.status
            };
        });

        res.json({
            success: true,
            data: formattedRequests,
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

// POST /api/hr-requests
exports.raiseHrRequest = async (req, res, next) => {
    try {
        const { employee_id, request_type, subject, description, priority, expected_date } = req.body;

        if (!employee_id || !request_type || !subject) {
            const error = new Error("Required fields missing");
            error.statusCode = 400;
            throw error;
        }

        const count = await prisma.hr_requests.count();
        const request_code = `HR-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

        // Combine the Figma-specific fields into the subject or a formatted string since the DB lacks these columns
        let finalSubject = subject;
        if (description || priority || expected_date) {
            finalSubject = `${subject} | Desc: ${description || 'N/A'} | Priority: ${priority || 'N/A'} | Expected: ${expected_date || 'N/A'}`;
        }
        
        // Truncate to fit the 255 char limit in DB
        finalSubject = finalSubject.substring(0, 255);

        const request = await prisma.hr_requests.create({
            data: {
                request_code,
                employee_id: Number(employee_id),
                request_type,
                subject: finalSubject,
                status: "PENDING"
            }
        });

        res.status(201).json({ success: true, message: "HR Request raised successfully", data: request });
    } catch (error) {
        next(error);
    }
};
