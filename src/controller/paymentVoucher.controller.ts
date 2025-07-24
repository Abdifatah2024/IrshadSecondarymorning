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

// ✅ Update Voucher — restricted to current month only
// export const updatePaymentVoucher = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { amountPaid, discount, Description } = req.body;

//     const parsedAmount = parseFloat(amountPaid);
//     const parsedDiscount = parseFloat(discount);

//     if (isNaN(parsedAmount) || parsedAmount <= 0) {
//       return res.status(400).json({ message: "Valid amountPaid is required" });
//     }

//     if (isNaN(parsedDiscount) || parsedDiscount < 0) {
//       return res.status(400).json({ message: "Discount must be zero or more" });
//     }

//     const payment = await prisma.payment.findUnique({
//       where: { id: Number(id) },
//     });

//     if (!payment) {
//       return res.status(404).json({ message: "Payment not found" });
//     }

//     const studentId = payment.studentId;

//     // ✅ Step 1: Update the payment record
//     const updatedPayment = await prisma.payment.update({
//       where: { id: Number(id) },
//       data: {
//         amountPaid: parsedAmount,
//         discount: parsedDiscount,
//         Description: Description ?? payment.Description,
//       },
//     });

//     // ✅ Step 2: Delete old allocations
//     await prisma.paymentAllocation.deleteMany({
//       where: { paymentId: Number(id) },
//     });

//     let remaining = parsedAmount;

//     // ✅ Step 3: Get unpaid student fees (ordered by year/month)
//     const unpaidFees = await prisma.studentFee.findMany({
//       where: {
//         studentId,
//         isPaid: false,
//       },
//       orderBy: [{ year: "asc" }, { month: "asc" }],
//     });

//     for (const fee of unpaidFees) {
//       if (remaining <= 0) break;

//       const due = Number(fee.student_fee);
//       const toAllocate = Math.min(due, remaining);

//       await prisma.paymentAllocation.create({
//         data: {
//           paymentId: Number(id),
//           studentFeeId: fee.id,
//           amount: toAllocate,
//         },
//       });

//       remaining -= toAllocate;

//       await prisma.studentFee.update({
//         where: { id: fee.id },
//         data: {
//           isPaid: toAllocate === due,
//         },
//       });
//     }

//     // ✅ Step 4: Update DiscountLog for current month if exists
//     const now = new Date();
//     const currentMonth = now.getMonth() + 1;
//     const currentYear = now.getFullYear();

//     await prisma.discountLog.updateMany({
//       where: {
//         studentId,
//         month: currentMonth,
//         year: currentYear,
//       },
//       data: {
//         amount: parsedDiscount,
//         reason: Description ?? "Updated with voucher",
//         verified: true,
//         verifiedAt: new Date(),
//         verifiedBy: "System",
//       },
//     });

//     res.status(200).json({
//       message: "Payment, allocations, and discount log updated successfully",
//       updatedPayment,
//     });
//   } catch (error) {
//     console.error("Update payment error:", error);
//     res.status(500).json({ message: "Internal server error" });
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

    // Fetch the original payment with student and allocations
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        student: true,
        allocations: {
          include: { studentFee: true },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // ✅ Step 1: Update the payment
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        amountPaid: parsedAmount,
        discount: parsedDiscount,
        Description: Description ?? "",
      },
    });

    // ✅ Step 2: Recalculate and update allocations
    const allocations = payment.allocations;
    const allocCount = allocations.length;

    if (allocCount > 0) {
      const newAmount = totalAmount / allocCount;

      await Promise.all(
        allocations.map((alloc) =>
          prisma.paymentAllocation.update({
            where: { id: alloc.id },
            data: {
              amount: newAmount,
              studentId: payment.studentId, // ensure it's not lost
            },
          })
        )
      );
    }

    // ✅ Step 3: Update DiscountLog (only for current month/year)
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    await prisma.discountLog.updateMany({
      where: {
        studentId: payment.studentId,
        month: currentMonth,
        year: currentYear,
      },
      data: {
        amount: parsedDiscount,
        reason: Description ?? "Updated with payment",
        verified: true,
        verifiedAt: new Date(),
        verifiedBy: "System",
      },
    });

    return res.status(200).json({
      message: "Payment, allocations, and discount log updated successfully",
      updatedPayment,
    });
  } catch (error) {
    console.error("Error updating payment:", error);
    return res.status(500).json({ message: "Failed to update payment" });
  }
};
