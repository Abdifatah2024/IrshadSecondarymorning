import { Router } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import { getOverdueStudents, getStudentFeesWhere } from "../services/feeStatus";

const prisma = new PrismaClient();
const r = Router();

type Dataset = {
  meta: {
    title: string;
    periodLabel?: string;
    generatedAt: string;
    total?: number;
    totalLabel?: string;
  };
  columns: string[];
  // Row values are addressed by column label
  rows: Array<Record<string, any>>;
};

/** helpers */
const money = (n: number) =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const monthName = (m: number) =>
  new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "long" });

/**
 * GET /reports/run?id=<reportId>&...filters
 *
 * Supported ids (sample set; extend easily):
 * - all-students?classId=#
 * - student-with-balance?month=&year=&classId=&bus=
 * - unpaid-family-summary?from=YYYY-MM-DD&to=YYYY-MM-DD&classId=
 */
r.get("/run", async (req, res) => {
  const id = String(req.query.id || "");
  try {
    if (!id) return res.status(400).json({ error: "Missing ?id" });

    /* ---------------- ALL STUDENTS ---------------- */
    if (id === "all-students") {
      const classId = req.query.classId ? Number(req.query.classId) : undefined;

      const students = await prisma.student.findMany({
        where: {
          ...(classId ? { classId } : {}),
          isdeleted: false,
        },
        select: {
          id: true,
          fullname: true,
          phone: true,
          classId: true,
          bus: true,
        },
        orderBy: [{ classId: "asc" }, { fullname: "asc" }],
      });

      const rows = students.map((s, i) => ({
        NO: i + 1,
        Name: s.fullname,
        Phone: s.phone ?? "",
        Class: s.classId,
        Bus: s.bus ?? "",
      }));

      const ds: Dataset = {
        meta: {
          title: "All Students",
          periodLabel: classId ? `Class: ${classId}` : undefined,
          generatedAt: new Date().toISOString(),
        },
        columns: ["NO", "Name", "Phone", "Class", "Bus"],
        rows,
      };
      return res.json(ds);
    }

    /* ------------- STUDENTS WITH BALANCE (PER MONTH) ------------- */
    if (id === "student-with-balance") {
      const month = Number(req.query.month);
      const year = Number(req.query.year);
      if (!month || !year) {
        return res.status(400).json({ error: "month and year are required" });
      }
      const classId = req.query.classId ? Number(req.query.classId) : undefined;
      const bus =
        (req.query.bus as "with" | "without" | undefined) || undefined;

      const where: Prisma.StudentFeeWhereInput = { month, year };
      if (classId || bus) {
        where.student = {
          ...(classId ? { classId } : {}),
          ...(bus === "with" ? { bus: { not: null } } : {}),
          ...(bus === "without" ? { bus: null } : {}),
        };
      }

      const fees = await getStudentFeesWhere(where);
      const dueRows = fees.filter((f) => f.status !== "PAID");

      const rows = dueRows.map((r, i) => ({
        NO: i + 1,
        Mobileno: r.phone ?? "",
        Name: r.fullname,
        Amount: Number(r.due.toFixed(2)),
        Description: `Sec. Bus - ${monthName(month)} ${year}`,
      }));

      const total = rows.reduce((s, r) => s + (r["Amount"] as number), 0);

      const ds: Dataset = {
        meta: {
          title: "Buss Fare Remainder With Division",
          periodLabel: `${monthName(month)} ${year}`,
          generatedAt: new Date().toISOString(),
          total,
          totalLabel: "TOTAL",
        },
        columns: ["NO", "Mobileno", "Name", "Amount", "Description"],
        rows,
      };
      return res.json(ds);
    }

    /* ------------- OVERDUE FAMILY SUMMARY (by student) ----------- */
    if (id === "unpaid-family-summary") {
      const from = req.query.from
        ? new Date(String(req.query.from))
        : undefined;
      const to = req.query.to ? new Date(String(req.query.to)) : undefined;
      const classId = req.query.classId ? Number(req.query.classId) : undefined;

      const data = await getOverdueStudents({
        monthsBack: 2,
        from,
        to,
        classId,
      });

      const rows = data.map((r, i) => ({
        NO: i + 1,
        Name: r.fullname,
        Phone: r.phone ?? "",
        Months: r.months.length,
        Due: Number(r.due.toFixed(2)),
      }));
      const total = rows.reduce((s, r) => s + (r["Due"] as number), 0);

      const label = `${from ? from.toLocaleDateString() : "…"} – ${
        to ? to.toLocaleDateString() : "…"
      }`;

      const ds: Dataset = {
        meta: {
          title: "Family Overdue Summary",
          periodLabel: label,
          generatedAt: new Date().toISOString(),
          total,
          totalLabel: "TOTAL DUE",
        },
        columns: ["NO", "Name", "Phone", "Months", "Due"],
        rows,
      };
      return res.json(ds);
    }

    return res.status(400).json({ error: `Unknown report id: ${id}` });
  } catch (e: any) {
    console.error("[/reports/run] error", e);
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

export default r;
