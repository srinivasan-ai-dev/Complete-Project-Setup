const prisma = require("../utils/db");

class AuthService {
    async loginUser(username, password, branchName) {
        if (!username || !password) {
            const error = new Error("Username and password are required");
            error.statusCode = 400;
            throw error;
        }

        const employee = await prisma.employees.findFirst({
            where: {
                OR: [
                    { employee_code: username },
                    { email: username }
                ]
            },
            include: {
                offices: true
            }
        });

        if (!employee) {
            const error = new Error("Invalid credentials");
            error.statusCode = 401;
            throw error;
        }

        const bcrypt = require("bcrypt");
        
        // If the user doesn't have a password yet (due to just adding the column),
        // we can either reject or bypass. I will enforce bcrypt now.
        if (!employee.password_hash) {
            const error = new Error("Invalid credentials");
            error.statusCode = 401;
            throw error;
        }

        const isPasswordValid = await bcrypt.compare(password, employee.password_hash);
        if (!isPasswordValid) {
            const error = new Error("Invalid credentials");
            error.statusCode = 401;
            throw error;
        }

        if (branchName && employee.offices && employee.offices.office_name !== branchName) {
            const error = new Error("User does not belong to the selected branch");
            error.statusCode = 403;
            throw error;
        }

        const { generateToken } = require("../utils/jwtHelper");
        
        // Mock role logic based on designation or department
        let role = "Employee";
        if (employee.designations && employee.designations.designation_name.includes("Manager")) {
            role = "Manager";
        } else if (employee.departments && employee.departments.department_name === "HR") {
            role = "HR";
        }

        const token = generateToken({
            employee_id: employee.employee_id,
            email: employee.email,
            role: role
        });

        return {
            employee_id: employee.employee_id,
            name: `${employee.first_name} ${employee.last_name}`,
            email: employee.email,
            role: role,
            token: token
        };
    }
}

module.exports = new AuthService();
