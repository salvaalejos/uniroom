import { PrismaClient } from "@prisma/client";

// Ensure global type definition allows prisma so it doesn't get re-instantiated in dev
declare global {
  var prisma: PrismaClient | undefined;
}

export const db = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalThis.prisma = db;
