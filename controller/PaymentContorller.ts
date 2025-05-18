import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
const prisma = new PrismaClient();

// POST /api/payment

export const createStudentPayment = async (req: Request, res: Response) => {
  try {
    const { studentId, amountPaid, discount, discountReason = "" } = req.body;

    if (!studentId || amountPaid === undefined) {
      return res.status(400).json({
        message: "studentId and amountPaid are required",
      });
    }

    if (Number(discount) < 0) {
      return res.status(400).json({
        message: "Discount cannot be negative",
      });
    }

    // @ts-ignore
    const user = req.user;

    await prisma.$transaction(async (prisma) => {
      // 1. Fetch student and unpaid fees
      const student = await prisma.student.findUnique({
        where: { id: +studentId },
        include: {
          StudentFee: {
            where: { isPaid: false },
            orderBy: [{ year: "asc" }, { month: "asc" }],
          },
        },
      });

      if (!student) {
        throw new Error("Student not found");
      }

      const feeAmount = Number(student.fee);

      // 2. Get previous carry forward balance
      const previousAccount = await prisma.studentAccount.findUnique({
        where: { studentId: +studentId },
      });
      const previousCarryForward = Number(previousAccount?.carryForward || 0);

      // 3. Fetch existing allocations in bulk
      const allocationSums = await prisma.paymentAllocation.groupBy({
        by: ["studentFeeId"],
        where: {
          studentFeeId: { in: student.StudentFee.map((f) => f.id) },
        },
        _sum: { amount: true },
      });

      const paidMap = new Map(
        allocationSums.map((a) => [a.studentFeeId, Number(a._sum.amount || 0)])
      );

      // 4. Begin allocation
      let availableAmount = Number(amountPaid) + previousCarryForward;
      let remainingDiscount = Number(discount);

      const allocations: { studentFeeId: number; amount: number }[] = [];
      const discountRecords: {
        studentFeeId: number;
        studentId: number;
        amount: number;
        reason: string;
        month: number;
        year: number;
        approvedBy: number;
      }[] = [];

      const detailedAllocations: {
        studentFeeId: number;
        total: number;
        paid: number;
        discount: number;
      }[] = [];

      for (const feeRecord of student.StudentFee) {
        if (availableAmount <= 0 && remainingDiscount <= 0) break;

        const paidSoFar = paidMap.get(feeRecord.id) || 0;
        const due = feeAmount - paidSoFar;

        // Apply discount
        const discountToApply = Math.min(remainingDiscount, due);
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

        // Apply cash payment
        const paymentToApply = Math.min(due - discountToApply, availableAmount);
        availableAmount -= paymentToApply;

        const totalPayment = discountToApply + paymentToApply;

        if (totalPayment > 0) {
          allocations.push({
            studentFeeId: feeRecord.id,
            amount: totalPayment,
          });

          detailedAllocations.push({
            studentFeeId: feeRecord.id,
            total: totalPayment,
            paid: paymentToApply,
            discount: discountToApply,
          });

          if (paidSoFar + totalPayment >= feeAmount) {
            await prisma.studentFee.update({
              where: { id: feeRecord.id },
              data: { isPaid: true },
            });
          }
        }
      }

      // 5. Create payment record
      const newPayment = await prisma.payment.create({
        data: {
          studentId: +studentId,
          userId: user.useId,
          amountPaid: Number(amountPaid),
          discount: Number(discount),
          allocations: {
            create: allocations,
          },
        },
      });

      // 6. Create discount logs
      if (discountRecords.length > 0) {
        await prisma.discountLog.createMany({
          data: discountRecords,
        });
      }

      // 7. Save carry forward
      await prisma.studentAccount.upsert({
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
        carryForward: availableAmount,
        allocations: detailedAllocations,
        appliedDiscounts: discountRecords,
      });
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({
      message: "Internal server error while processing payment",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// POST /api/generate-monthly-fees
export const generateMonthlyFees = async (req: Request, res: Response) => {
  try {
    // Get current month and year
    const today = new Date();
    const month = today.getMonth() + 1; // getMonth is 0-based
    const year = today.getFullYear();

    // Fetch all active, non-deleted students
    const students = await prisma.student.findMany({
      where: { isdeleted: false, status: "ACTIVE" },
      select: { id: true },
    });

    const newFees = [];

    for (const student of students) {
      const existingFee = await prisma.studentFee.findFirst({
        where: {
          studentId: student.id,
          month,
          year,
        },
      });

      if (!existingFee) {
        newFees.push({
          studentId: student.id,
          month,
          year,
          isPaid: false,
        });
      }
    }

    if (newFees.length === 0) {
      return res.status(200).json({ message: "No new fee records needed." });
    }

    // Bulk create new fee records
    await prisma.studentFee.createMany({
      data: newFees,
    });

    res.status(201).json({
      message: `${newFees.length} monthly fee records created for ${month}/${year}`,
    });
  } catch (error) {
    console.error("Error generating monthly fees:", error);
    res.status(500).json({ message: "Server error while generating fees" });
  }
};
// GET /api/students/:id/fees

export const getStudentFees = async (req: Request, res: Response) => {
  try {
    const studentId = Number(req.params.id);

    if (!studentId) {
      return res.status(400).json({ message: "Student ID is required" });
    }

    const student = await prisma.student.findUnique({
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
      const totalPaid = fee.PaymentAllocation.reduce(
        (sum, alloc) => sum + Number(alloc.amount),
        0
      );

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
  } catch (error) {
    console.error("Error fetching student fees:", error);
    res
      .status(500)
      .json({ message: "Internal server error while fetching student fees" });
  }
};
// GET /api/payment/:studentId/history
export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const studentId = Number(req.params.studentId);

    const payments = await prisma.payment.findMany({
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
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({ message: "Error fetching payment history" });
  }
};

// GET /api/students/:id/balance
export const getStudentBalanceSummary = async (req: Request, res: Response) => {
  try {
    const studentId = Number(req.params.id);

    const student = await prisma.student.findFirst({
      where: { id: studentId, isdeleted: false },
      include: {
        StudentFee: true,
        StudentAccount: true,
      },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const feeAmount = Number(student.fee);
    const unpaidFees = student.StudentFee.filter((fee) => !fee.isPaid);
    const unpaidAmount = unpaidFees.length * feeAmount;

    const paidAllocations = await prisma.paymentAllocation.aggregate({
      where: {
        studentFeeId: {
          in: student.StudentFee.map((f) => f.id),
        },
      },
      _sum: {
        amount: true,
      },
    });

    const totalPaid = Number(paidAllocations._sum.amount || 0);
    const carryForward = Number(student.StudentAccount?.carryForward || 0);

    // ✅ Prevent negative dueAmount
    const dueAmount = Math.max(0, unpaidAmount - totalPaid);

    res.status(200).json({
      studentId: student.id,
      name: student.fullname,
      totalPaid,
      unpaidMonths: unpaidFees.length,
      dueAmount,
      carryForward,
    });
  } catch (error) {
    console.error("Error fetching student balance:", error);
    res.status(500).json({ message: "Error fetching student balance" });
  }
};

// GET /api/payment/:id/allocations
export const getAllocationsByPayment = async (req: Request, res: Response) => {
  try {
    const paymentId = Number(req.params.id);

    const allocations = await prisma.paymentAllocation.findMany({
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
  } catch (error) {
    console.error("Error fetching allocations by payment:", error);
    res.status(500).json({ message: "Error retrieving payment allocations" });
  }
};

// GET /api/payment-allocations
export const getAllPaymentAllocations = async (
  _req: Request,
  res: Response
) => {
  try {
    const allocations = await prisma.paymentAllocation.findMany({
      include: {
        payment: {
          select: {
            id: true,
            amountPaid: true,
            discount: true,
            date: true,
          },
        },
        studentFee: {
          select: {
            id: true,
            month: true,
            year: true,
            isPaid: true,
          },
        },
        Student: {
          select: {
            id: true,
            fullname: true,
          },
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    res.status(200).json(allocations);
  } catch (error) {
    console.error("Error fetching payment allocations:", error);
    res
      .status(500)
      .json({ message: "Internal server error fetching allocations" });
  }
};

// GET /api/admin/fee-inconsistencies
export const getFeeInconsistencies = async (req: Request, res: Response) => {
  try {
    // Get all students with their fee records and payment allocations
    const students = await prisma.student.findMany({
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
        const paid = fee.PaymentAllocation.reduce(
          (sum, alloc) => sum + Number(alloc.amount),
          0
        );

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
        } else if (!fee.isPaid && paid >= expectedMonthlyFee) {
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
      const paymentSum = await prisma.payment.aggregate({
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
      const systemCarryForward = Number(
        student.StudentAccount?.carryForward || 0
      );
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
        unmarkedPaid: inconsistencies.filter(
          (i) => i.type === "UNMARKED_PAID_FEE"
        ).length,
        accountMismatches: inconsistencies.filter(
          (i) => i.type === "ACCOUNT_MISMATCH"
        ).length,
      },
    });
  } catch (error) {
    console.error("Error fetching fee inconsistencies:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

interface VerifyDiscountRequest {
  studentId: number;
  month: number;
  year: number;
  verifiedBy: string; // Email or ID of staff who verified
}

export const verifyDiscount = async (req: Request, res: Response) => {
  try {
    const { studentId, month, year, verifiedBy }: VerifyDiscountRequest =
      req.body;

    // Validate input
    if (!studentId || !month || !year || !verifiedBy) {
      return res.status(400).json({
        error: "studentId, month, year, and verifiedBy are required",
      });
    }

    // Verify the discount exists
    const existingDiscounts = await prisma.discountLog.findMany({
      where: {
        studentId,
        month,
        year,
        verified: false,
      },
    });

    if (existingDiscounts.length === 0) {
      return res.status(404).json({
        error:
          "No unverified discount records found for this student and period",
      });
    }

    // Update verification status
    await prisma.discountLog.updateMany({
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
  } catch (error) {
    console.error("Error verifying discount:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

//get Student Discount

export const listDiscounts = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({
        error: "studentId is required in the request body",
      });
    }

    const discounts = await prisma.discountLog.findMany({
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
  } catch (error) {
    console.error("Error listing discounts:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getStudentsWithUnpaidFeesOrBalance = async (
  _req: Request,
  res: Response
) => {
  try {
    const students = await prisma.student.findMany({
      where: {
        isdeleted: false,
        status: "ACTIVE",
      },
      include: {
        StudentFee: true,
        StudentAccount: true,
      },
    });

    const studentsWithBalance = [];

    for (const student of students) {
      const feeAmount = Number(student.fee);
      const unpaidFees = student.StudentFee.filter((fee) => !fee.isPaid);
      const unpaidAmount = unpaidFees.length * feeAmount;

      const paidAllocations = await prisma.paymentAllocation.aggregate({
        where: {
          studentFeeId: {
            in: student.StudentFee.map((f) => f.id),
          },
        },
        _sum: {
          amount: true,
        },
      });

      const totalPaid = Number(paidAllocations._sum.amount || 0);
      const carryForward = Number(student.StudentAccount?.carryForward || 0);
      const totalAvailable = totalPaid + carryForward;
      const balanceDue = Math.max(0, unpaidAmount - totalAvailable);

      if (unpaidFees.length > 0 || balanceDue > 0) {
        studentsWithBalance.push({
          studentId: student.id,
          name: student.fullname,
          unpaidMonths: unpaidFees.length,
          unpaidAmount,
          totalPaid,
          carryForward,
          balanceDue,
        });
      }
    }

    res.status(200).json({
      count: studentsWithBalance.length,
      students: studentsWithBalance,
    });
  } catch (error) {
    console.error("Error fetching students with balance:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
