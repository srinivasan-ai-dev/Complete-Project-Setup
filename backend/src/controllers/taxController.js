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
            
            return {
                payslip_id: payslip.payslip_id,
                pay_month: payslip.pay_month,
                pay_year: payslip.pay_year,
                total_deductions: totalDeductions,
                pf: Number(payslip.pf || 0).toFixed(2),
                esi: Number(payslip.esi || 0).toFixed(2),
                tds: Number(payslip.tds || 0).toFixed(2),
                professional_tax: Number(payslip.professional_tax || 0).toFixed(2),
                other_deductions: Number(payslip.other_deductions || 0).toFixed(2)
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
