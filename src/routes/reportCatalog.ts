import { Router } from "express";
// import { prisma } from "../prisma";

import { Prisma, PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const r = Router();

/**
 * Returns a list of reports and the filter controls each requires.
 * You can add/remove items here without touching the frontend.
 */
r.get("/catalog", (_req, res) => {
  res.json([
    {
      id: "all-students",
      label: "All Students",
      path: "/dashboard/ListStd",
      controls: [
        {
          key: "classId",
          type: "select",
          label: "Select Class",
          source: "classes",
        },
      ],
    },
    {
      id: "student-with-balance",
      label: "Student With Balance (Per Month)",
      path: "/dashboard/BalancePerMonth",
      controls: [
        { key: "month", type: "month", label: "Select Month" },
        { key: "year", type: "year", label: "Select Year" },
        {
          key: "classId",
          type: "select",
          label: "Select Class",
          source: "classes",
        },
      ],
    },
    {
      id: "unpaid-family",
      label: "Unpaid Family Report",
      path: "/dashboard/UnpaidFamily",
      controls: [
        { key: "month", type: "month", label: "Select Month" },
        { key: "year", type: "year", label: "Select Year" },
      ],
    },
    {
      id: "unpaid-family-summary",
      label: "Unpaid Family Summary",
      path: "/dashboard/UnpaidFamilySummary",
      controls: [
        { key: "from", type: "date", label: "From" },
        { key: "to", type: "date", label: "To" },
      ],
    },
    {
      id: "free-students",
      label: "Free Students",
      path: "/dashboard/free",
      controls: [
        {
          key: "classId",
          type: "select",
          label: "Select Class",
          source: "classes",
        },
      ],
    },
    {
      id: "last-payment",
      label: "Last Payment Voucher",
      path: "/dashboard/LastPayment",
      controls: [
        {
          key: "q",
          type: "text",
          label: "Student",
          placeholder: "Name / ID / Phone",
        },
      ],
    },
    {
      id: "student-bus",
      label: "Student Bus List",
      path: "/dashboard/StudentBusses",
      controls: [
        {
          key: "bus",
          type: "text",
          label: "Bus",
          placeholder: "Bus name / number",
        },
        {
          key: "classId",
          type: "select",
          label: "Select Class",
          source: "classes",
        },
      ],
    },
    {
      id: "student-same-bus",
      label: "Students With Same Bus",
      path: "/dashboard/StudentWithSameBus",
      controls: [
        {
          key: "bus",
          type: "text",
          label: "Bus",
          placeholder: "Bus name / number",
        },
      ],
    },
    {
      id: "attendance-summary",
      label: "Attendance – Class Summary",
      path: "/dashboard/MonthAttendceReport",
      controls: [
        {
          key: "classId",
          type: "select",
          label: "Select Class",
          source: "classes",
        },
        { key: "month", type: "month", label: "Select Month" },
        { key: "year", type: "year", label: "Select Year" },
        {
          key: "shift",
          type: "select",
          label: "Select Shift",
          source: "shifts",
        },
      ],
    },
    {
      id: "today-absent",
      label: "Attendance – Today Absent",
      path: "/dashboard/TodayAbsent",
      controls: [
        {
          key: "classId",
          type: "select",
          label: "Select Class",
          source: "classes",
        },
        {
          key: "shift",
          type: "select",
          label: "Select Shift",
          source: "shifts",
        },
      ],
    },
    {
      id: "discipline-student",
      label: "Disciplinary – By Student",
      path: "/dashboard/GetOneStudentDecipline",
      controls: [
        {
          key: "q",
          type: "text",
          label: "Student",
          placeholder: "Name / ID / Phone",
        },
        { key: "from", type: "date", label: "From" },
        { key: "to", type: "date", label: "To" },
      ],
    },
  ]);
});

/** Simple options sources the UI can call */
r.get("/options/classes", async (_req, res) => {
  // your model name is `classes` in Student relation
  const cls = await prisma.classes.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  res.json(cls.map((c) => ({ value: String(c.id), label: c.name })));
});

r.get("/options/shifts", (_req, res) => {
  res.json([
    { value: "", label: "All Shifts" },
    { value: "morning", label: "Morning" },
    { value: "afternoon", label: "Afternoon" },
    { value: "evening", label: "Evening" },
  ]);
});

export default r;
