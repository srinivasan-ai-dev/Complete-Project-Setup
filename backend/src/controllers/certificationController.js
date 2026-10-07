const prisma = require("../utils/db");

// GET /api/certifications
exports.getCertifications = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, employee_id } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const whereClause = {};
        if (employee_id) {
            whereClause.employee_id = Number(employee_id);
        }

        const [total, certs] = await Promise.all([
            prisma.employee_certifications.count({ where: whereClause }),
            prisma.employee_certifications.findMany({
                where: whereClause,
                include: {
                    employees: {
                        select: {
                            first_name: true,
                            last_name: true
                        }
                    }
                },
                orderBy: {
                    issue_date: 'desc'
                },
                skip,
                take
            })
        ]);

        const formattedCerts = certs.map(cert => {
            const emp = cert.employees;
            const now = new Date();
            let status = "Active";
            if (cert.expiry_date && new Date(cert.expiry_date) < now) {
                status = "Expired";
            }

            return {
                certification_id: cert.certification_id,
                employee: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
                certification: cert.certification_name,
                issuing_authority: cert.issuing_authority || 'N/A',
                issue_date: cert.issue_date,
                expiry_date: cert.expiry_date,
                status: status,
                credential_url: cert.credential_url,
                renewal_required: cert.renewal_required
            };
        });

        res.json({
            success: true,
            data: formattedCerts,
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

// POST /api/certifications
exports.createCertification = async (req, res, next) => {
    try {
        const { 
            employee_id, 
            certification_name, 
            issuing_authority, 
            issue_date, 
            expiry_date,
            credential_url,
            renewal_required // from figma UI
        } = req.body;

        if (!employee_id || !certification_name) {
            const error = new Error("Employee and Certification Name are required");
            error.statusCode = 400;
            throw error;
        }

        const cert = await prisma.employee_certifications.create({
            data: {
                employee_id: Number(employee_id),
                certification_name,
                issuing_authority: issuing_authority || null,
                issue_date: issue_date ? new Date(issue_date) : null,
                expiry_date: expiry_date ? new Date(expiry_date) : null,
                credential_url: credential_url || null,
                renewal_required: renewal_required || false
            }
        });

        res.status(201).json({ 
            success: true, 
            message: "Certification created successfully", 
            data: cert 
        });
    } catch (error) {
        next(error);
    }
};
