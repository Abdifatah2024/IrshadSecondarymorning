import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
const prisma = new PrismaClient();

// export const assignStudentToBus = async (req: Request, res: Response) => {
//   const { studentId, busId } = req.body;

//   if (!studentId || !busId) {
//     return res.status(400).json({
//       message: "studentId and busId are required",
//     });
//   }

//   try {
//     const student = await prisma.student.findUnique({
//       where: { id: +studentId },
//     });
//     const bus = await prisma.bus.findUnique({ where: { id: +busId } });

//     if (!student || !bus) {
//       return res.status(404).json({
//         message: "Student or Bus not found",
//       });
//     }

//     const updatedStudent = await prisma.student.update({
//       where: { id: +studentId },
//       data: { busId: +busId },
//       include: {
//         Bus: {
//           include: {
//             driver: {
//               select: { fullName: true },
//             },
//           },
//         },
//       },
//     });

//     res.status(200).json({
//       message: "Bus assigned successfully",
//       student: updatedStudent,
//     });
//   } catch (error) {
//     console.error("Error assigning student to bus:", error);
//     res.status(500).json({
//       message: "Internal server error",
//     });
//   }
// };

// ✅ CREATE
export const assignStudentToBus = async (req: Request, res: Response) => {
  const studentId = Number(req.body?.studentId);
  const busId = Number(req.body?.busId);

  if (!Number.isFinite(studentId) || !Number.isFinite(busId)) {
    return res
      .status(400)
      .json({ message: "studentId and busId are required (numbers)." });
  }

  try {
    // Fetch both records up-front
    const [student, bus] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, fullname: true, busId: true },
      }),
      prisma.bus.findUnique({
        where: { id: busId },
        select: {
          id: true,
          name: true,
          route: true,
          plate: true,
          driver: { select: { fullName: true } },
        },
      }),
    ]);

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }
    if (!bus) {
      return res.status(404).json({ message: "Bus not found." });
    }

    // If already assigned to this bus, do nothing (idempotent)
    if (student.busId === bus.id) {
      return res.status(200).json({
        message: "Student is already assigned to this bus.",
        previousBusId: student.busId,
        assignedBusId: bus.id,
      });
    }

    const previousBusId = student.busId ?? null;

    // Single update is enough to "remove previous" and assign new,
    // because the model uses a single `busId` foreign key.
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: { busId: bus.id },
      include: {
        Bus: {
          include: {
            driver: { select: { fullName: true } },
          },
        },
      },
    });

    return res.status(200).json({
      message: previousBusId
        ? "Student moved to a new bus successfully."
        : "Bus assigned successfully.",
      previousBusId,
      assignedBusId: bus.id,
      student: {
        id: updatedStudent.id,
        name: updatedStudent.fullname,
        bus: updatedStudent.Bus
          ? {
              id: updatedStudent.Bus.id,
              name: updatedStudent.Bus.name,
              route: updatedStudent.Bus.route,
              plate: updatedStudent.Bus.plate,
              driver: updatedStudent.Bus.driver?.fullName ?? null,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error assigning student to bus:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createBus = async (req: Request, res: Response) => {
  const { name, route, plate, type, color, seats, capacity, driverId } =
    req.body;

  try {
    const newBus = await prisma.bus.create({
      data: {
        name,
        route,
        plate,
        type,
        color,
        seats,
        capacity,
        driverId,
      },
    });

    res.status(201).json({ success: true, bus: newBus });
  } catch (error) {
    console.error("Error creating bus:", error);
    res.status(500).json({ success: false, message: "Failed to create bus" });
  }
};

// ✅ READ ALL
export const getAllBuses = async (_: Request, res: Response) => {
  try {
    const buses = await prisma.bus.findMany({
      include: {
        driver: {
          select: { fullName: true },
        },
        students: {
          select: { id: true, fullname: true, classId: true },
        },
      },
    });

    res.status(200).json({ success: true, buses });
  } catch (error) {
    console.error("Error fetching buses:", error);
    res.status(500).json({ success: false, message: "Failed to fetch buses" });
  }
};

// ✅ READ ONE
export const getBusById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  try {
    const bus = await prisma.bus.findUnique({
      where: { id },
      include: {
        driver: {
          select: { fullName: true },
        },
        students: {
          select: { id: true, fullname: true },
        },
      },
    });

    if (!bus) return res.status(404).json({ message: "Bus not found" });

    res.status(200).json({ success: true, bus });
  } catch (error) {
    console.error("Error fetching bus:", error);
    res.status(500).json({ success: false, message: "Failed to fetch bus" });
  }
};

// ✅ UPDATE
export const updateBus = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name, route, plate, type, color, seats, capacity, driverId } =
    req.body;

  try {
    const updatedBus = await prisma.bus.update({
      where: { id },
      data: {
        name,
        route,
        plate,
        type,
        color,
        seats,
        capacity,
        driverId,
      },
    });

    res.status(200).json({ success: true, bus: updatedBus });
  } catch (error) {
    console.error("Error updating bus:", error);
    res.status(500).json({ success: false, message: "Failed to update bus" });
  }
};

// ✅ DELETE
export const deleteBus = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  try {
    await prisma.bus.delete({ where: { id } });
    res
      .status(200)
      .json({ success: true, message: "Bus deleted successfully" });
  } catch (error) {
    console.error("Error deleting bus:", error);
    res.status(500).json({ success: false, message: "Failed to delete bus" });
  }
};

