const prisma = require("../utils/db");

// GET /api/taxes/:employeeId
exports.getTaxDetails = async (req, res, next) => {
    try {
        const employeeId = Number(req.params.employeeId);
        const { page = 1, limit = 10, month, year } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const whereClause = {
            employee_id: employeeId
        };

        if (month) {
            whereClause.pay_month = Number(month);
        }
        
        if (year) {
            whereClause.pay_year = Number(year);
        }

        const [total, payslips] = await Promise.all([
            prisma.payslips.count({ where: whereClause }),
            prisma.payslips.findMany({
                where: whereClause,
                orderBy: [
                    { pay_year: 'desc' },
                    { pay_month: 'desc' }
                ],
                skip,
                take
            })
        ]);

        // Since the Prisma schema only has a total "deductions" field,
        // we'll simulate the breakdown for the UI. In a real application,
        // these would be stored either as separate columns or in a related table.
        const taxDetails = payslips.map(payslip => {
            const totalDeductions = Number(payslip.deductions) || 0;
            
            // Estimated breakdown for UI (Pending schema update for exact granular breakdown columns)
            const pf = totalDeductions * 0.4;
            const esi = totalDeductions * 0.1;
            const tds = totalDeductions * 0.3;
            const professional_tax = totalDeductions * 0.1;
            const other_deductions = totalDeductions * 0.1;

            return {
                payslip_id: payslip.payslip_id,
                pay_month: payslip.pay_month,
                pay_year: payslip.pay_year,
                total_deductions: totalDeductions,
                pf: pf.toFixed(2),
                esi: esi.toFixed(2),
                tds: tds.toFixed(2),
                professional_tax: professional_tax.toFixed(2),
                other_deductions: other_deductions.toFixed(2)
            };
        });

        res.json({
            success: true,
            data: taxDetails,
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
