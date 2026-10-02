const express = require( "express" );
const errorHandler = require("./middleware/errorHandler");
const app = express();

//DB connection
const prisma = require("./utils/db");


// Routes


// Error handling middleware should be added after all routes
app.use(errorHandler);

// Server Running:
const PORT = 8000;
app.listen(PORT,()=>{
console.log(`🚀 Server is live at ${PORT}`) 
})

app.get("/", (req,res)=>{
    res.send("Vanakam")
})