// export const getBusSalaryAndFeeSummaryDetailed = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const standardSchoolFee = 28;
//     const month = parseInt(req.query.month as string);
//     const year = parseInt(req.query.year as string);

//     if (isNaN(month) || isNaN(year)) {
//       return res.status(400).json({
//         success: false,
//         message: "Month and year must be provided as query parameters.",
//       });
//     }

//     const buses = await prisma.bus.findMany({
//       include: {
//         driver: {
//           select: {
//             id: true,
//             fullName: true,
//             salary: true,
//             jobTitle: true,
//           },
//         },
//         students: {
//           where: {
//             isdeleted: false,
//           },
//           select: {
//             id: true,
//             fullname: true,
//             district: true,
//             fee: true,
//             StudentFee: {
//               where: { month, year },
//               select: {
//                 id: true,
//                 student_fee: true,
//                 month: true,
//                 year: true,
//                 PaymentAllocation: {
//                   select: {
//                     amount: true,
//                     paymentId: true,
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },
//     });

//     let totalCollected = 0;
//     let totalSalary = 0;
//     let totalExpectedBusIncome = 0;

//     const busSummaries = buses.map((bus) => {
//       let busFeeCollected = 0;
//       let expectedBusIncome = 0;

//       const enrichedStudents = bus.students.map((student) => {
//         const studentFeeRecord = student.StudentFee[0];
//         const totalFee = studentFeeRecord?.student_fee
//           ? Number(studentFeeRecord.student_fee)
//           : Number(student.fee || 0);

//         const schoolFee =
//           totalFee < standardSchoolFee ? totalFee : standardSchoolFee;
//         const expectedBusFee = totalFee - schoolFee;
//         expectedBusIncome += expectedBusFee;

//         // Sum of allocations for this exact studentFee record only
//         const actualCollected =
//           studentFeeRecord?.PaymentAllocation.reduce(
//             (sum, alloc) => sum + Number(alloc.amount || 0),
//             0
//           ) || 0;

//         let actualBusFeeCollected = 0;
//         if (actualCollected > schoolFee) {
//           actualBusFeeCollected = actualCollected - schoolFee;
//         } else {
//           actualBusFeeCollected = 0;
//         }

//         busFeeCollected += actualBusFeeCollected;

//         return {
//           id: student.id,
//           name: student.fullname,
//           district: student.district,
//           totalFee,
//           schoolFee,
//           expectedBusFee: +expectedBusFee.toFixed(2),
//           actualBusFeeCollected: +actualBusFeeCollected.toFixed(2),
//           unpaidBusFee: +(expectedBusFee - actualBusFeeCollected).toFixed(2),
//         };
//       });

//       const salary = bus.driver?.salary || 0;
//       totalCollected += busFeeCollected;
//       totalExpectedBusIncome += expectedBusIncome;
//       totalSalary += salary;

//       const profitOrLossAmount = +(busFeeCollected - salary).toFixed(2);
//       const collectionGap = +(expectedBusIncome - busFeeCollected).toFixed(2);
//       const status = profitOrLossAmount >= 0 ? "Profit" : "Shortage";

//       return {
//         busId: bus.id,
//         name: bus.name,
//         route: bus.route,
//         plate: bus.plate,
//         driver: bus.driver
//           ? {
//               id: bus.driver.id,
//               name: bus.driver.fullName,
//               salary,
//             }
//           : null,
//         studentCount: enrichedStudents.length,
//         totalBusFeeCollected: +busFeeCollected.toFixed(2),
//         expectedBusIncome: +expectedBusIncome.toFixed(2),
//         collectionGap,
//         status,
//         profitOrLossAmount,
//         students: enrichedStudents,
//       };
//     });

