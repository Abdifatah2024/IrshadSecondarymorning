import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ✅ Grouped Vouchers by Month (e.g., "2025-07": [...])
export const listMonthlyVoucherGroups = async (req: Request, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { date: "asc" },
      include: {
        student: { select: { fullname: true } },
        user: { select: { fullName: true } },
        allocations: {
          include: {
            studentFee: {
              select: { month: true, year: true },
            },
          },
        },
      },
    });

    const grouped: Record<string, typeof payments> = {};

    for (const payment of payments) {
      const key = `${payment.date.getFullYear()}-${String(
        payment.date.getMonth() + 1
      ).padStart(2, "0")}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(payment);
    }

    res.status(200).json(grouped);
  } catch (err) {
    console.error("Group Vouchers Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ List All Vouchers
export const listVouchers = async (req: Request, res: Response) => {
  try {
    const vouchers = await prisma.payment.findMany({
      orderBy: { date: "desc" },
      include: {
        student: { select: { fullname: true } },
        user: { select: { fullName: true } },
        allocations: {
          include: {
            studentFee: {
              select: { month: true, year: true },
            },
          },
        },
      },
    });

    res.json(vouchers);
  } catch (err) {
    console.error("List Vouchers Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Get Voucher by ID
export const getVoucherById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const voucher = await prisma.payment.findUnique({
      where: { id: Number(id) },
      include: {
        student: { select: { fullname: true } },
        user: { select: { fullName: true } },
        allocations: {
          include: {
            studentFee: {
              select: { month: true, year: true },
            },
          },
        },
      },
    });

    if (!voucher) {
      return res.status(404).json({ message: "Voucher not found" });
    }

    res.json(voucher);
  } catch (err) {
    console.error("Get Voucher Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// export const updatePaymentVoucher = async (req: Request, res: Response) => {
//   const paymentId = parseInt(req.params.id);
//   const { amountPaid, discount, Description } = req.body;

//   if (isNaN(paymentId)) {
//     return res.status(400).json({ message: "Invalid payment ID" });
//   }

//   const parsedAmount = parseFloat(amountPaid);
//   const parsedDiscount = parseFloat(discount);

//   if (isNaN(parsedAmount) || parsedAmount <= 0) {
//     return res.status(400).json({ message: "Valid amountPaid is required" });
//   }

//   if (isNaN(parsedDiscount) || parsedDiscount < 0) {
//     return res.status(400).json({ message: "Discount must be zero or more" });
//   }

//   try {
//     const totalAmount = parsedAmount + parsedDiscount;

//     // Fetch the original payment with student and allocations
//     const payment = await prisma.payment.findUnique({
//       where: { id: paymentId },
//       include: {
//         student: true,
//         allocations: {
//           include: { studentFee: true },
//         },
//       },
//     });

//     if (!payment) {
//       return res.status(404).json({ message: "Payment not found" });
//     }

//     // ✅ Step 1: Update the payment
//     const updatedPayment = await prisma.payment.update({
//       where: { id: paymentId },
//       data: {
//         amountPaid: parsedAmount,
//         discount: parsedDiscount,
//         Description: Description ?? "",
//       },
//     });

//     // ✅ Step 2: Recalculate and update allocations
//     const allocations = payment.allocations;
//     const allocCount = allocations.length;

//     if (allocCount > 0) {
//       const newAmount = totalAmount / allocCount;

//       await Promise.all(
//         allocations.map((alloc) =>
//           prisma.paymentAllocation.update({
//             where: { id: alloc.id },
//             data: {
//               amount: newAmount,
//               studentId: payment.studentId, // ensure it's not lost
//             },
//           })
//         )
//       );
//     }

//     // ✅ Step 3: Update DiscountLog (only for current month/year)
//     const now = new Date();
//     const currentMonth = now.getMonth() + 1;
//     const currentYear = now.getFullYear();

//     await prisma.discountLog.updateMany({
//       where: {
//         studentId: payment.studentId,
//         month: currentMonth,
//         year: currentYear,
//       },
//       data: {
//         amount: parsedDiscount,
//         reason: Description ?? "Updated with payment",
//         verified: true,
//         verifiedAt: new Date(),
//         verifiedBy: "System",
//       },
//     });

//     return res.status(200).json({
//       message: "Payment, allocations, and discount log updated successfully",
//       updatedPayment,
//     });
//   } catch (error) {
//     console.error("Error updating payment:", error);
//     return res.status(500).json({ message: "Failed to update payment" });
//   }
// };

export const updatePaymentVoucher = async (req: Request, res: Response) => {
  const paymentId = parseInt(req.params.id);
  const { amountPaid, discount, Description } = req.body;

  if (isNaN(paymentId)) {
    return res.status(400).json({ message: "Invalid payment ID" });
  }

  const parsedAmount = parseFloat(amountPaid);
  const parsedDiscount = parseFloat(discount);

  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ message: "Valid amountPaid is required" });
  }

  if (isNaN(parsedDiscount) || parsedDiscount < 0) {
    return res.status(400).json({ message: "Discount must be zero or more" });
  }

  try {
    const totalAmount = parsedAmount + parsedDiscount;

    // Step 1: Get existing payment
    const existingPayment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!existingPayment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const studentId = existingPayment.studentId;

    // Step 2: Update payment record
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        amountPaid: parsedAmount,
        discount: parsedDiscount,
        Description: Description ?? existingPayment.Description,
      },
    });

    // Step 3: Delete previous allocations
    await prisma.paymentAllocation.deleteMany({
      where: { paymentId },
    });

    // ✅ Step 4: Reset previously paid fees (undo full payment effect)
    await prisma.studentFee.updateMany({
      where: {
        studentId,
        isPaid: true,
      },
      data: {
        isPaid: false,
      },
    });

    // Step 5: Recalculate allocations
    let remaining = totalAmount;

    const allFees = await prisma.studentFee.findMany({
      where: {
        studentId,
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    for (const fee of allFees) {
      if (remaining <= 0) break;

      const due = Number(fee.student_fee);
      const toAllocate = Math.min(remaining, due);

      await prisma.paymentAllocation.create({
        data: {
          paymentId,
          studentFeeId: fee.id,
          amount: toAllocate,
        },
      });

      remaining -= toAllocate;

      await prisma.studentFee.update({
        where: { id: fee.id },
        data: {
          isPaid: toAllocate === due,
        },
      });
    }

    // Step 6: Update DiscountLog for current month if exists
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    await prisma.discountLog.updateMany({
      where: {
        studentId,
        month: currentMonth,
        year: currentYear,
      },
      data: {
        amount: parsedDiscount,
        reason: Description ?? "Updated with voucher",
        verified: true,
        verifiedAt: new Date(),
        verifiedBy: "System",
      },
    });

    return res.status(200).json({
      message: "Payment updated and balance corrected",
      updatedPayment,
    });
  } catch (error) {
    console.error("Update payment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getLastPaymentForStudent = async (studentId: number) => {
  try {
    const lastPayment = await prisma.payment.findFirst({
      where: {
        studentId,
      },
      orderBy: {
        date: "desc",
      },
      include: {
        student: true,
        user: true,
        allocations: {
          include: {
            studentFee: true,
          },
        },
      },
    });

    return lastPayment;
  } catch (error) {
    console.error("Error fetching last payment:", error);
    throw new Error("Could not retrieve the last payment");
  }
};

export const fetchLastGlobalPayment = async (req: Request, res: Response) => {
  try {
    const payment = await prisma.payment.findFirst({
      orderBy: {
        date: "desc",
      },
      include: {
        student: {
          select: {
            id: true,
            fullname: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
        allocations: {
          select: {
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

    if (!payment) {
      return res.status(404).json({ message: "No payment found" });
    }

    res.status(200).json({ payment });
  } catch (error) {
    console.error("Error fetching last payment:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// controllers/studentController.ts

export const getNegativeFeeStudents = async (req: Request, res: Response) => {
  try {
    const students = await prisma.student.findMany({
      where: {
        fee: {
          lt: 0,
        },
        isdeleted: false,
      },
      select: {
        id: true,
        fullname: true,
        fee: true,
        classes: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        fullname: "asc",
      },
    });

    res.status(200).json({
      count: students.length,
      students: students.map((s) => ({
        id: s.id,
        fullname: s.fullname,
        fee: s.fee,
        className: s.classes?.name || "N/A",
      })),
    });
  } catch (error) {
    console.error("Error fetching students with negative fee:", error);
    res.status(500).json({ message: "Server error" });
  }
};
