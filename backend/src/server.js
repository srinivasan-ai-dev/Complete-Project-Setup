const express = require( "express" );
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const errorHandler = require("./middleware/errorHandler");
const app = express();

// Middleware
app.use(express.json());

//DB connection
const prisma = require("./utils/db");


// Routes
const leaveRoutes = require("./routes/leaveRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const wfhRoutes = require("./routes/wfhRoutes");
const payslipRoutes = require("./routes/payslipRoutes");
const taxRoutes = require("./routes/taxRoutes");
const claimRoutes = require("./routes/claimRoutes");
const hrRequestRoutes = require("./routes/hrRequestRoutes");
const policyRoutes = require("./routes/policyRoutes");
const trainingRoutes = require("./routes/trainingRoutes");
const certificationRoutes = require("./routes/certificationRoutes");
const competencyRoutes = require("./routes/competencyRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const authRoutes = require("./routes/authRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/leave-requests", leaveRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/wfh-requests", wfhRoutes);
app.use("/api/payslips", payslipRoutes);
app.use("/api/taxes", taxRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/hr-requests", hrRequestRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/trainings", trainingRoutes);
app.use("/api/certifications", certificationRoutes);
app.use("/api/competencies", competencyRoutes);
app.use("/api/dashboard", dashboardRoutes);




// Error handling middleware should be added after all routes
app.use(errorHandler);

// Server Running:
const PORT = 8000;
app.listen(PORT,()=>{
console.log(`🚀 Server is live at ${PORT}`) 
})

app.get("/", (req,res)=>{
    res.send("WELCOME")
})