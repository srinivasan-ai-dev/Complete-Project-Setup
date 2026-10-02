// utils/db.js should be responsible for creating the Prisma connection.

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = prisma;
