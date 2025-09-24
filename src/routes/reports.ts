import { Router } from "express";
// import { prisma } from "../prisma";
import { Prisma, PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

import { getOverdueStudents, getStudentFeesWhere } from "../services/feeStatus";

const r = Router();

/** Helpers */
const num = (v?: string) => (v ? Number(v) : undefined);
const bool = (v?: string) =>
  v === "true" ? true : v === "false" ? false : undefined;

/**
 * GET /reports/students
 * Filters:
 *  - classId
 *  - bus=with|without (presence of Bus)
 *  - discounted=true
 *  - dropped=true   (status not ACTIVE or transfer=true or isdeleted=true)
 *  - all=true
 */
r.get("/students", async (req, res) => {
  const classId = num(req.query.classId as string);
  const bus = req.query.bus as "with" | "without" | undefined;
  const discounted = bool(req.query.discounted as string);
  const dropped = bool(req.query.dropped as string);
  const all = bool(req.query.all as string);

  const where: any = {};
  if (classId) where.classId = classId;
  if (bus === "with") where.bus = { not: null };
  if (bus === "without") where.bus = null;

  if (discounted) {
    where.StudentFee = {
      some: {
        student_fee: { not: null }, // discounted implies DiscountLog exists or fee < default
        // If you maintain DiscountLog table, you can rewrite:
        // student: { DiscountLog: { some: {} } }
      },
    };
  }

  if (dropped) {
    where.OR = [
      { status: { not: "ACTIVE" } },
      { transfer: true },
      { isdeleted: true },
    ];
  }

  if (!all && !classId && !bus && !discounted && !dropped) {
    return res.status(400).json({
      error:
        "No filter provided. Use ?all=true to fetch every student intentionally.",
    });
  }

  const students = await prisma.student.findMany({
    where,
    select: {
      id: true,
      fullname: true,
      phone: true,
      classId: true,
      bus: true,
      status: true,
      transfer: true,
      isdeleted: true,
    },
    orderBy: [{ classId: "asc" }, { fullname: "asc" }],
  });
  res.json({ count: students.length, rows: students });
});

/**
 * GET /reports/fees/status
 * status=paid|unpaid|partial
 * month, year, classId, bus=with|without
 */
r.get("/fees/status", async (req, res) => {
  const status = ((req.query.status as string) || "").toUpperCase();
  const month = num(req.query.month as string);
  const year = num(req.query.year as string);
  const classId = num(req.query.classId as string);
  const bus = req.query.bus as "with" | "without" | undefined;

  if (!month || !year) {
    return res.status(400).json({ error: "month and year are required" });
  }

  const where: any = { month, year };
  if (classId) where.student = { classId };
  if (bus === "with")
    where.student = { ...(where.student || {}), bus: { not: null } };
  if (bus === "without")
    where.student = { ...(where.student || {}), bus: null };

  const rows = await getStudentFeesWhere(where);
  const filtered = rows.filter(
    (r) =>
      (status === "PAID" && r.status === "PAID") ||
      (status === "UNPAID" && r.status === "UNPAID") ||
      (status === "PARTIAL" && r.status === "PARTIAL")
  );
  res.json({ month, year, count: filtered.length, rows: filtered });
});

/**
 * GET /reports/fees/overdue
 * monthsBack=2       (default 2)
 * from=YYYY-MM-01    (optional)
 * to=YYYY-MM-01      (optional)
 * classId, bus=with|without
 */
r.get("/fees/overdue", async (req, res) => {
  const monthsBack = num(req.query.monthsBack as string) ?? 2;
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const classId = num(req.query.classId as string);
  const bus = req.query.bus as "with" | "without" | undefined;

  const data = await getOverdueStudents({ monthsBack, from, to, classId, bus });
  res.json({ monthsBack, from, to, count: data.length, rows: data });
});

/** Convenience: students without bus / with bus */
r.get("/students/no-bus", async (_req, res) => {
  const rows = await prisma.student.findMany({
    where: { bus: null, isdeleted: false },
    select: { id: true, fullname: true, phone: true, classId: true },
    orderBy: [{ classId: "asc" }, { fullname: "asc" }],
  });
  res.json({ count: rows.length, rows });
});

r.get("/students/with-bus", async (_req, res) => {
  const rows = await prisma.student.findMany({
    where: { bus: { not: null }, isdeleted: false },
    select: { id: true, fullname: true, phone: true, classId: true, bus: true },
    orderBy: [{ classId: "asc" }, { fullname: "asc" }],
  });
  res.json({ count: rows.length, rows });
});

export default r;
