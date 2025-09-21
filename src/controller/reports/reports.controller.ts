import { Request, Response } from "express";
import {
  getAllStudents,
  getStudentsWithBalance,
  getUnpaidFamily,
  getUnpaidFamilySummary,
  getFreeStudents,
  getLastPaymentVoucher,
  getStudentBusses,
  getStudentsWithSameBus,
} from "./reports.service";
import { streamTablePdf } from "./pdf";

export const allStudents = async (req: Request, res: Response) => {
  const { class: className } = req.query as any;
  const rows = await getAllStudents(className);
  res.json({ rows });
};

export const studentsWithBalance = async (req: Request, res: Response) => {
  const { month, year, class: className } = req.query as any;
  const m = Number(month),
    y = Number(year);
  const rows = await getStudentsWithBalance(m, y, className);
  res.json({ rows, month: m, year: y });
};

export const unpaidFamily = async (req: Request, res: Response) => {
  const { month, year } = req.query as any;
  const rows = await getUnpaidFamily(Number(month), Number(year));
  res.json({ rows });
};

export const unpaidFamilySummary = async (req: Request, res: Response) => {
  const { month, year } = req.query as any;
  const data = await getUnpaidFamilySummary(Number(month), Number(year));
  res.json(data);
};

export const freeStudents = async (req: Request, res: Response) => {
  const { class: className } = req.query as any;
  const rows = await getFreeStudents(className);
  res.json({ rows });
};

export const lastPaymentVoucher = async (req: Request, res: Response) => {
  const { q } = req.query as any; // student query
  const row = await getLastPaymentVoucher(q);
  res.json({ row });
};

export const studentBusses = async (req: Request, res: Response) => {
  const { bus, class: className } = req.query as any;
  const rows = await getStudentBusses(bus, className);
  res.json({ rows });
};

export const studentsWithSameBus = async (req: Request, res: Response) => {
  const { bus } = req.query as any;
  const rows = await getStudentsWithSameBus(bus);
  res.json({ rows });
};

/** -------- PDF controller -------- */
export const pdfForReport = async (req: Request, res: Response) => {
  const { report } = req.query as any;

  if (report === "students") {
    const { class: className } = req.query as any;
    const rows = await getAllStudents(className);
    return streamTablePdf(
      res,
      "All Students",
      ["fullname", "class", "phone", "bus"],
      rows.map((r) => ({
        fullname: r.fullname,
        class: r.classes?.name || "",
        phone: r.phone || "",
        bus: r.bus || "",
      }))
    );
  }

  if (report === "with-balance") {
    const { month, year, class: className } = req.query as any;
    const rows = await getStudentsWithBalance(
      Number(month),
      Number(year),
      className
    );
    return streamTablePdf(
      res,
      `Students With Balance (${month}/${year})`,
      ["fullname", "class", "monthlyFee", "paid", "balance"],
      rows.map((r) => ({
        fullname: r.fullname,
        class: r.className || "",
        monthlyFee: r.monthlyFee,
        paid: r.paid,
        balance: r.balance,
      }))
    );
  }

  if (report === "unpaid-family") {
    const { month, year } = req.query as any;
    const rows = await getUnpaidFamily(Number(month), Number(year));
    return streamTablePdf(
      res,
      `Unpaid Family (${month}/${year})`,
      ["familyName", "totalFee", "totalPaid", "balance"],
      rows.map((r) => ({
        familyName: r.familyName,
        totalFee: r.totalFee,
        totalPaid: r.totalPaid,
        balance: r.balance,
      }))
    );
  }

  if (report === "free-students") {
    const { class: className } = req.query as any;
    const rows = await getFreeStudents(className);
    return streamTablePdf(
      res,
      "Free Students",
      ["fullname", "class", "fee", "reason"],
      rows.map((r) => ({
        fullname: r.fullname,
        class: r.classes?.name || "",
        fee: r.fee,
        reason: r.FreeReason || "",
      }))
    );
  }

  if (report === "student-bus") {
    const { bus, class: className } = req.query as any;
    const rows = await getStudentBusses(bus, className);
    return streamTablePdf(
      res,
      "Student Busses",
      ["fullname", "class", "bus"],
      rows.map((r) => ({
        fullname: r.fullname,
        class: r.classes?.name || "",
        bus: r.bus || "",
      }))
    );
  }

  if (report === "same-bus") {
    const { bus } = req.query as any;
    const rows = await getStudentsWithSameBus(bus);
    return streamTablePdf(
      res,
      `Students – Bus ${bus}`,
      ["fullname", "class", "bus"],
      rows.map((r) => ({
        fullname: r.fullname,
        class: r.classes?.name || "",
        bus: r.bus || "",
      }))
    );
  }

  res.status(400).json({ message: "Unknown report key" });
};
