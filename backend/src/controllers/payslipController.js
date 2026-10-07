const prisma = require("../utils/db");

// GET /api/payslips/:employeeId
exports.getPayslips = async (req, res, next) => {
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

        // Calculate Gross and Total Deductions dynamically from native DB fields
        const formattedPayslips = payslips.map(payslip => {
            const basic = Number(payslip.basic_salary) || 0;
            const hra = Number(payslip.hra) || 0;
            const allowances = Number(payslip.allowances) || 0;
            const pf = Number(payslip.pf) || 0;
            const esi = Number(payslip.esi) || 0;
            const tds = Number(payslip.tds) || 0;
            const pt = Number(payslip.professional_tax) || 0;
            const otherDeductions = Number(payslip.other_deductions) || 0;
            const generalDeductions = Number(payslip.deductions) || 0;
            
            return {
                ...payslip,
                gross_salary: basic + hra + allowances,
                total_deductions: pf + esi + tds + pt + otherDeductions + generalDeductions,
                // Flatten Prisma.Decimal objects to JS Numbers for clean JSON serialization
                basic_salary: basic,
                hra: hra,
                allowances: allowances,
                pf: pf,
                esi: esi,
                tds: tds,
                professional_tax: pt,
                other_deductions: otherDeductions,
                deductions: generalDeductions,
                net_salary: Number(payslip.net_salary) || 0
            };
        });

        res.json({
            success: true,
            data: formattedPayslips,
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

// GET /api/payslips/download/:payslipId
// Example endpoint for handling download action
exports.downloadPayslip = async (req, res, next) => {
    try {
        const id = Number(req.params.payslipId);
        
        const payslip = await prisma.payslips.findUnique({
            where: { payslip_id: id }
        });

        if (!payslip || !payslip.pdf_download_url) {
            const error = new Error("Payslip document not found");
            error.statusCode = 404;
            throw error;
        }

        // Ideally you would stream the file or return a signed URL.
        // For simplicity, we just return the URL
        res.json({
            success: true,
            data: {
                download_url: payslip.pdf_download_url
            }
        });
    } catch (error) {
        next(error);
    }
};
