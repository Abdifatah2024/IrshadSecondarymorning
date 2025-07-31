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
exports.getAllBusEmployees = exports.getBusSalaryAndFeeSummaryDetailed = exports.deleteBus = exports.updateBus = exports.getBusById = exports.getAllBuses = exports.createBus = exports.assignStudentToBus = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const assignStudentToBus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { studentId, busId } = req.body;
    if (!studentId || !busId) {
        return res.status(400).json({
            message: "studentId and busId are required",
        });
    }
    try {
        const student = yield prisma.student.findUnique({
            where: { id: +studentId },
        });
        const bus = yield prisma.bus.findUnique({ where: { id: +busId } });
        if (!student || !bus) {
            return res.status(404).json({
                message: "Student or Bus not found",
            });
        }
        const updatedStudent = yield prisma.student.update({
            where: { id: +studentId },
            data: { busId: +busId },
            include: {
                Bus: {
                    include: {
                        driver: {
                            select: { fullName: true },
                        },
                    },
                },
            },
        });
        res.status(200).json({
            message: "Bus assigned successfully",
            student: updatedStudent,
        });
    }
    catch (error) {
        console.error("Error assigning student to bus:", error);
        res.status(500).json({
            message: "Internal server error",
        });
    }
});
exports.assignStudentToBus = assignStudentToBus;
// ✅ CREATE
const createBus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, route, plate, type, color, seats, capacity, driverId } = req.body;
    try {
        const newBus = yield prisma.bus.create({
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
    }
    catch (error) {
        console.error("Error creating bus:", error);
        res.status(500).json({ success: false, message: "Failed to create bus" });
    }
});
exports.createBus = createBus;
// ✅ READ ALL
const getAllBuses = (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const buses = yield prisma.bus.findMany({
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
    }
    catch (error) {
        console.error("Error fetching buses:", error);
        res.status(500).json({ success: false, message: "Failed to fetch buses" });
    }
});
exports.getAllBuses = getAllBuses;
// ✅ READ ONE
const getBusById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    try {
        const bus = yield prisma.bus.findUnique({
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
        if (!bus)
            return res.status(404).json({ message: "Bus not found" });
        res.status(200).json({ success: true, bus });
    }
    catch (error) {
        console.error("Error fetching bus:", error);
        res.status(500).json({ success: false, message: "Failed to fetch bus" });
    }
});
exports.getBusById = getBusById;
// ✅ UPDATE
const updateBus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    const { name, route, plate, type, color, seats, capacity, driverId } = req.body;
    try {
        const updatedBus = yield prisma.bus.update({
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
    }
    catch (error) {
        console.error("Error updating bus:", error);
        res.status(500).json({ success: false, message: "Failed to update bus" });
    }
});
exports.updateBus = updateBus;
// ✅ DELETE
const deleteBus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    try {
        yield prisma.bus.delete({ where: { id } });
        res
            .status(200)
            .json({ success: true, message: "Bus deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting bus:", error);
        res.status(500).json({ success: false, message: "Failed to delete bus" });
    }
});
exports.deleteBus = deleteBus;
const getBusSalaryAndFeeSummaryDetailed = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const standardSchoolFee = 28;
        const month = parseInt(req.query.month);
        const year = parseInt(req.query.year);
        if (isNaN(month) || isNaN(year)) {
            return res.status(400).json({
                success: false,
                message: "Month and year must be provided as query parameters.",
            });
        }
        const buses = yield prisma.bus.findMany({
            include: {
                driver: {
                    select: {
                        id: true,
                        fullName: true,
                        salary: true,
                        jobTitle: true,
                    },
                },
                students: {
                    where: {
                        isdeleted: false,
                    },
                    select: {
                        id: true,
                        fullname: true,
                        district: true,
                        fee: true,
                        StudentFee: {
                            where: { month, year },
                            select: {
                                id: true,
                                student_fee: true,
                                month: true,
                                year: true,
                                PaymentAllocation: {
                                    select: {
                                        amount: true,
                                        paymentId: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        let totalCollected = 0;
        let totalSalary = 0;
        let totalExpectedBusIncome = 0;
        const busSummaries = buses.map((bus) => {
            var _a;
            let busFeeCollected = 0;
            let expectedBusIncome = 0;
            const enrichedStudents = bus.students.map((student) => {
                const studentFeeRecord = student.StudentFee[0];
                const totalFee = (studentFeeRecord === null || studentFeeRecord === void 0 ? void 0 : studentFeeRecord.student_fee)
                    ? Number(studentFeeRecord.student_fee)
                    : Number(student.fee || 0);
                const schoolFee = totalFee < standardSchoolFee ? totalFee : standardSchoolFee;
                const expectedBusFee = totalFee - schoolFee;
                expectedBusIncome += expectedBusFee;
                // Sum of allocations for this exact studentFee record only
                const actualCollected = (studentFeeRecord === null || studentFeeRecord === void 0 ? void 0 : studentFeeRecord.PaymentAllocation.reduce((sum, alloc) => sum + Number(alloc.amount || 0), 0)) || 0;
                let actualBusFeeCollected = 0;
                if (actualCollected > schoolFee) {
                    actualBusFeeCollected = actualCollected - schoolFee;
                }
                else {
                    actualBusFeeCollected = 0;
                }
                busFeeCollected += actualBusFeeCollected;
                return {
                    id: student.id,
                    name: student.fullname,
                    district: student.district,
                    totalFee,
                    schoolFee,
                    expectedBusFee: +expectedBusFee.toFixed(2),
                    actualBusFeeCollected: +actualBusFeeCollected.toFixed(2),
                    unpaidBusFee: +(expectedBusFee - actualBusFeeCollected).toFixed(2),
                };
            });
            const salary = ((_a = bus.driver) === null || _a === void 0 ? void 0 : _a.salary) || 0;
            totalCollected += busFeeCollected;
            totalExpectedBusIncome += expectedBusIncome;
            totalSalary += salary;
            const profitOrLossAmount = +(busFeeCollected - salary).toFixed(2);
            const collectionGap = +(expectedBusIncome - busFeeCollected).toFixed(2);
            const status = profitOrLossAmount >= 0 ? "Profit" : "Shortage";
            return {
                busId: bus.id,
                name: bus.name,
                route: bus.route,
                plate: bus.plate,
                driver: bus.driver
                    ? {
                        id: bus.driver.id,
                        name: bus.driver.fullName,
                        salary,
                    }
                    : null,
                studentCount: enrichedStudents.length,
                totalBusFeeCollected: +busFeeCollected.toFixed(2),
                expectedBusIncome: +expectedBusIncome.toFixed(2),
                collectionGap,
                status,
                profitOrLossAmount,
                students: enrichedStudents,
            };
        });
        const totalBusFeeCollected = +totalCollected.toFixed(2);
        const expectedBusIncome = +totalExpectedBusIncome.toFixed(2);
        const busFeeCollectionGap = +(expectedBusIncome - totalCollected).toFixed(2);
        const totalBusSalary = +totalSalary.toFixed(2);
        const profitOrLoss = +(totalCollected - totalSalary).toFixed(2);
        res.status(200).json({
            success: true,
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
    }
    catch (error) {
        console.error("Error in getBusSalaryAndFeeSummaryDetailed:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load bus fee and salary summary.",
        });
    }
});
exports.getBusSalaryAndFeeSummaryDetailed = getBusSalaryAndFeeSummaryDetailed;
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
const getAllBusEmployees = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const busEmployees = yield prisma.employee.findMany({
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
    }
    catch (error) {
        console.error("Error fetching unused bus employees:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
exports.getAllBusEmployees = getAllBusEmployees;