//     const totalBusFeeCollected = +totalCollected.toFixed(2);
//     const expectedBusIncome = +totalExpectedBusIncome.toFixed(2);
//     const busFeeCollectionGap = +(expectedBusIncome - totalCollected).toFixed(
//       2
//     );
//     const totalBusSalary = +totalSalary.toFixed(2);
//     const profitOrLoss = +(totalCollected - totalSalary).toFixed(2);

//     res.status(200).json({
//       success: true,
//       month,
//       year,
//       totalBuses: busSummaries.length,
//       totalStudentsWithBus: busSummaries.reduce(
//         (sum, b) => sum + b.studentCount,
//         0
//       ),
//       totalBusFeeCollected,
//       expectedBusIncome,
//       busFeeCollectionGap,
//       totalBusSalary,
//       profitOrLoss,
//       busSummaries,
//     });
//   } catch (error) {
//     console.error("Error in getBusSalaryAndFeeSummaryDetailed:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to load bus fee and salary summary.",
//     });
//   }
// };

// export const getAllBusEmployees = async (req: Request, res: Response) => {
//   try {
//     const busEmployees = await prisma.employee.findMany({
//       where: {
//         jobTitle: "Bus",
//       },
//       orderBy: {
//         fullName: "asc",
//       },
//     });

//     res.status(200).json({ success: true, employees: busEmployees });
//   } catch (error) {
//     console.error("Error fetching bus employees:", error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// };
// export const getBusSalaryAndFeeSummaryDetailed = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     // ✅ New rule: School fee = totalFee - 10, Expected bus fee = remainder (max 10)
//     const BUS_PORTION = 10;

//     const month = parseInt(req.query.month as string);
//     const year = parseInt(req.query.year as string);

//     if (isNaN(month) || isNaN(year)) {
//       return res.status(400).json({
//         success: false,
//         message: "Month and year must be provided as query parameters.",
//       });
//     }

//     const buses = await prisma.bus.findMany({
//       include: {
//         driver: {
//           select: { id: true, fullName: true, salary: true, jobTitle: true },
//         },
//         students: {
//           where: { isdeleted: false },
//           select: {
//             id: true,
//             fullname: true,
//             district: true,
//             fee: true,
//             StudentFee: {
//               where: { month, year },
//               select: {
//                 id: true,
//                 student_fee: true,
//                 month: true,
//                 year: true,
//                 PaymentAllocation: {
//                   select: { amount: true, paymentId: true },
//                 },
//               },
//             },
//           },
//         },
//       },
//     });

//     let totalCollected = 0;
//     let totalSalary = 0;
//     let totalExpectedBusIncome = 0;

//     const busSummaries = buses.map((bus) => {
//       let busFeeCollected = 0;
//       let expectedBusIncome = 0;

//       const enrichedStudents = bus.students.map((student) => {
//         const studentFeeRecord = student.StudentFee[0];

//         // Source of truth for the student's total fee for the month
//         const totalFee = studentFeeRecord?.student_fee
//           ? Number(studentFeeRecord.student_fee)
//           : Number(student.fee || 0);

//         // ✅ Apply your new rule:
//         const schoolFee = Math.max(totalFee - BUS_PORTION, 0);
//         const expectedBusFee = totalFee - schoolFee; // ≤ 10

//         expectedBusIncome += expectedBusFee;

//         // Sum of allocations linked to this specific StudentFee row
//         const actualCollected =
//           studentFeeRecord?.PaymentAllocation.reduce(
//             (sum, alloc) => sum + Number(alloc.amount || 0),
//             0
//           ) || 0;

//         // Amount that can be attributed to the bus after the schoolFee is covered.
//         // Clamp so it never exceeds expectedBusFee and never drops below 0.
//         const rawBusCollected = actualCollected - schoolFee;
//         const actualBusFeeCollected = Math.min(
//           Math.max(rawBusCollected, 0),
//           expectedBusFee
//         );

//         busFeeCollected += actualBusFeeCollected;

