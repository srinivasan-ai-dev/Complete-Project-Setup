const prisma = require("../utils/db");

// GET /api/policies
exports.getPolicies = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, category } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const whereClause = {};

        if (category) {
            whereClause.category = category;
        }

        const [total, policies] = await Promise.all([
            prisma.company_policies.count({ where: whereClause }),
            prisma.company_policies.findMany({
                where: whereClause,
                orderBy: {
                    published_date: 'desc'
                },
                skip,
                take
            })
        ]);

        // Map data to match the UI columns
        const formattedPolicies = policies.map(policy => {
            return {
                policy_id: `POL-${policy.policy_id.toString().padStart(3, '0')}`,
                policy_name: policy.title,
                category: policy.category || 'General',
                version: policy.version,
                effective_from: policy.published_date,
                applicable_to: policy.applicable_to || "All Employees",
                status: policy.status || "Active",
                document_url: policy.document_url
            };
        });

        res.json({
            success: true,
            data: formattedPolicies,
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
