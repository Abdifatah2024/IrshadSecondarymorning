import { Router } from "express";
import {
  allStudents,
  studentsWithBalance,
  unpaidFamily,
  unpaidFamilySummary,
  freeStudents,
  lastPaymentVoucher,
  studentBusses,
  studentsWithSameBus,
  // (optional) attendance endpoints would go here
  pdfForReport,
} from "./reports.controller";

export const reportsRouter = Router();

/**
 * JSON endpoints
 */
reportsRouter.get("/students", allStudents);
reportsRouter.get("/students/with-balance", studentsWithBalance);
reportsRouter.get("/students/unpaid-family", unpaidFamily);
reportsRouter.get("/students/unpaid-family-summary", unpaidFamilySummary);
reportsRouter.get("/students/free", freeStudents);
reportsRouter.get("/students/last-payment", lastPaymentVoucher);
reportsRouter.get("/students/busses", studentBusses);
reportsRouter.get("/students/same-bus", studentsWithSameBus);

/**
 * PDF endpoint (returns application/pdf)
 * query: report=<key>&...same params as JSON endpoints
 */
reportsRouter.get("/pdf", pdfForReport);