//         return {
//           id: student.id,
//           name: student.fullname,
//           district: student.district ?? "Unknown",
//           totalFee: +totalFee.toFixed(2),
//           schoolFee: +schoolFee.toFixed(2),
//           expectedBusFee: +expectedBusFee.toFixed(2),
//           actualBusFeeCollected: +actualBusFeeCollected.toFixed(2),
//           unpaidBusFee: +(expectedBusFee - actualBusFeeCollected).toFixed(2),
//         };
//       });

//       const salary = Number(bus.driver?.salary || 0);
//       totalCollected += busFeeCollected;
//       totalExpectedBusIncome += expectedBusIncome;
//       totalSalary += salary;

//       const profitOrLossAmount = +(busFeeCollected - salary).toFixed(2);
//       const collectionGap = +(expectedBusIncome - busFeeCollected).toFixed(2);
//       const status = profitOrLossAmount >= 0 ? "Profit" : "Shortage";

//       return {
//         busId: bus.id,
//         name: bus.name,
//         route: bus.route,
//         plate: bus.plate,
//         driver: bus.driver
//           ? { id: bus.driver.id, name: bus.driver.fullName, salary }
//           : null,
//         studentCount: enrichedStudents.length,
//         totalBusFeeCollected: +busFeeCollected.toFixed(2),
//         expectedBusIncome: +expectedBusIncome.toFixed(2),
//         collectionGap,
//         status,
//         profitOrLossAmount,
//         students: enrichedStudents,
//       };
//     });

//     const totalBusFeeCollected = +totalCollected.toFixed(2);
//     const expectedBusIncome = +totalExpectedBusIncome.toFixed(2);
//     const busFeeCollectionGap = +(expectedBusIncome - totalCollected).toFixed(
//       2
//     );
//     const totalBusSalary = +totalSalary.toFixed(2);
//     const profitOrLoss = +(totalCollected - totalSalary).toFixed(2);

//     res.status(200).json({
//       success: true,
//       month,
//       year,
//       totalBuses: busSummaries.length,
//       totalStudentsWithBus: busSummaries.reduce(
//         (sum, b) => sum + b.studentCount,
//         0
//       ),
//       totalBusFeeCollected,
//       expectedBusIncome,
//       busFeeCollectionGap,
//       totalBusSalary,
//       profitOrLoss,
//       busSummaries,
//     });
//   } catch (error) {
//     console.error("Error in getBusSalaryAndFeeSummaryDetailed:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to load bus fee and salary summary.",
//     });
//   }
// };

// =====================
// V2 Bus finance summary (school first = 17; bus capped at 10)
// =====================
const SCHOOL_FIRST = 17;
const BUS_CAP = 10;
const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

function splitSchoolThenBus(totalFee: number, actualCollected: number) {
  // School takes up to 17 first
  const schoolFee = Math.min(totalFee, SCHOOL_FIRST);

  // Remainder becomes expected bus, capped at 10
  const expectedBusFee = Math.min(Math.max(totalFee - SCHOOL_FIRST, 0), BUS_CAP);

  // Collected covers school first, then bus (but not beyond expectedBusFee)
  const remainder = Math.max(actualCollected - schoolFee, 0);
  const actualBusFeeCollected = Math.min(remainder, expectedBusFee);

  return {
    schoolFee: r2(schoolFee),
    expectedBusFee: r2(expectedBusFee),
    actualBusFeeCollected: r2(actualBusFeeCollected),
    unpaidBusFee: r2(expectedBusFee - actualBusFeeCollected),
  };
}

/**
 * Versioned handler so you can wire router explicitly to V2.
 * GET /api/bus/finance/detailed-v2?month=9&year=2025[&debug=1]
 */
