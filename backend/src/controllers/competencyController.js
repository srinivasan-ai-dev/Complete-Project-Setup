const express = require("express");
const router = express.Router();
const prisma = require("../utils/db");

// GET /api/competencies
exports.getCompetencies = async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [total, data] = await Promise.all([
            prisma.competencies.count(),
            prisma.competencies.findMany({ skip, take })
        ]);

        res.json({
            success: true,
            data,
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

// POST /api/competencies
exports.createCompetency = async (req, res, next) => {
    try {
        const { skill, competency, category, proficiency_level, applicable_role, active_status } = req.body;

        const newCompetency = await prisma.competencies.create({
            data: {
                skill: skill || "New Skill",
                competency: competency || "New Competency",
                category: category || "General",
                proficiency_level: proficiency_level || "Beginner",
                applicable_role: applicable_role || "All",
                active_status: active_status || "Active"
            }
        });

        res.status(201).json({ 
            success: true, 
            message: "Competency created successfully", 
            data: newCompetency 
        });
    } catch (error) {
        next(error);
    }
};
