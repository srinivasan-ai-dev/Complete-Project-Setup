const prisma = require("../utils/db");

// GET /api/claims/:employeeId
exports.getClaims = async (req, res, next) => {
    try {
        const employeeId = Number(req.params.employeeId);
        const { page = 1, limit = 10, status, category } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const whereClause = {
            employee_id: employeeId
        };

        if (status) {
            whereClause.status = status;
        }

        if (category) {
            whereClause.category = category;
        }

        const [total, claims] = await Promise.all([
            prisma.claims.count({ where: whereClause }),
            prisma.claims.findMany({
                where: whereClause,
                orderBy: {
                    created_at: 'desc'
                },
                skip,
                take
            })
        ]);

        res.json({
            success: true,
            data: claims,
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

// POST /api/claims
exports.raiseClaim = async (req, res, next) => {
    try {
        const { employee_id, category, amount, bill_date, description } = req.body;

        if (!employee_id || !category || !amount || !bill_date) {
            const error = new Error("Required fields missing");
            error.statusCode = 400;
            throw error;
        }

        const count = await prisma.claims.count();
        const claim_code = `CLM-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

        const claim = await prisma.claims.create({
            data: {
                claim_code,
                employee_id: Number(employee_id),
                category,
                amount: Number(amount),
                bill_date: new Date(bill_date),
                description,
                status: "PENDING"
            }
        });

        res.status(201).json({ success: true, message: "Claim raised successfully", data: claim });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/claims/:id
exports.updateClaim = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const { category, amount, bill_date, description } = req.body;

        const existingClaim = await prisma.claims.findUnique({
            where: { claim_id: id }
        });

        if (!existingClaim) {
            const error = new Error("Claim not found");
            error.statusCode = 404;
            throw error;
        }

        const claim = await prisma.claims.update({
            where: { claim_id: id },
            data: {
                category: category || existingClaim.category,
                amount: amount ? Number(amount) : existingClaim.amount,
                bill_date: bill_date ? new Date(bill_date) : existingClaim.bill_date,
                description: description !== undefined ? description : existingClaim.description
            }
        });

        res.json({ success: true, message: "Claim updated successfully", data: claim });
    } catch (error) {
        next(error);
    }
};

// GET /api/claims/payment-history/:employeeId
exports.getClaimPaymentHistory = async (req, res, next) => {
    try {
        const employeeId = Number(req.params.employeeId);
        const { page = 1, limit = 10 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        // Fetch claims that are approved or paid
        const whereClause = {
            employee_id: employeeId,
            status: { in: ['APPROVED', 'PAID'] }
        };

        const [total, claims] = await Promise.all([
            prisma.claims.count({ where: whereClause }),
            prisma.claims.findMany({
                where: whereClause,
                orderBy: {
                    approved_at: 'desc'
                },
                skip,
                take
            })
        ]);

        // Map to match the UI columns
        const paymentHistory = claims.map(claim => {
            // Simulated fields for UI since they don't exist in the current schema
            return {
                claim_id: claim.claim_code,
                approved_amount: claim.amount,
                paid_amount: claim.status === 'PAID' ? claim.amount : 0,
                payment_date: claim.approved_at,
                payment_reference: `REF-${claim.claim_id}`,
                status: claim.status
            };
        });

        res.json({
            success: true,
            data: paymentHistory,
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