export const getBusSalaryAndFeeSummaryDetailedV2 = async (req: Request, res: Response) => {
  try {
    const month = parseInt(String(req.query.month), 10);
    const year  = parseInt(String(req.query.year), 10);
    const debug = String(req.query.debug || "") === "1";

    if (Number.isNaN(month) || Number.isNaN(year)) {
      return res.status(400).json({
        success: false,
        message: "Month and year must be provided as query parameters.",
      });
    }

    // Stamp a clear version header so you can verify in the network tab
    res.setHeader("x-calc-version", "schoolFirst_v2");

    const buses = await prisma.bus.findMany({
      
      include: {
        driver: { select: { id: true, fullName: true, salary: true, jobTitle: true } },
        students: {
          where: { isdeleted: false },
          select: {
            id: true,
            fullname: true,
            district: true,
            fee: true, // fallback if no monthly fee row
            StudentFee: {
              where: { month, year },
              select: {
                id: true,
                student_fee: true,
                month: true,
                year: true,
                PaymentAllocation: { select: { amount: true, paymentId: true } },
              },
              orderBy: { id: "desc" }, // deterministic if multiple rows
            },
          },
        },
      },
    });

    let totalCollected = 0;
    let totalSalary = 0;
    let totalExpectedBusIncome = 0;

    const busSummaries = buses.map((bus) => {
      let busFeeCollected = 0;
      let expectedBusIncome = 0;

      const students = bus.students.map((s) => {
        // Total fee source: prefer StudentFee.student_fee for the month; else fallback to profile fee
        const monthlyFeeFromRows = s.StudentFee.find(r => r.student_fee != null)?.student_fee;
        const totalFee = r2(Number(monthlyFeeFromRows != null ? monthlyFeeFromRows : (s.fee || 0)));

        // Total actually collected for this month/year (sum of allocations on all StudentFee rows for that month)
        const actualCollected = r2(
          (s.StudentFee || []).reduce((sum, row) => {
            const rowSum = (row.PaymentAllocation || []).reduce(
              (acc, a) => acc + Number(a.amount || 0), 0
            );
            return sum + rowSum;
          }, 0)
        );

        // Apply school-first policy
        const { schoolFee, expectedBusFee, actualBusFeeCollected, unpaidBusFee } =
          splitSchoolThenBus(totalFee, actualCollected);

        busFeeCollected += actualBusFeeCollected;
        expectedBusIncome += expectedBusFee;

        return {
          id: s.id,
          name: s.fullname,
          district: s.district ?? "Unknown",
          totalFee: totalFee,
          schoolFee,
          expectedBusFee,
          actualBusFeeCollected,
          unpaidBusFee,
          ...(debug ? {
            __debug: {
              calcVersion: "schoolFirst_v2",
              actualCollected,
              SCHOOL_FIRST,
              BUS_CAP,
              note: "If you don't see this block with ?debug=1, the route isn't calling V2."
            }
          } : {})
        };
      });

      const salary = r2(Number(bus.driver?.salary || 0));
      totalCollected += busFeeCollected;
      totalExpectedBusIncome += expectedBusIncome;
      totalSalary += salary;

      const profitOrLossAmount = r2(busFeeCollected - salary);
      const collectionGap = r2(expectedBusIncome - busFeeCollected);
      const status = profitOrLossAmount >= 0 ? "Profit" : "Shortage";

      return {
        busId: bus.id,
        name: bus.name,
        route: bus.route,
        plate: bus.plate,
        driver: bus.driver ? { id: bus.driver.id, name: bus.driver.fullName, salary } : null,
        studentCount: students.length,
        totalBusFeeCollected: r2(busFeeCollected),
        expectedBusIncome: r2(expectedBusIncome),
        collectionGap,
        status,
        profitOrLossAmount,
        students,
      };
    });

    const totalBusFeeCollected = r2(totalCollected);
    const expectedBusIncome = r2(totalExpectedBusIncome);
    const busFeeCollectionGap = r2(expectedBusIncome - totalCollected);
    const totalBusSalary = r2(totalSalary);
    const profitOrLoss = r2(totalCollected - totalSalary);

    res.status(200).json({
      success: true,
      policy: {
        calcVersion: "schoolFirst_v2",
        description: "School fee first up to 17, bus remainder capped at 10. Payments cover school first.",
        SCHOOL_FIRST,
        BUS_CAP,
      },
      month,
      year,
      totalBuses: busSummaries.length,
      totalStudentsWithBus: busSummaries.reduce((sum, b) => sum + b.studentCount, 0),
      totalBusFeeCollected,
      expectedBusIncome,
      busFeeCollectionGap,
      totalBusSalary,
      profitOrLoss,
      busSummaries,
    });
  } catch (error) {
    console.error("Error in getBusSalaryAndFeeSummaryDetailedV2:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load bus fee and salary summary.",
    });
  }
};




export const getAllBusEmployees = async (req: Request, res: Response) => {
  try {
    const busEmployees = await prisma.employee.findMany({
      where: {
        jobTitle: "Bus",
        Bus: {
          none: {}, // Only include employees who are not related to any Bus
        },
      },
      orderBy: {
        fullName: "asc",
      },
    });

    res.status(200).json({ success: true, employees: busEmployees });
  } catch (error) {
    console.error("Error fetching unused bus employees:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
