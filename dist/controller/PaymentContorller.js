"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllDiscountLogs = exports.getStudentsWithUnpaidFeeMonthly = exports.getTodayIncome = exports.getCombinedPayments = exports.getAllStudentAccountSummaries = exports.getStudentDepositStatus = exports.getAllGeneratedMonths = exports.deleteStudentFeesByMonth = exports.getMonthlyIncomeOverview = exports.getStudentsWithUnpaidFeesOrBalance = exports.listDiscounts = exports.verifyDiscount = exports.getFeeInconsistencies = exports.updatePayment = exports.getAllPayments = exports.getAllocationsByPayment = exports.getStudentBalanceSummary = exports.getPaymentHistory = exports.getStudentFees = exports.generateMonthlyFees = exports.createMultiStudentPayment = exports.createStudentPayment = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// POST /api/payment
// export const createStudentPayment = async (req: Request, res: Response) => {
//   try {
//     const {
//       studentId,
//       amountPaid,
//       discount,
//       discountReason,
//       Description = "",
//     } = req.body;
//     if (!studentId || amountPaid === undefined) {
//       return res
//         .status(400)
//         .json({ message: "studentId and amountPaid are required" });
//     }
//     if (Number(discount) < 0) {
//       return res.status(400).json({ message: "Discount cannot be negative" });
//     }
//     // @ts-ignore
//     const user = req.user;
//     await prisma.$transaction(async (prisma) => {
//       const student = await prisma.student.findUnique({
//         where: { id: +studentId },
//       });
//       if (!student) throw new Error("Student not found");
//       const feeAmount = Number(student.fee);
//       const today = new Date();
//       const currentMonth = today.getMonth() + 1;
//       const currentYear = today.getFullYear();
//       const previousAccount = await prisma.studentAccount.findUnique({
//         where: { studentId: +studentId },
//       });
//       const previousCarryForward = Number(previousAccount?.carryForward || 0);
//       // Step 1: Get unpaid fees
//       let unpaidFees = await prisma.studentFee.findMany({
//         where: {
//           studentId: +studentId,
//           isPaid: false,
//         },
//         orderBy: [{ year: "asc" }, { month: "asc" }],
//       });
//       const existingKeys = new Set(
//         unpaidFees.map((f) => `${f.year}-${f.month}`)
//       );
//       let totalAvailable = Number(amountPaid) + previousCarryForward;
//       const estimatedMonths =
//         totalAvailable < feeAmount ? 1 : Math.ceil(totalAvailable / feeAmount);
//       let lastDate = new Date(currentYear, currentMonth - 1, 1);
//       // Step 2: Create missing months (via upsert)
//       for (let i = 0; i < estimatedMonths; i++) {
//         const month = lastDate.getMonth() + 1;
//         const year = lastDate.getFullYear();
//         const key = `${year}-${month}`;
//         if (!existingKeys.has(key)) {
//           const newOrExisting = await prisma.studentFee.upsert({
//             where: {
//               studentId_month_year: {
//                 studentId: +studentId,
//                 month,
//                 year,
//               },
//             },
//             update: {},
//             create: {
//               studentId: +studentId,
//               month,
//               year,
//               isPaid: false,
//             },
//           });
//           unpaidFees.push(newOrExisting);
//           existingKeys.add(key);
//         }
//         lastDate.setMonth(lastDate.getMonth() + 1);
//       }
//       unpaidFees.sort((a, b) =>
//         a.year === b.year ? a.month - b.month : a.year - b.year
//       );
//       // Step 3: Get current allocations
//       const allocationSums = await prisma.paymentAllocation.groupBy({
//         by: ["studentFeeId"],
//         where: {
//           studentFeeId: { in: unpaidFees.map((f) => f.id) },
//         },
//         _sum: { amount: true },
//       });
//       const paidMap = new Map(
//         allocationSums.map((a) => [a.studentFeeId, Number(a._sum.amount || 0)])
//       );
//       let availableAmount = Number(amountPaid) + previousCarryForward;
//       let remainingDiscount = Number(discount);
//       const allocations: {
//         studentFeeId: number;
//         amount: number;
//         studentId: number;
//       }[] = [];
//       const discountRecords: {
//         studentFeeId: number;
//         studentId: number;
//         amount: number;
//         reason: string;
//         month: number;
//         year: number;
//         approvedBy: number;
//       }[] = [];
//       const detailedAllocations: {
//         studentFeeId: number;
//         total: number;
//         paid: number;
//         discount: number;
//         month: number;
//         year: number;
//       }[] = [];
//       // Step 4: Allocate (even partial)
//       for (const feeRecord of unpaidFees) {
//         if (availableAmount <= 0 && remainingDiscount <= 0) break;
//         const paidSoFar = paidMap.get(feeRecord.id) || 0;
//         const due = feeAmount - paidSoFar;
//         const discountToApply = Math.min(remainingDiscount, due);
//         const paymentToApply = Math.min(due - discountToApply, availableAmount);
//         const totalPayment = discountToApply + paymentToApply;
//         // ✅ Fixed: allow even small allocations
//         if (paymentToApply > 0 || discountToApply > 0) {
//           allocations.push({
//             studentFeeId: feeRecord.id,
//             amount: totalPayment,
//             studentId: +studentId,
//           });
//           detailedAllocations.push({
//             studentFeeId: feeRecord.id,
//             total: totalPayment,
//             paid: paymentToApply,
//             discount: discountToApply,
//             month: feeRecord.month,
//             year: feeRecord.year,
//           });
//           if (discountToApply > 0) {
//             discountRecords.push({
//               studentFeeId: feeRecord.id,
//               studentId: +studentId,
//               amount: discountToApply,
//               reason: discountReason,
//               month: feeRecord.month,
//               year: feeRecord.year,
//               approvedBy: user.useId,
//             });
//             remainingDiscount -= discountToApply;
//           }
//           availableAmount -= paymentToApply;
//           if (paidSoFar + totalPayment >= feeAmount) {
//             await prisma.studentFee.update({
//               where: { id: feeRecord.id },
//               data: { isPaid: true },
//             });
//           }
//         }
//       }
//       // Step 5: Save payment
//       const newPayment = await prisma.payment.create({
//         data: {
//           studentId: +studentId,
//           userId: user.useId,
//           amountPaid: Number(amountPaid),
//           discount: Number(discount),
//           allocations: { create: allocations },
//         },
//       });
//       if (discountRecords.length > 0) {
//         await prisma.discountLog.createMany({ data: discountRecords });
//       }
//       // Step 6: Update carry forward
//       await prisma.studentAccount.upsert({
//         where: { studentId: +studentId },
//         update: { carryForward: availableAmount },
//         create: {
//           studentId: +studentId,
//           carryForward: availableAmount,
//         },
//       });
//       res.status(201).json({
//         message: "Payment processed successfully",
//         payment: newPayment,
//         StudentName: student.fullname,
//         carryForward: availableAmount,
//         allocations: detailedAllocations,
//         appliedDiscounts: discountRecords,
//       });
//     });
//   } catch (error) {
//     console.error("Error processing payment:", error);
//     res.status(500).json({
//       message: "Internal server error while processing payment",
//       error: error instanceof Error ? error.message : "Unknown error",
//     });
//   }
// };
const createStudentPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, amountPaid, discount, discountReason, Description = "", // ✅ use camelCase for consistency
         } = req.body;
        if (!studentId || amountPaid === undefined) {
            return res
                .status(400)
                .json({ message: "studentId and amountPaid are required" });
        }
        if (Number(discount) < 0) {
            return res.status(400).json({ message: "Discount cannot be negative" });
        }
        // @ts-ignore
        const user = req.user;
        yield prisma.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            const student = yield prisma.student.findUnique({
                where: { id: +studentId },
            });
            if (!student)
                throw new Error("Student not found");
            const feeAmount = Number(student.fee);
            const today = new Date();
            const currentMonth = today.getMonth() + 1;
            const currentYear = today.getFullYear();
            const previousAccount = yield prisma.studentAccount.findUnique({
                where: { studentId: +studentId },
            });
            const previousCarryForward = Number((previousAccount === null || previousAccount === void 0 ? void 0 : previousAccount.carryForward) || 0);
            // Step 1: Get unpaid fees
            let unpaidFees = yield prisma.studentFee.findMany({
                where: {
                    studentId: +studentId,
                    isPaid: false,
                },
                orderBy: [{ year: "asc" }, { month: "asc" }],
            });
            const existingKeys = new Set(unpaidFees.map((f) => `${f.year}-${f.month}`));
            let totalAvailable = Number(amountPaid) + previousCarryForward;
            const estimatedMonths = totalAvailable < feeAmount ? 1 : Math.ceil(totalAvailable / feeAmount);
            let lastDate = new Date(currentYear, currentMonth - 1, 1);
            // Step 2: Create missing months (via upsert)
            for (let i = 0; i < estimatedMonths; i++) {
                const month = lastDate.getMonth() + 1;
                const year = lastDate.getFullYear();
                const key = `${year}-${month}`;
                if (!existingKeys.has(key)) {
                    const newOrExisting = yield prisma.studentFee.upsert({
                        where: {
                            studentId_month_year: {
                                studentId: +studentId,
                                month,
                                year,
                            },
                        },
                        update: {},
                        create: {
                            studentId: +studentId,
                            month,
                            year,
                            isPaid: false,
                        },
                    });
                    unpaidFees.push(newOrExisting);
                    existingKeys.add(key);
                }
                lastDate.setMonth(lastDate.getMonth() + 1);
            }
            unpaidFees.sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year);
            // Step 3: Get current allocations
            const allocationSums = yield prisma.paymentAllocation.groupBy({
                by: ["studentFeeId"],
                where: {
                    studentFeeId: { in: unpaidFees.map((f) => f.id) },
                },
                _sum: { amount: true },
            });
            const paidMap = new Map(allocationSums.map((a) => [a.studentFeeId, Number(a._sum.amount || 0)]));
            let availableAmount = Number(amountPaid) + previousCarryForward;
            let remainingDiscount = Number(discount);
            const allocations = [];
            const discountRecords = [];
            const detailedAllocations = [];
            // Step 4: Allocate fees
            for (const feeRecord of unpaidFees) {
                if (availableAmount <= 0 && remainingDiscount <= 0)
                    break;
                const paidSoFar = paidMap.get(feeRecord.id) || 0;
                const due = feeAmount - paidSoFar;
                const discountToApply = Math.min(remainingDiscount, due);
                const paymentToApply = Math.min(due - discountToApply, availableAmount);
                const totalPayment = discountToApply + paymentToApply;
                if (paymentToApply > 0 || discountToApply > 0) {
                    allocations.push({
                        studentFeeId: feeRecord.id,
                        amount: totalPayment,
                        studentId: +studentId,
                    });
                    detailedAllocations.push({
                        studentFeeId: feeRecord.id,
                        total: totalPayment,
                        paid: paymentToApply,
                        discount: discountToApply,
                        month: feeRecord.month,
                        year: feeRecord.year,
                    });
                    if (discountToApply > 0) {
                        discountRecords.push({
                            studentFeeId: feeRecord.id,
                            studentId: +studentId,
                            amount: discountToApply,
                            reason: discountReason,
                            month: feeRecord.month,
                            year: feeRecord.year,
                            approvedBy: user.useId,
                        });
                        remainingDiscount -= discountToApply;
                    }
                    availableAmount -= paymentToApply;
                    if (paidSoFar + totalPayment >= feeAmount) {
                        yield prisma.studentFee.update({
                            where: { id: feeRecord.id },
                            data: { isPaid: true },
                        });
                    }
                }
            }
            // Step 5: Save payment
            const newPayment = yield prisma.payment.create({
                data: {
                    studentId: +studentId,
                    userId: user.useId,
                    amountPaid: Number(amountPaid),
                    discount: Number(discount),
                    Description, // ✅ saved here
                    allocations: { create: allocations },
                },
            });
            if (discountRecords.length > 0) {
                yield prisma.discountLog.createMany({ data: discountRecords });
            }
            // Step 6: Update carry forward
            yield prisma.studentAccount.upsert({
                where: { studentId: +studentId },
                update: { carryForward: availableAmount },
                create: {
                    studentId: +studentId,
                    carryForward: availableAmount,
                },
            });
            res.status(201).json({
                message: "Payment processed successfully",
                payment: newPayment,
                StudentName: student.fullname,
                carryForward: availableAmount,
                allocations: detailedAllocations,
                appliedDiscounts: discountRecords,
            });
        }));
    }
    catch (error) {
        console.error("Error processing payment:", error);
        res.status(500).json({
            message: "Internal server error while processing payment",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.createStudentPayment = createStudentPayment;
const createMultiStudentPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let studentsRaw = req.body.students;
        // ✅ Normalize and validate
        const students = Array.isArray(studentsRaw)
            ? studentsRaw
            : studentsRaw
                ? [studentsRaw]
                : [];
        if (!Array.isArray(students) ||
            students.length === 0 ||
            students.some((s) => !s || typeof s !== "object")) {
            return res.status(400).json({
                message: "Valid 'students' array with studentId and amountPaid is required",
            });
        }
        // @ts-ignore
        const user = req.user;
        const results = yield prisma.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            const responses = [];
            for (const [index, entry] of students.entries()) {
                if (!entry || typeof entry !== "object") {
                    throw new Error(`Invalid student entry at index ${index}`);
                }
                const { studentId, amountPaid, discount = 0, discountReason = "", } = entry;
                if (!studentId || amountPaid === undefined) {
                    throw new Error(`Missing studentId or amountPaid at index ${index}`);
                }
                if (discount < 0) {
                    throw new Error(`Discount cannot be negative at index ${index}`);
                }
                const student = yield prisma.student.findUnique({
                    where: { id: +studentId },
                });
                if (!student)
                    throw new Error(`Student ID ${studentId} not found`);
                const feeAmount = Number(student.fee);
                const today = new Date();
                const currentMonth = today.getMonth() + 1;
                const currentYear = today.getFullYear();
                const previousAccount = yield prisma.studentAccount.findUnique({
                    where: { studentId: +studentId },
                });
                const previousCarryForward = Number((previousAccount === null || previousAccount === void 0 ? void 0 : previousAccount.carryForward) || 0);
                // Step 1: Get unpaid fees
                let unpaidFees = yield prisma.studentFee.findMany({
                    where: {
                        studentId: +studentId,
                        isPaid: false,
                    },
                    orderBy: [{ year: "asc" }, { month: "asc" }],
                });
                const existingKeys = new Set(unpaidFees.map((f) => `${f.year}-${f.month}`));
                let totalAvailable = Number(amountPaid) + previousCarryForward;
                const estimatedMonths = totalAvailable < feeAmount
                    ? 1
                    : Math.ceil(totalAvailable / feeAmount);
                let lastDate = new Date(currentYear, currentMonth - 1, 1);
                // Step 2: Create missing months
                for (let i = 0; i < estimatedMonths; i++) {
                    const month = lastDate.getMonth() + 1;
                    const year = lastDate.getFullYear();
                    const key = `${year}-${month}`;
                    if (!existingKeys.has(key)) {
                        const newOrExisting = yield prisma.studentFee.upsert({
                            where: {
                                studentId_month_year: {
                                    studentId: +studentId,
                                    month,
                                    year,
                                },
                            },
                            update: {},
                            create: {
                                studentId: +studentId,
                                month,
                                year,
                                isPaid: false,
                            },
                        });
                        unpaidFees.push(newOrExisting);
                        existingKeys.add(key);
                    }
                    lastDate.setMonth(lastDate.getMonth() + 1);
                }
                unpaidFees.sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year);
                // Step 3: Get current allocations
                const allocationSums = yield prisma.paymentAllocation.groupBy({
                    by: ["studentFeeId"],
                    where: {
                        studentFeeId: { in: unpaidFees.map((f) => f.id) },
                    },
                    _sum: { amount: true },
                });
                const paidMap = new Map(allocationSums.map((a) => [
                    a.studentFeeId,
                    Number(a._sum.amount || 0),
                ]));
                let availableAmount = Number(amountPaid) + previousCarryForward;
                let remainingDiscount = Number(discount);
                const allocations = [];
                const discountRecords = [];
                const detailedAllocations = [];
                // Step 4: Allocate (partial or full)
                for (const feeRecord of unpaidFees) {
                    if (availableAmount <= 0 && remainingDiscount <= 0)
                        break;
                    const paidSoFar = paidMap.get(feeRecord.id) || 0;
                    const due = feeAmount - paidSoFar;
                    const discountToApply = Math.min(remainingDiscount, due);
                    const paymentToApply = Math.min(due - discountToApply, availableAmount);
                    const totalPayment = discountToApply + paymentToApply;
                    if (paymentToApply > 0 || discountToApply > 0) {
                        allocations.push({
                            studentFeeId: feeRecord.id,
                            amount: totalPayment,
                            studentId: +studentId,
                        });
                        detailedAllocations.push({
                            studentFeeId: feeRecord.id,
                            total: totalPayment,
                            paid: paymentToApply,
                            discount: discountToApply,
                            month: feeRecord.month,
                            year: feeRecord.year,
                        });
                        if (discountToApply > 0) {
                            discountRecords.push({
                                studentFeeId: feeRecord.id,
                                studentId: +studentId,
                                amount: discountToApply,
                                reason: discountReason,
                                month: feeRecord.month,
                                year: feeRecord.year,
                                approvedBy: user.useId,
                            });
                            remainingDiscount -= discountToApply;
                        }
                        availableAmount -= paymentToApply;
                        if (paidSoFar + totalPayment >= feeAmount) {
                            yield prisma.studentFee.update({
                                where: { id: feeRecord.id },
                                data: { isPaid: true },
                            });
                        }
                    }
                }
                // Step 5: Save payment
                const newPayment = yield prisma.payment.create({
                    data: {
                        studentId: +studentId,
                        userId: user.useId,
                        amountPaid: Number(amountPaid),
                        discount: Number(discount),
                        allocations: { create: allocations },
                    },
                });
                if (discountRecords.length > 0) {
                    yield prisma.discountLog.createMany({ data: discountRecords });
                }
                // Step 6: Update carry forward
                yield prisma.studentAccount.upsert({
                    where: { studentId: +studentId },
                    update: { carryForward: availableAmount },
                    create: {
                        studentId: +studentId,
                        carryForward: availableAmount,
                    },
                });
                responses.push({
                    studentId,
                    message: "Payment processed successfully",
                    payment: newPayment,
                    StudentName: student.fullname,
                    carryForward: availableAmount,
                    allocations: detailedAllocations,
                    appliedDiscounts: discountRecords,
                });
            }
            return responses;
        }));
        res.status(201).json({
            message: "All student payments processed successfully",
            results,
        });
    }
    catch (error) {
        console.error("Error processing multi-student payments:", error);
        res.status(500).json({
            message: "Internal server error while processing payments",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.createMultiStudentPayment = createMultiStudentPayment;
const generateMonthlyFees = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const today = new Date();
        const month = today.getMonth() + 1;
        const year = today.getFullYear();
        // Fetch all active students
        const students = yield prisma.student.findMany({
            where: { isdeleted: false, status: "ACTIVE" },
            select: {
                id: true,
                fee: true,
            },
        });
        const newFees = students
            .filter((student) => Number(student.fee) > 0)
            .map((student) => ({
            studentId: student.id,
            month,
            year,
            isPaid: false,
        }));
        if (newFees.length === 0) {
            return res.status(200).json({ message: "No new fee records needed." });
        }
        // ✅ Use skipDuplicates to avoid violating unique constraint
        const result = yield prisma.studentFee.createMany({
            data: newFees,
            skipDuplicates: true,
        });
        res.status(201).json({
            message: `${result.count} monthly fee records created for ${month}/${year}`,
        });
    }
    catch (error) {
        console.error("Error generating monthly fees:", error);
        res.status(500).json({
            message: "Server error while generating fees",
        });
    }
});
exports.generateMonthlyFees = generateMonthlyFees;
// GET /api/students/:id/fees
const getStudentFees = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const studentId = Number(req.params.id);
        if (!studentId) {
            return res.status(400).json({ message: "Student ID is required1" });
        }
        const student = yield prisma.student.findUnique({
            where: { id: studentId },
            include: {
                StudentFee: {
                    orderBy: [{ year: "asc" }, { month: "asc" }],
                    include: {
                        PaymentAllocation: {
                            include: {
                                payment: {
                                    select: {
                                        amountPaid: true,
                                        discount: true,
                                        date: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        const feeAmount = Number(student.fee); // ✅ Convert Decimal to number
        const feeDetails = student.StudentFee.map((fee) => {
            const totalPaid = fee.PaymentAllocation.reduce((sum, alloc) => sum + Number(alloc.amount), 0);
            return {
                id: fee.id,
                month: fee.month,
                year: fee.year,
                required: feeAmount,
                isPaid: fee.isPaid,
                paid: totalPaid,
                due: Math.max(0, feeAmount - totalPaid), // ✅ Safe number math
                paymentHistory: fee.PaymentAllocation.map((alloc) => ({
                    amount: Number(alloc.amount),
                    date: alloc.payment.date,
                    discount: Number(alloc.payment.discount),
                })),
            };
        });
        res.status(200).json({
            studentId: student.id,
            name: student.fullname,
            fee: feeAmount,
            records: feeDetails,
        });
    }
    catch (error) {
        console.error("Error fetching student fees:", error);
        res
            .status(500)
            .json({ message: "Internal server error while fetching student fees" });
    }
});
exports.getStudentFees = getStudentFees;
// GET /api/payment/:studentId/history
const getPaymentHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const studentId = Number(req.params.studentId);
        const payments = yield prisma.payment.findMany({
            where: { studentId },
            orderBy: { date: "desc" },
            include: {
                allocations: {
                    include: {
                        studentFee: {
                            select: { month: true, year: true },
                        },
                    },
                },
            },
        });
        const history = payments.map((payment) => ({
            id: payment.id,
            amountPaid: Number(payment.amountPaid),
            discount: Number(payment.discount),
            date: payment.date,
            allocations: payment.allocations.map((alloc) => ({
                month: alloc.studentFee.month,
                year: alloc.studentFee.year,
                amount: Number(alloc.amount),
            })),
        }));
        res.status(200).json(history);
    }
    catch (error) {
        console.error("Error fetching payment history:", error);
        res.status(500).json({ message: "Error fetching payment history" });
    }
});
exports.getPaymentHistory = getPaymentHistory;
// GET /api/students/:id/balance
// export const getStudentBalanceSummary = async (req: Request, res: Response) => {
//   try {
//     const studentId = Number(req.params.id);
//     const student = await prisma.student.findFirst({
//       where: { id: studentId, isdeleted: false },
//       include: {
//         StudentFee: {
//           include: {
//             PaymentAllocation: {
//               select: {
//                 amount: true,
//               },
//             },
//           },
//         },
//         StudentAccount: true,
//       },
//     });
//     if (!student) {
//       return res.status(404).json({ message: "Student not found" });
//     }
//     const feeAmount = Number(student.fee);
//     let totalRequired = 0;
//     let totalPaid = 0;
//     let unpaidMonths = 0;
//     for (const fee of student.StudentFee) {
//       const paid = fee.PaymentAllocation.reduce(
//         (sum, alloc) => sum + Number(alloc.amount),
//         0
//       );
//       totalRequired += feeAmount;
//       totalPaid += paid;
//       if (!fee.isPaid && paid < feeAmount) {
//         unpaidMonths++;
//       }
//     }
//     const carryForward = Number(student.StudentAccount?.carryForward || 0);
//     const rawBalance = totalRequired - totalPaid;
//     const balanceDue = Math.max(0, rawBalance - carryForward);
//     res.status(200).json({
//       studentId: student.id,
//       name: student.fullname,
//       monthlyFee: feeAmount,
//       monthsGenerated: student.StudentFee.length,
//       unpaidMonths,
//       totalRequired, // Total expected across months
//       totalPaid, // Total paid via allocations
//       carryForward, // Credit (positive) or debit (negative)
//       rawBalance: rawBalance, // totalRequired - totalPaid (before applying carryForward)
//       balanceDue, // final amount owed after subtracting carryForward
//       explanation: `Student owes ${totalRequired} total. They paid ${totalPaid}, carry forward is ${carryForward}. So final balance due = ${balanceDue}`,
//     });
//   } catch (error) {
//     console.error("Error fetching student balance:", error);
//     res.status(500).json({ message: "Error fetching student balance" });
//   }
// };
const getStudentBalanceSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const studentId = Number(req.params.id);
        const student = yield prisma.student.findFirst({
            where: { id: studentId, isdeleted: false },
            include: {
                StudentFee: {
                    include: {
                        PaymentAllocation: {
                            select: {
                                amount: true,
                            },
                        },
                    },
                    orderBy: [{ year: "asc" }, { month: "asc" }],
                },
                StudentAccount: true,
            },
        });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        const feeAmount = Number(student.fee);
        let totalRequired = 0;
        let totalPaid = 0;
        let unpaidMonths = 0;
        const unpaidDetails = [];
        for (const fee of student.StudentFee) {
            const paid = fee.PaymentAllocation.reduce((sum, alloc) => sum + Number(alloc.amount), 0);
            totalRequired += feeAmount;
            totalPaid += paid;
            const due = Math.max(0, feeAmount - paid);
            if (!fee.isPaid && due > 0) {
                unpaidMonths++;
                unpaidDetails.push({
                    month: fee.month,
                    year: fee.year,
                    due,
                    paid,
                });
            }
        }
        const carryForward = Number(((_a = student.StudentAccount) === null || _a === void 0 ? void 0 : _a.carryForward) || 0);
        const rawBalance = totalRequired - totalPaid;
        const balanceDue = Math.max(0, rawBalance - carryForward);
        res.status(200).json({
            studentId: student.id,
            name: student.fullname,
            monthlyFee: feeAmount,
            monthsGenerated: student.StudentFee.length,
            unpaidMonths,
            unpaidDetails, // 👈 This is your requested list
            totalRequired,
            totalPaid,
            carryForward,
            rawBalance,
            balanceDue,
            explanation: `Student owes ${totalRequired}. Paid ${totalPaid}, carry forward is ${carryForward}. Balance due = ${balanceDue}`,
        });
    }
    catch (error) {
        console.error("Error fetching student balance:", error);
        res.status(500).json({ message: "Error fetching student balance" });
    }
});
exports.getStudentBalanceSummary = getStudentBalanceSummary;
// GET /api/payment/:id/allocations
const getAllocationsByPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const paymentId = Number(req.params.id);
        const allocations = yield prisma.paymentAllocation.findMany({
            where: { paymentId },
            include: {
                studentFee: {
                    select: {
                        month: true,
                        year: true,
                        isPaid: true,
                    },
                },
            },
        });
        res.status(200).json(allocations);
    }
    catch (error) {
        console.error("Error fetching allocations by payment:", error);
        res.status(500).json({ message: "Error retrieving payment allocations" });
    }
});
exports.getAllocationsByPayment = getAllocationsByPayment;
// GET /api/payment-allocations// controllers/paymentController.ts
// export const getAllPayments = async (_req: Request, res: Response) => {
//   try {
//     const rawPayments = await prisma.payment.findMany({
//       include: {
//         student: {
//           select: {
//             id: true,
//             fullname: true,
//           },
//         },
//         user: {
//           select: {
//             id: true,
//             fullName: true,
//             email: true,
//           },
//         },
//         allocations: true,
//       },
//       orderBy: {
//         date: "desc",
//       },
//     });
//     // Flatten the structure so frontend receives `fullname` directly
//     const payments = rawPayments.map((payment) => ({
//       ...payment,
//       fullname: payment.student.fullname, // Injected top-level fullname
//     }));
//     res.status(200).json({
//       message: "All payments retrieved successfully",
//       payments,
//     });
//   } catch (error) {
//     console.error("Error fetching payments:", error);
//     res.status(500).json({
//       message: "Failed to retrieve payments",
//       error: error instanceof Error ? error.message : "Unknown error",
//     });
//   }
// };
const getAllPayments = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const payments = yield prisma.payment.findMany({
            include: {
                student: { select: { id: true, fullname: true } },
                user: { select: { id: true, fullName: true, email: true } },
                allocations: true,
            },
            orderBy: {
                date: "desc",
            },
        });
        // Map payments to include top-level fullname and discount
        const enhancedPayments = payments.map((p) => (Object.assign(Object.assign({}, p), { fullname: p.student.fullname, discount: p.discount.toString() })));
        res.status(200).json({
            message: "All payments retrieved successfully",
            payments: enhancedPayments,
        });
    }
    catch (error) {
        console.error("Error fetching payments:", error);
        res.status(500).json({ message: "Failed to retrieve payments" });
    }
});
exports.getAllPayments = getAllPayments;
// controllers/paymentController.ts
const updatePayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const paymentId = parseInt(req.params.id);
    const { amountPaid, discount, Description } = req.body;
    try {
        const updatedPayment = yield prisma.payment.update({
            where: { id: paymentId },
            data: {
                amountPaid,
                discount,
                Description,
            },
        });
        res
            .status(200)
            .json({ message: "Payment updated successfully", updatedPayment });
    }
    catch (error) {
        console.error("Error updating payment:", error);
        res.status(500).json({ message: "Failed to update payment" });
    }
});
exports.updatePayment = updatePayment;
// GET /api/admin/fee-inconsistencies
const getFeeInconsistencies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Get all students with their fee records and payment allocations
        const students = yield prisma.student.findMany({
            include: {
                StudentFee: {
                    include: {
                        PaymentAllocation: {
                            select: {
                                amount: true,
                                payment: {
                                    select: {
                                        discount: true,
                                    },
                                },
                            },
                        },
                    },
                },
                StudentAccount: {
                    select: {
                        carryForward: true,
                    },
                },
            },
        });
        const inconsistencies = [];
        for (const student of students) {
            const expectedMonthlyFee = Number(student.fee);
            let totalPayments = 0;
            let totalAllocated = 0;
            // Check monthly fee payments
            for (const fee of student.StudentFee) {
                const paid = fee.PaymentAllocation.reduce((sum, alloc) => sum + Number(alloc.amount), 0);
                totalAllocated += paid;
                if (fee.isPaid && paid < expectedMonthlyFee) {
                    inconsistencies.push({
                        type: "UNDERPAID_FEE",
                        studentId: student.id,
                        studentName: student.fullname,
                        month: fee.month,
                        year: fee.year,
                        expected: expectedMonthlyFee,
                        paid,
                        shortage: expectedMonthlyFee - paid,
                    });
                }
                else if (!fee.isPaid && paid >= expectedMonthlyFee) {
                    inconsistencies.push({
                        type: "UNMARKED_PAID_FEE",
                        studentId: student.id,
                        studentName: student.fullname,
                        month: fee.month,
                        year: fee.year,
                        expected: expectedMonthlyFee,
                        paid,
                    });
                }
            }
            // Get total payments made (including discounts)
            const paymentSum = yield prisma.payment.aggregate({
                where: { studentId: student.id },
                _sum: {
                    amountPaid: true,
                    discount: true,
                },
            });
            totalPayments =
                Number(paymentSum._sum.amountPaid || 0) -
                    Number(paymentSum._sum.discount || 0);
            // Check account consistency
            const systemCarryForward = Number(((_a = student.StudentAccount) === null || _a === void 0 ? void 0 : _a.carryForward) || 0);
            const calculatedCarryForward = totalPayments - totalAllocated;
            if (Math.abs(systemCarryForward - calculatedCarryForward) > 0.01) {
                inconsistencies.push({
                    type: "ACCOUNT_MISMATCH",
                    studentId: student.id,
                    studentName: student.fullname,
                    systemCarryForward,
                    calculatedCarryForward,
                    difference: systemCarryForward - calculatedCarryForward,
                    totalPayments,
                    totalAllocated,
                });
            }
        }
        res.status(200).json({
            inconsistencies,
            count: inconsistencies.length,
            summary: {
                underpaid: inconsistencies.filter((i) => i.type === "UNDERPAID_FEE")
                    .length,
                unmarkedPaid: inconsistencies.filter((i) => i.type === "UNMARKED_PAID_FEE").length,
                accountMismatches: inconsistencies.filter((i) => i.type === "ACCOUNT_MISMATCH").length,
            },
        });
    }
    catch (error) {
        console.error("Error fetching fee inconsistencies:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.getFeeInconsistencies = getFeeInconsistencies;
const verifyDiscount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, month, year, verifiedBy } = req.body;
        // Validate input
        if (!studentId || !month || !year || !verifiedBy) {
            return res.status(400).json({
                error: "studentId, month, year, and verifiedBy are required",
            });
        }
        // Verify the discount exists
        const existingDiscounts = yield prisma.discountLog.findMany({
            where: {
                studentId,
                month,
                year,
                verified: false,
            },
        });
        if (existingDiscounts.length === 0) {
            return res.status(404).json({
                error: "No unverified discount records found for this student and period",
            });
        }
        // Update verification status
        yield prisma.discountLog.updateMany({
            where: {
                studentId,
                month,
                year,
                verified: false,
            },
            data: {
                verified: true,
                verifiedAt: new Date(),
                verifiedBy,
            },
        });
        res.status(200).json({
            message: "Discount(s) successfully verified",
            verifiedCount: existingDiscounts.length,
        });
    }
    catch (error) {
        console.error("Error verifying discount:", error);
        res.status(500).json({
            error: "Internal server error",
            details: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.verifyDiscount = verifyDiscount;
//get Student Discount
const listDiscounts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.body;
        if (!studentId) {
            return res.status(400).json({
                error: "studentId is required in the request body",
            });
        }
        const discounts = yield prisma.discountLog.findMany({
            where: {
                studentId: Number(studentId),
            },
            orderBy: [{ year: "desc" }, { month: "desc" }, { verified: "asc" }],
        });
        const verified = discounts.filter((d) => d.verified);
        const unverified = discounts.filter((d) => !d.verified);
        res.status(200).json({
            studentId: Number(studentId),
            verified,
            unverified,
        });
    }
    catch (error) {
        console.error("Error listing discounts:", error);
        res.status(500).json({
            error: "Internal server error",
            details: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.listDiscounts = listDiscounts;
//   _req: Request,
//   res: Response
// ) => {
//   try {
//     const students = await prisma.student.findMany({
//       where: {
//         isdeleted: false,
//         status: "ACTIVE",
//       },
//       include: {
//         StudentFee: {
//           include: {
//             PaymentAllocation: {
//               select: {
//                 amount: true,
//               },
//             },
//           },
//         },
//         StudentAccount: true,
//       },
//     });
//     const result = [];
//     for (const student of students) {
//       const feeAmount = Number(student.fee);
//       let totalRequired = 0;
//       let totalPaid = 0;
//       let unpaidMonths = 0;
//       for (const fee of student.StudentFee) {
//         const paidForThisMonth = fee.PaymentAllocation.reduce(
//           (sum, alloc) => sum + Number(alloc.amount),
//           0
//         );
//         totalPaid += paidForThisMonth;
//         totalRequired += feeAmount;
//         if (!fee.isPaid && paidForThisMonth < feeAmount) {
//           unpaidMonths++;
//         }
//       }
//       const carryForward = Number(student.StudentAccount?.carryForward || 0);
//       const balanceDue = Math.max(0, totalRequired - totalPaid - carryForward);
//       // ✅ Include only students with any fee activity
//       if (totalRequired > 0 || totalPaid > 0 || balanceDue > 0) {
//         result.push({
//           studentId: student.id,
//           name: student.fullname,
//           totalRequired,
//           totalPaid,
//           unpaidMonths,
//           carryForward,
//           balanceDue,
//         });
//       }
//     }
//     res.status(200).json({
//       count: result.length,
//       students: result,
//     });
//   } catch (error) {
//     console.error("Error calculating balances:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };
// export const getStudentsWithUnpaidFeesOrBalance = async (
//   _req: Request,
//   res: Response
// ) => {
//   try {
//     const students = await prisma.student.findMany({
//       where: {
//         isdeleted: false,
//         status: "ACTIVE",
//       },
//       include: {
//         StudentFee: {
//           include: {
//             PaymentAllocation: {
//               select: {
//                 amount: true,
//               },
//             },
//           },
//         },
//         StudentAccount: true,
//       },
//     });
//     const result = [];
//     for (const student of students) {
//       const feeAmount = Number(student.fee);
//       let totalRequired = 0;
//       let totalPaid = 0;
//       let unpaidMonths = 0;
//       for (const fee of student.StudentFee) {
//         const paidForThisMonth = fee.PaymentAllocation.reduce(
//           (sum, alloc) => sum + Number(alloc.amount),
//           0
//         );
//         const monthDue = Math.max(0, feeAmount - paidForThisMonth);
//         totalPaid += paidForThisMonth;
//         totalRequired += feeAmount;
//         if (!fee.isPaid && paidForThisMonth < feeAmount) {
//           unpaidMonths++;
//         }
//       }
//       let carryForward = Number(student.StudentAccount?.carryForward || 0);
//       // If carryForward is negative, it's a debt
//       // If positive, it's credit that reduces balance due
//       const balanceDue = Math.max(0, totalRequired - totalPaid - carryForward);
//       if (totalRequired > 0 || totalPaid > 0 || balanceDue > 0) {
//         result.push({
//           studentId: student.id,
//           name: student.fullname,
//           totalRequired,
//           totalPaid,
//           unpaidMonths,
//           carryForward,
//           balanceDue,
//         });
//       }
//     }
//     res.status(200).json({
//       count: result.length,
//       students: result,
//     });
//   } catch (error) {
//     console.error("Error calculating balances:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };
// export const getStudentsWithUnpaidFeesOrBalance = async (
//   _req: Request,
//   res: Response
// ) => {
//   try {
//     const students = await prisma.student.findMany({
//       where: {
//         isdeleted: false,
//         status: "ACTIVE",
//       },
//       include: {
//         StudentFee: {
//           include: {
//             PaymentAllocation: {
//               select: {
//                 amount: true,
//               },
//             },
//           },
//         },
//         StudentAccount: true,
//       },
//     });
//     const result = [];
//     for (const student of students) {
//       const feeAmount = Number(student.fee);
//       let totalRequired = 0;
//       let totalPaid = 0;
//       let unpaidMonths = 0;
//       for (const fee of student.StudentFee) {
//         const paidForThisMonth = fee.PaymentAllocation.reduce(
//           (sum, alloc) => sum + Number(alloc.amount),
//           0
//         );
//         const monthDue = Math.max(0, feeAmount - paidForThisMonth);
//         totalPaid += paidForThisMonth;
//         totalRequired += feeAmount;
//         if (!fee.isPaid && paidForThisMonth < feeAmount) {
//           unpaidMonths++;
//         }
//       }
//       const carryForward = Number(student.StudentAccount?.carryForward || 0);
//       const balanceDue = Math.max(0, totalRequired - totalPaid - carryForward);
//       // ✅ Only include students who actually owe money
//       if (balanceDue > 0) {
//         result.push({
//           studentId: student.id,
//           name: student.fullname,
//           totalRequired,
//           totalPaid,
//           unpaidMonths,
//           carryForward,
//           balanceDue,
//         });
//       }
//     }
//     res.status(200).json({
//       count: result.length,
//       students: result,
//     });
//   } catch (error) {
//     console.error("Error calculating balances:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };
const getStudentsWithUnpaidFeesOrBalance = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const students = yield prisma.student.findMany({
            where: {
                isdeleted: false,
                status: "ACTIVE",
            },
            include: {
                classes: true, // ✅ include class
                StudentFee: {
                    include: {
                        PaymentAllocation: {
                            select: {
                                amount: true,
                            },
                        },
                    },
                },
                StudentAccount: true,
            },
        });
        const result = [];
        for (const student of students) {
            const feeAmount = Number(student.fee);
            let totalRequired = 0;
            let totalPaid = 0;
            let unpaidMonths = 0;
            for (const fee of student.StudentFee) {
                const paidForThisMonth = fee.PaymentAllocation.reduce((sum, alloc) => sum + Number(alloc.amount), 0);
                const monthDue = Math.max(0, feeAmount - paidForThisMonth);
                totalPaid += paidForThisMonth;
                totalRequired += feeAmount;
                if (!fee.isPaid && paidForThisMonth < feeAmount) {
                    unpaidMonths++;
                }
            }
            const carryForward = Number(((_a = student.StudentAccount) === null || _a === void 0 ? void 0 : _a.carryForward) || 0);
            const balanceDue = Math.max(0, totalRequired - totalPaid - carryForward);
            if (balanceDue > 0) {
                result.push({
                    studentId: student.id,
                    name: student.fullname,
                    className: ((_b = student.classes) === null || _b === void 0 ? void 0 : _b.name) || "N/A", // ✅ add class name
                    totalRequired,
                    totalPaid,
                    unpaidMonths,
                    carryForward,
                    balanceDue,
                });
            }
        }
        res.status(200).json({
            count: result.length,
            students: result,
        });
    }
    catch (error) {
        console.error("Error calculating balances:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.getStudentsWithUnpaidFeesOrBalance = getStudentsWithUnpaidFeesOrBalance;
// export const getMonthlyIncomeOverview = async (req: Request, res: Response) => {
//   try {
//     const month = Number(req.query.month);
//     const year = Number(req.query.year);
//     if (!month || !year) {
//       return res.status(400).json({
//         message: "Both month and year query parameters are required",
//       });
//     }
//     const startDate = new Date(year, month - 1, 1);
//     const endDate = new Date(year, month, 0, 23, 59, 59, 999);
//     // 1. Current month fee records
//     const studentFeesCurrent = await prisma.studentFee.findMany({
//       where: {
//         month,
//         year,
//         student: {
//           isdeleted: false,
//           status: "ACTIVE",
//         },
//       },
//       include: {
//         student: {
//           select: { fee: true },
//         },
//       },
//     });
//     const expectedFromCurrentMonth = studentFeesCurrent.reduce(
//       (sum, record) => sum + Number(record.student.fee || 0),
//       0
//     );
//     // 2. Previous unpaid months
//     const unpaidPastFees = await prisma.studentFee.findMany({
//       where: {
//         isPaid: false,
//         OR: [{ year: { lt: year } }, { year, month: { lt: month } }],
//         student: {
//           isdeleted: false,
//           status: "ACTIVE",
//         },
//       },
//       include: {
//         student: {
//           select: { id: true, fee: true },
//         },
//         PaymentAllocation: {
//           select: { amount: true },
//         },
//       },
//     });
//     const expectedFromPreviousMonths = unpaidPastFees.reduce((sum, fee) => {
//       const paid = fee.PaymentAllocation.reduce(
//         (s, a) => s + Number(a.amount),
//         0
//       );
//       return sum + Math.max(0, Number(fee.student.fee) - paid);
//     }, 0);
//     // 3. Total expected
//     const requiredIncome =
//       expectedFromCurrentMonth + expectedFromPreviousMonths;
//     // 4. This month’s actual allocations
//     const allocations = await prisma.paymentAllocation.findMany({
//       where: {
//         payment: {
//           date: {
//             gte: startDate,
//             lte: endDate,
//           },
//         },
//       },
//       include: {
//         studentFee: {
//           select: {
//             month: true,
//             year: true,
//             student: { select: { fee: true } },
//           },
//         },
//       },
//     });
//     let lateIncome = 0;
//     let currentIncome = 0;
//     let advanceIncome = 0;
//     for (const alloc of allocations) {
//       const amount = Number(alloc.amount);
//       const allocMonth = alloc.studentFee.month;
//       const allocYear = alloc.studentFee.year;
//       if (allocYear < year || (allocYear === year && allocMonth < month)) {
//         lateIncome += amount;
//       } else if (allocYear === year && allocMonth === month) {
//         currentIncome += amount;
//       } else {
//         advanceIncome += amount;
//       }
//     }
//     const totalIncome = lateIncome + currentIncome + advanceIncome;
//     // 5. Payment records for this month (actual paid + discount)
//     const payments = await prisma.payment.findMany({
//       where: {
//         date: {
//           gte: startDate,
//           lte: endDate,
//         },
//       },
//       select: {
//         amountPaid: true,
//         discount: true,
//       },
//     });
//     const actualPaid = payments.reduce(
//       (sum, p) => sum + Number(p.amountPaid),
//       0
//     );
//     const totalDiscount = payments.reduce(
//       (sum, p) => sum + Number(p.discount),
//       0
//     );
//     const balance = Math.max(0, requiredIncome - totalIncome);
//     // 6. 🔥 NEW: System-wide unpaid balance (from all unpaid StudentFee)
//     const allUnpaidFees = await prisma.studentFee.findMany({
//       where: {
//         isPaid: false,
//         student: {
//           isdeleted: false,
//           status: "ACTIVE",
//         },
//       },
//       include: {
//         student: { select: { fee: true } },
//         PaymentAllocation: { select: { amount: true } },
//       },
//     });
//     const unpaidBalanceSystemWide = allUnpaidFees.reduce((sum, fee) => {
//       const paid = fee.PaymentAllocation.reduce(
//         (s, a) => s + Number(a.amount),
//         0
//       );
//       return sum + Math.max(0, Number(fee.student.fee || 0) - paid);
//     }, 0);
//     res.status(200).json({
//       month,
//       year,
//       totalStudents: studentFeesCurrent.length,
//       requiredIncome: {
//         total: requiredIncome,
//         expectedFromPreviousMonths,
//         expectedFromCurrentMonth,
//       },
//       actualPaid,
//       totalDiscount,
//       totalIncome,
//       balance,
//       unpaidBalanceSystemWide, // 👈 system-wide balance across all months
//       breakdown: {
//         lateIncome,
//         currentIncome,
//         advanceIncome,
//       },
//       message: `Your income is ${totalIncome}. Late: ${lateIncome}, Current: ${currentIncome}, Advance: ${advanceIncome}`,
//     });
//   } catch (error) {
//     console.error("Error generating income overview:", error);
//     res.status(500).json({
//       message: "Internal server error while generating income overview",
//       error: error instanceof Error ? error.message : String(error),
//     });
//   }
// };
// DELETE /api/delete-student-fees?month=5&year=2025
const getMonthlyIncomeOverview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const month = Number(req.query.month);
        const year = Number(req.query.year);
        if (!month || !year) {
            return res.status(400).json({
                message: "Both month and year query parameters are required",
            });
        }
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        // 1. Fetch current month's fee records
        const studentFeesCurrent = yield prisma.studentFee.findMany({
            where: {
                month,
                year,
                student: {
                    isdeleted: false,
                    status: "ACTIVE",
                },
            },
            include: {
                student: {
                    select: { fee: true },
                },
            },
        });
        // 🔄 Get payment allocations for current month’s studentFee IDs
        const feeIds = studentFeesCurrent.map((fee) => fee.id);
        const feeAllocations = yield prisma.paymentAllocation.groupBy({
            by: ["studentFeeId"],
            where: {
                studentFeeId: { in: feeIds },
            },
            _sum: {
                amount: true,
            },
        });
        const feePaidMap = new Map();
        feeAllocations.forEach((a) => {
            feePaidMap.set(a.studentFeeId, Number(a._sum.amount || 0));
        });
        const expectedFromCurrentMonth = studentFeesCurrent.reduce((sum, record) => {
            const fee = Number(record.student.fee || 0);
            const paid = feePaidMap.get(record.id) || 0;
            const remaining = Math.max(0, fee - paid);
            return sum + remaining;
        }, 0);
        // 2. Previous unpaid months
        const unpaidPastFees = yield prisma.studentFee.findMany({
            where: {
                isPaid: false,
                OR: [{ year: { lt: year } }, { year, month: { lt: month } }],
                student: {
                    isdeleted: false,
                    status: "ACTIVE",
                },
            },
            include: {
                student: {
                    select: { id: true, fee: true },
                },
                PaymentAllocation: {
                    select: { amount: true },
                },
            },
        });
        const expectedFromPreviousMonths = unpaidPastFees.reduce((sum, fee) => {
            const paid = fee.PaymentAllocation.reduce((s, a) => s + Number(a.amount), 0);
            return sum + Math.max(0, Number(fee.student.fee) - paid);
        }, 0);
        // 3. Total expected
        const requiredIncome = expectedFromCurrentMonth + expectedFromPreviousMonths;
        // 4. This month’s actual allocations
        const allocations = yield prisma.paymentAllocation.findMany({
            where: {
                payment: {
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
            },
            include: {
                studentFee: {
                    select: {
                        month: true,
                        year: true,
                        student: { select: { fee: true } },
                    },
                },
            },
        });
        let lateIncome = 0;
        let currentIncome = 0;
        let advanceIncome = 0;
        for (const alloc of allocations) {
            const amount = Number(alloc.amount);
            const allocMonth = alloc.studentFee.month;
            const allocYear = alloc.studentFee.year;
            if (allocYear < year || (allocYear === year && allocMonth < month)) {
                lateIncome += amount;
            }
            else if (allocYear === year && allocMonth === month) {
                currentIncome += amount;
            }
            else {
                advanceIncome += amount;
            }
        }
        const totalIncome = lateIncome + currentIncome + advanceIncome;
        // 5. Payment records for this month (actual paid + discount)
        const payments = yield prisma.payment.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                amountPaid: true,
                discount: true,
            },
        });
        const actualPaid = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
        const totalDiscount = payments.reduce((sum, p) => sum + Number(p.discount), 0);
        const balance = Math.max(0, requiredIncome - totalIncome);
        // 6. 🔥 System-wide unpaid balance
        const allUnpaidFees = yield prisma.studentFee.findMany({
            where: {
                isPaid: false,
                student: {
                    isdeleted: false,
                    status: "ACTIVE",
                },
            },
            include: {
                student: { select: { fee: true } },
                PaymentAllocation: { select: { amount: true } },
            },
        });
        const unpaidBalanceSystemWide = allUnpaidFees.reduce((sum, fee) => {
            const paid = fee.PaymentAllocation.reduce((s, a) => s + Number(a.amount), 0);
            return sum + Math.max(0, Number(fee.student.fee || 0) - paid);
        }, 0);
        res.status(200).json({
            month,
            year,
            totalStudents: studentFeesCurrent.length,
            requiredIncome: {
                total: requiredIncome,
                expectedFromPreviousMonths,
                expectedFromCurrentMonth,
            },
            actualPaid,
            totalDiscount,
            totalIncome,
            balance,
            unpaidBalanceSystemWide,
            breakdown: {
                lateIncome,
                currentIncome,
                advanceIncome,
            },
            message: `Your income is ${totalIncome}. Late: ${lateIncome}, Current: ${currentIncome}, Advance: ${advanceIncome}`,
        });
    }
    catch (error) {
        console.error("Error generating income overview:", error);
        res.status(500).json({
            message: "Internal server error while generating income overview",
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.getMonthlyIncomeOverview = getMonthlyIncomeOverview;
const deleteStudentFeesByMonth = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const month = Number(req.query.month);
        const year = Number(req.query.year);
        if (!month || !year) {
            return res.status(400).json({
                message: "Both month and year query parameters are required",
            });
        }
        yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59, 999);
            // 1. Find StudentFee IDs for the month/year
            const fees = yield tx.studentFee.findMany({
                where: { month, year },
                select: { id: true },
            });
            const feeIds = fees.map((f) => f.id);
            // 2. Find Payment IDs in the month
            const payments = yield tx.payment.findMany({
                where: {
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                select: { id: true },
            });
            const paymentIds = payments.map((p) => p.id);
            // 3. Delete PaymentAllocations by studentFeeId OR paymentId
            yield tx.paymentAllocation.deleteMany({
                where: {
                    OR: [
                        { studentFeeId: { in: feeIds } },
                        { paymentId: { in: paymentIds } },
                    ],
                },
            });
            // 4. Delete DiscountLogs for the month/year
            yield tx.discountLog.deleteMany({
                where: { month, year },
            });
            // 5. Delete Payments made within the month
            const deletedPayments = yield tx.payment.deleteMany({
                where: {
                    id: { in: paymentIds },
                },
            });
            // 6. Delete StudentFee records
            const deletedFees = yield tx.studentFee.deleteMany({
                where: {
                    id: { in: feeIds },
                },
            });
            res.status(200).json({
                message: `Deleted data for ${month}/${year}`,
                deleted: {
                    fees: deletedFees.count,
                    allocations: feeIds.length,
                    discounts: "All discounts for the month",
                    payments: deletedPayments.count,
                },
            });
        }));
    }
    catch (error) {
        console.error("Error deleting monthly data:", error);
        res.status(500).json({
            message: "Internal server error while deleting monthly data",
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.deleteStudentFeesByMonth = deleteStudentFeesByMonth;
const monthNames = [
    "",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];
const getAcademicYear = (month, year) => {
    return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};
const getAllGeneratedMonths = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rawMonths = yield prisma.studentFee.findMany({
            select: { month: true, year: true },
            distinct: ["month", "year"],
            orderBy: [{ year: "asc" }, { month: "asc" }],
        });
        const months = rawMonths.map(({ month, year }) => {
            if (month < 1 || month > 12) {
                throw new Error(`Invalid month: ${month}`);
            }
            return {
                month,
                year,
                label: `${monthNames[month]} ${year}`,
                academicYear: getAcademicYear(month, year),
            };
        });
        res.status(200).json({
            totalUniqueMonths: months.length,
            months,
        });
    }
    catch (error) {
        console.error("Error fetching unique months:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.getAllGeneratedMonths = getAllGeneratedMonths;
const getStudentDepositStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const studentId = Number(req.params.id);
        const student = yield prisma.student.findFirst({
            where: { id: studentId, isdeleted: false },
            include: {
                StudentFee: {
                    include: {
                        PaymentAllocation: true,
                    },
                },
                StudentAccount: true,
            },
        });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        const monthlyFee = Number(student.fee);
        const totalRequired = student.StudentFee.length * monthlyFee;
        const totalPaid = student.StudentFee.reduce((sum, fee) => {
            const paid = fee.PaymentAllocation.reduce((subSum, alloc) => subSum + Number(alloc.amount), 0);
            return sum + paid;
        }, 0);
        const carryForward = Number(((_a = student.StudentAccount) === null || _a === void 0 ? void 0 : _a.carryForward) || 0);
        const overpaid = totalPaid + carryForward - totalRequired;
        const hasExtraDeposit = overpaid > 0;
        res.status(200).json({
            studentId,
            name: student.fullname,
            totalRequired,
            totalPaid,
            carryForward,
            overpaid,
            hasExtraDeposit,
            message: hasExtraDeposit
                ? `Student has deposited extra: $${overpaid}`
                : "No extra deposit found",
        });
    }
    catch (error) {
        console.error("Error checking deposit:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.getStudentDepositStatus = getStudentDepositStatus;
//Student Balance Summery
const getAllStudentAccountSummaries = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const students = yield prisma.student.findMany({
            where: { isdeleted: false, status: "ACTIVE" },
            include: {
                StudentFee: {
                    include: {
                        PaymentAllocation: {
                            include: {
                                payment: {
                                    select: { discount: true },
                                },
                            },
                        },
                    },
                    orderBy: [{ year: "asc" }, { month: "asc" }],
                },
                StudentAccount: true,
            },
        });
        const results = students.map((student) => {
            var _a;
            const monthlyFee = Number(student.fee);
            let totalRequired = 0;
            let totalPaid = 0;
            let totalDiscount = 0;
            const monthSummaries = student.StudentFee.map((fee) => {
                const paid = fee.PaymentAllocation.reduce((sum, alloc) => sum + Number(alloc.amount), 0);
                const discount = fee.PaymentAllocation.reduce((sum, alloc) => { var _a; return sum + Number(((_a = alloc.payment) === null || _a === void 0 ? void 0 : _a.discount) || 0); }, 0);
                const required = monthlyFee;
                const due = Math.max(0, required - paid);
                totalRequired += required;
                totalPaid += paid;
                totalDiscount += discount;
                return {
                    month: fee.month,
                    year: fee.year,
                    required,
                    paid,
                    discount,
                    due,
                };
            });
            const carryForward = Number(((_a = student.StudentAccount) === null || _a === void 0 ? void 0 : _a.carryForward) || 0);
            const overpaid = totalPaid + carryForward - totalRequired;
            const hasExtraDeposit = overpaid > 0;
            return {
                studentId: student.id,
                name: student.fullname,
                monthlyFee,
                monthsGenerated: student.StudentFee.length,
                totalRequired,
                totalPaid,
                totalDiscount,
                carryForward,
                overpaid,
                hasExtraDeposit,
                message: hasExtraDeposit
                    ? `Student has deposited extra: $${overpaid}`
                    : "No extra deposit found",
                paidMonths: monthSummaries,
            };
        });
        res.status(200).json({
            count: results.length,
            students: results,
        });
    }
    catch (error) {
        console.error("Error fetching student summaries:", error);
        res.status(500).json({ message: "Server error while processing balances" });
    }
});
exports.getAllStudentAccountSummaries = getAllStudentAccountSummaries;
const getCombinedPayments = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const payments = yield prisma.payment.findMany({
            orderBy: { date: "desc" },
            include: {
                student: {
                    select: { id: true, fullname: true },
                },
                user: {
                    select: { id: true, fullName: true }, // who accepted the payment
                },
                allocations: {
                    include: {
                        studentFee: {
                            select: {
                                month: true,
                                year: true,
                            },
                        },
                    },
                },
            },
        });
        const result = payments.map((payment) => ({
            paymentId: payment.id,
            studentId: payment.student.id,
            studentName: payment.student.fullname,
            amountPaid: Number(payment.amountPaid),
            discount: Number(payment.discount),
            paidTo: payment.user.fullName,
            date: payment.date,
            allocations: payment.allocations.map((alloc) => ({
                month: alloc.studentFee.month,
                year: alloc.studentFee.year,
                amount: Number(alloc.amount),
            })),
        }));
        res.status(200).json(result);
    }
    catch (error) {
        console.error("Error fetching combined payments:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCombinedPayments = getCombinedPayments;
// GET /api/income/today
const getTodayIncome = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const today = new Date();
        const startDate = new Date(today.setHours(0, 0, 0, 0));
        const endDate = new Date(today.setHours(23, 59, 59, 999));
        // 1. Payments today: amountPaid + discount
        const paymentsToday = yield prisma.payment.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                amountPaid: true,
                discount: true,
            },
        });
        const amountPaidToday = paymentsToday.reduce((sum, p) => sum + Number(p.amountPaid), 0);
        const totalDiscountToday = paymentsToday.reduce((sum, p) => sum + Number(p.discount), 0);
        // 2. Unpaid balance (excluding discounts)
        const unpaidFees = yield prisma.studentFee.findMany({
            where: {
                isPaid: false,
                student: {
                    isdeleted: false,
                    status: "ACTIVE",
                },
            },
            include: {
                student: {
                    select: { fee: true },
                },
                PaymentAllocation: {
                    select: { amount: true },
                },
            },
        });
        const unpaidBalance = unpaidFees.reduce((sum, fee) => {
            const expected = Number(fee.student.fee || 0);
            const paid = fee.PaymentAllocation.reduce((s, a) => s + Number(a.amount), 0);
            return sum + Math.max(0, expected - paid);
        }, 0);
        res.status(200).json({
            date: new Date().toISOString().split("T")[0],
            amountPaidToday,
            totalDiscountToday,
            unpaidBalance,
        });
    }
    catch (error) {
        console.error("Error fetching today's payment summary:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.getTodayIncome = getTodayIncome;
// GET /api/classes/payment-status
const getStudentsWithUnpaidFeeMonthly = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const month = Number(req.query.month);
        const year = Number(req.query.year);
        if (!month || !year) {
            return res
                .status(400)
                .json({ message: "Both month and year query parameters are required" });
        }
        // 🔹 Get all ACTIVE students
        const students = yield prisma.student.findMany({
            where: {
                isdeleted: false,
                status: "ACTIVE",
            },
            include: {
                classes: {
                    select: { name: true },
                },
                StudentFee: {
                    include: {
                        PaymentAllocation: {
                            select: { amount: true },
                        },
                    },
                },
                StudentAccount: true,
            },
        });
        const result = [];
        for (const student of students) {
            const feeAmount = Number(student.fee);
            let currentMonthPaid = 0;
            let hasCurrentFee = false;
            let pastUnpaid = 0;
            for (const fee of student.StudentFee) {
                const paid = fee.PaymentAllocation.reduce((sum, alloc) => sum + Number(alloc.amount), 0);
                // Current month
                if (fee.month === month && fee.year === year) {
                    currentMonthPaid = paid;
                    hasCurrentFee = true;
                }
                // Past unpaid months
                if (fee.isPaid === false &&
                    (fee.year < year || (fee.year === year && fee.month < month))) {
                    pastUnpaid += Math.max(0, feeAmount - paid);
                }
            }
            const currentMonthDue = hasCurrentFee ? feeAmount : 0;
            const carryForward = Number(((_a = student.StudentAccount) === null || _a === void 0 ? void 0 : _a.carryForward) || 0);
            const balanceDue = Math.max(0, currentMonthDue + pastUnpaid - currentMonthPaid - carryForward);
            result.push({
                studentId: student.id,
                name: student.fullname,
                className: ((_b = student.classes) === null || _b === void 0 ? void 0 : _b.name) || "Unknown",
                currentMonthDue,
                currentMonthPaid,
                pastUnpaidBalance: pastUnpaid,
                carryForward,
                balanceDue,
            });
        }
        // 🔹 Build class-level summary
        const classSummaryMap = new Map();
        for (const s of result) {
            if (!classSummaryMap.has(s.className)) {
                classSummaryMap.set(s.className, {
                    className: s.className,
                    totalStudents: 0,
                    totalRequired: 0,
                    totalPaid: 0,
                    totalCarryForward: 0,
                    totalPastUnpaid: 0,
                    totalBalanceDue: 0,
                    percentagePaid: 0,
                });
            }
            const summary = classSummaryMap.get(s.className);
            summary.totalStudents += 1;
            summary.totalRequired += s.currentMonthDue;
            summary.totalPaid += s.currentMonthPaid;
            summary.totalCarryForward += s.carryForward;
            summary.totalPastUnpaid += s.pastUnpaidBalance;
            summary.totalBalanceDue += s.balanceDue;
        }
        // 🔹 Calculate percentagePaid for each class
        for (const summary of classSummaryMap.values()) {
            const totalExpected = summary.totalRequired + summary.totalPastUnpaid;
            summary.percentagePaid =
                totalExpected > 0
                    ? ((summary.totalPaid + summary.totalCarryForward) / totalExpected) *
                        100
                    : 0;
            summary.percentagePaid = Number(summary.percentagePaid.toFixed(1));
        }
        // 🔹 Convert to array and sort by unpaid balance
        const summary = Array.from(classSummaryMap.values()).sort((a, b) => b.totalBalanceDue - a.totalBalanceDue);
        // ✅ Final response
        res.status(200).json({
            month,
            year,
            count: result.length,
            students: result,
            summary,
        });
    }
    catch (error) {
        console.error("Error calculating monthly unpaid fee summary:", error);
        res.status(500).json({
            message: "Internal server error while processing monthly unpaid fee summary",
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.getStudentsWithUnpaidFeeMonthly = getStudentsWithUnpaidFeeMonthly;
// export const getAllDiscountLogs = async (req: Request, res: Response) => {
//   try {
//     const discounts = await prisma.discountLog.findMany({
//       include: {
//         student: {
//           select: {
//             id: true,
//             fullname: true,
//           },
//         },
//         approvedUser: {
//           select: {
//             id: true,
//             fullName: true,
//             email: true,
//           },
//         },
//       },
//       orderBy: {
//         createdAt: "desc",
//       },
//     });
//     res.status(200).json({
//       message: "All discount logs retrieved successfully",
//       discounts,
//     });
//   } catch (error) {
//     console.error("Error fetching all discount logs:", error);
//     res.status(500).json({
//       message: "Failed to retrieve discount logs",
//       error: error instanceof Error ? error.message : "Unknown error",
//     });
//   }
// };
const getAllDiscountLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { month, year } = req.query;
        // Build date filter if month and year are provided
        let whereClause = {};
        if (month && year) {
            const numericMonth = parseInt(month) - 1; // JavaScript Date month is 0-based
            const numericYear = parseInt(year);
            const startDate = new Date(numericYear, numericMonth, 1);
            const endDate = new Date(numericYear, numericMonth + 1, 1); // First day of next month
            whereClause = {
                createdAt: {
                    gte: startDate,
                    lt: endDate,
                },
            };
        }
        const discounts = yield prisma.discountLog.findMany({
            where: whereClause,
            include: {
                student: {
                    select: {
                        id: true,
                        fullname: true,
                    },
                },
                approvedUser: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        res.status(200).json({
            message: "Filtered discount logs retrieved successfully",
            discounts,
        });
    }
    catch (error) {
        console.error("Error fetching filtered discount logs:", error);
        res.status(500).json({
            message: "Failed to retrieve discount logs",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.getAllDiscountLogs = getAllDiscountLogs;
