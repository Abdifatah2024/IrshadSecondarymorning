import { PrismaClient, Role, User } from "@prisma/client";
import { Request, Response } from "express";
const prisma = new PrismaClient();

// export const createEmployeeAdvanceAndUpdateIncome = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const { amount, reason, month, year } = req.body;
//     const employeeId = Number(req.params.id);
//     //@ts-ignore
//     const user = req.user as { useId: number };

//     if (!employeeId || !amount || !month || !year) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     await prisma.$transaction(async (tx) => {
//       const startDate = new Date(year, month - 1, 1);
//       const endDate = new Date(year, month, 0, 23, 59, 59, 999);

//       // ✅ 1. Get total income from Payment.amountPaid
//       const payments = await tx.payment.findMany({
//         where: {
//           date: {
//             gte: startDate,
//             lte: endDate,
//           },
//         },
//         select: { amountPaid: true },
//       });

//       const totalIncome = payments.reduce(
//         (sum, p) => sum + Number(p.amountPaid),
//         0
//       );

//       // 2. Get total advances for the month
//       const existingAdvances = await tx.employeeAdvance.findMany({
//         where: { month, year },
//         select: { amount: true },
//       });

//       const totalAdvance = existingAdvances.reduce(
//         (sum, adv) => sum + Number(adv.amount),
//         0
//       );

//       // 3. Get total expenses for the month
//       const expenses = await tx.expense.findMany({
//         where: {
//           date: {
//             gte: startDate,
//             lte: endDate,
//           },
//         },
//         select: { amount: true },
//       });

//       const totalExpense = expenses.reduce(
//         (sum, exp) => sum + Number(exp.amount),
//         0
//       );

//       const alreadyUsed = totalAdvance + totalExpense;
//       const remainingIncome = totalIncome - alreadyUsed;

//       if (Number(amount) > remainingIncome) {
//         return res.status(400).json({
//           message: `Advance denied. Remaining income: $${remainingIncome}, requested: $${amount}`,
//           breakdown: {
//             totalIncome,
//             totalAdvance,
//             totalExpense,
//             alreadyUsed,
//             remainingIncome,
//           },
//         });
//       }

//       // ✅ 4. Check employee's salary and enforce 40% limit
//       const employee = await tx.employee.findUnique({
//         where: { id: employeeId },
//         select: { salary: true },
//       });

//       if (!employee || !employee.salary) {
//         return res
//           .status(404)
//           .json({ message: "Employee not found or salary missing" });
//       }

//       const maxAllowedAdvance = employee.salary * 0.4;

//       // Get total advances for this employee in the given month/year
//       const employeeAdvances = await tx.employeeAdvance.findMany({
//         where: {
//           employeeId,
//           month,
//           year,
//         },
//         select: { amount: true },
//       });

//       const employeeTotalAdvance = employeeAdvances.reduce(
//         (sum, adv) => sum + Number(adv.amount),
//         0
//       );

//       if (employeeTotalAdvance + Number(amount) > maxAllowedAdvance) {
//         return res.status(400).json({
//           message: `Advance denied. Maximum allowed is 40% of salary: $${maxAllowedAdvance}. Already taken: $${employeeTotalAdvance}`,
//           breakdown: {
//             salary: employee.salary,
//             maxAllowedAdvance,
//             alreadyTaken: employeeTotalAdvance,
//             requested: amount,
//           },
//         });
//       }

//       // ✅ 5. Create the advance
//       const advance = await tx.employeeAdvance.create({
//         data: {
//           employeeId,
//           amount,
//           reason,
//           month,
//           year,
//           createdById: user.useId,
//         },
//       });

//       const updatedTotalAdvance = totalAdvance + Number(amount);
//       const updatedUsed = updatedTotalAdvance + totalExpense;
//       const updatedRemaining = totalIncome - updatedUsed;

//       res.status(201).json({
//         message: "Advance recorded successfully",
//         advance,
//         financialSummary: {
//           totalIncome,
//           totalAdvance: updatedTotalAdvance,
//           totalExpense,
//           used: updatedUsed,
//           remaining: updatedRemaining,
//         },
//       });
//     });
//   } catch (error) {
//     console.error("Error creating advance:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };
export const createEmployeeAdvanceAndUpdateIncome = async (
  req: Request,
  res: Response
) => {
  try {
    const { amount, reason, month, year } = req.body;
    const employeeId = Number(req.params.id);

    // @ts-ignore
    const user = req.user as { useId: number };

    if (!employeeId || !amount || !month || !year) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ NEW: Only allow current month and year
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (Number(month) !== currentMonth || Number(year) !== currentYear) {
      return res.status(400).json({
        message: "You can only record advances for the current month and year.",
        currentMonth,
        currentYear,
        attempted: { month, year },
      });
    }

    await prisma.$transaction(async (tx) => {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      // ✅ 1. Get total income from Payment.amountPaid
      const payments = await tx.payment.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: { amountPaid: true },
      });

      const totalIncome = payments.reduce(
        (sum, p) => sum + Number(p.amountPaid),
        0
      );

      // 2. Get total advances for the month
      const existingAdvances = await tx.employeeAdvance.findMany({
        where: { month, year },
        select: { amount: true },
      });

      const totalAdvance = existingAdvances.reduce(
        (sum, adv) => sum + Number(adv.amount),
        0
      );

      // 3. Get total expenses for the month
      const expenses = await tx.expense.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: { amount: true },
      });

      const totalExpense = expenses.reduce(
        (sum, exp) => sum + Number(exp.amount),
        0
      );

      const alreadyUsed = totalAdvance + totalExpense;
      const remainingIncome = totalIncome - alreadyUsed;

      if (Number(amount) > remainingIncome) {
        return res.status(400).json({
          message: `Advance denied. Remaining income: $${remainingIncome}, requested: $${amount}`,
          breakdown: {
            totalIncome,
            totalAdvance,
            totalExpense,
            alreadyUsed,
            remainingIncome,
          },
        });
      }

      // ✅ 4. Check employee's salary and enforce 40% limit
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: { salary: true },
      });

      if (!employee || !employee.salary) {
        return res
          .status(404)
          .json({ message: "Employee not found or salary missing" });
      }

      const maxAllowedAdvance = employee.salary * 0.4;

      // Get total advances for this employee in the given month/year
      const employeeAdvances = await tx.employeeAdvance.findMany({
        where: {
          employeeId,
          month,
          year,
        },
        select: { amount: true },
      });

      const employeeTotalAdvance = employeeAdvances.reduce(
        (sum, adv) => sum + Number(adv.amount),
        0
      );

      if (employeeTotalAdvance + Number(amount) > maxAllowedAdvance) {
        return res.status(400).json({
          message: `Advance denied. Maximum allowed is 40% of salary: $${maxAllowedAdvance}. Already taken: $${employeeTotalAdvance}`,
          breakdown: {
            salary: employee.salary,
            maxAllowedAdvance,
            alreadyTaken: employeeTotalAdvance,
            requested: amount,
          },
        });
      }

      // ✅ 5. Create the advance
      const advance = await tx.employeeAdvance.create({
        data: {
          employeeId,
          amount,
          reason,
          month,
          year,
          createdById: user.useId,
        },
        include: {
          employee: {
            select: {
              fullName: true,
              phone: true,
            },
          },
          createdBy: {
            select: {
              fullName: true,
            },
          },
        },
      });

      const updatedTotalAdvance = totalAdvance + Number(amount);
      const updatedUsed = updatedTotalAdvance + totalExpense;
      const updatedRemaining = totalIncome - updatedUsed;

      res.status(201).json({
        message: "Advance recorded successfully",
        advance,
        financialSummary: {
          totalIncome,
          totalAdvance: updatedTotalAdvance,
          totalExpense,
          used: updatedUsed,
          remaining: updatedRemaining,
        },
      });
    });
  } catch (error) {
    console.error("Error creating advance:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getEmployeeAdvances = async (req: Request, res: Response) => {
  try {
    const employeeId = req.query.employeeId
      ? Number(req.query.employeeId)
      : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (month) where.month = month;
    if (year) where.year = year;

    const advances = await prisma.employeeAdvance.findMany({
      where,
      orderBy: { dateIssued: "desc" },
      include: {
        employee: {
          select: { fullName: true, phone: true },
        },
        createdBy: {
          select: { fullName: true },
        },
      },
    });

    const totalAdvance = advances.reduce((sum, a) => sum + a.amount, 0);

    const summary1 = {
      totalAdvance,
      advancesBy: advances.length > 0 ? advances[0].createdBy.fullName : null,
      employee:
        advances.length > 0
          ? {
              name: advances[0].employee.fullName,
              phone: advances[0].employee.phone,
            }
          : null,
    };

    res.status(200).json({
      count: advances.length,
      filters: { employeeId, month, year },
      summary1,
      advances,
    });
  } catch (error) {
    console.error("Error fetching employee advances:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMonthlyIncomeOverview = async (req: Request, res: Response) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);

    if (!month || !year) {
      return res.status(400).json({ message: "month and year are required" });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Step 1: Allocations
    const allocations = await prisma.paymentAllocation.findMany({
      where: {
        payment: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        payment: true,
        studentFee: {
          select: {
            month: true,
            year: true,
          },
        },
      },
    });

    let lateIncome = 0;
    let currentIncome = 0;
    let advanceIncome = 0;

    for (const alloc of allocations) {
      const amt = Number(alloc.amount);
      const m = alloc.studentFee.month;
      const y = alloc.studentFee.year;

      if (y < year || (y === year && m < month)) lateIncome += amt;
      else if (y === year && m === month) currentIncome += amt;
      else advanceIncome += amt;
    }

    const totalIncome = lateIncome + currentIncome + advanceIncome;

    // Step 2: Discounts
    const payments = await prisma.payment.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { discount: true },
    });

    const totalDiscount = payments.reduce(
      (sum, p) => sum + Number(p.discount),
      0
    );

    // Step 3: Expected income
    const unpaid = await prisma.studentFee.findMany({
      where: {
        isPaid: false,
        OR: [{ year: { lt: year } }, { year, month: { lte: month } }],
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

    const expectedIncome = unpaid.reduce((sum, fee) => {
      const paid = fee.PaymentAllocation.reduce(
        (s, a) => s + Number(a.amount),
        0
      );
      const required = Number(fee.student.fee);
      return sum + Math.max(0, required - paid);
    }, 0);

    // Step 4: Employee advances
    const advances = await prisma.employeeAdvance.findMany({
      where: { month, year },
    });

    const totalEmployeeAdvance = advances.reduce(
      (sum, adv) => sum + Number(adv.amount),
      0
    );

    const netIncome = totalIncome - totalEmployeeAdvance;

    // ✅ Include summary object
    res.status(200).json({
      month,
      year,
      breakdown: {
        lateIncome,
        currentIncome,
        advanceIncome,
        totalIncome,
        totalDiscount,
        totalEmployeeAdvance,
        netIncome,
        expectedIncome,
      },
      summary: {
        totalIncome,
        totalAdvance: totalEmployeeAdvance,
        netIncome,
        note: `Total income ($${totalIncome}) minus advances ($${totalEmployeeAdvance}) = Net income ($${netIncome})`,
      },
      message: `Net income for ${month}/${year} is $${netIncome}`,
    });
  } catch (error) {
    console.error("Error in getMonthlyIncomeOverview:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateEmployeeAdvance = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { amount, reason } = req.body;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    const existing = await prisma.employeeAdvance.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Advance not found" });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: existing.employeeId },
      select: { salary: true },
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const totalForMonth = await prisma.employeeAdvance.aggregate({
      where: {
        employeeId: existing.employeeId,
        month: existing.month,
        year: existing.year,
        NOT: { id }, // exclude current record
      },
      _sum: { amount: true },
    });

    const newTotal = Number(totalForMonth._sum.amount || 0) + Number(amount);

    if (newTotal > employee.salary) {
      return res.status(400).json({
        message: `Advance exceeds monthly salary. Allowed: ${employee.salary}, Requested total: ${newTotal}`,
      });
    }

    const updated = await prisma.employeeAdvance.update({
      where: { id },
      data: {
        amount: Number(amount),
        reason,
      },
    });

    res.status(200).json({
      message: "Advance updated successfully",
      updated,
    });
  } catch (error) {
    console.error("Error updating advance:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const deleteEmployeeAdvance = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const existing = await prisma.employeeAdvance.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Advance not found" });
    }

    await prisma.employeeAdvance.delete({ where: { id } });

    res.status(200).json({
      message: "Advance deleted successfully",
      deletedId: id,
    });
  } catch (error) {
    console.error("Error deleting advance:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getEmployeeSalaryAdvanceBalance = async (
  req: Request,
  res: Response
) => {
  try {
    const employeeId = req.query.employeeId
      ? Number(req.query.employeeId)
      : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;

    if (!employeeId || !month || !year) {
      return res
        .status(400)
        .json({ message: "employeeId, month, and year are required" });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { fullName: true, salary: true },
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const advances = await prisma.employeeAdvance.findMany({
      where: { employeeId, month, year },
      select: { amount: true },
    });

    const totalAdvance = advances.reduce((sum, a) => sum + Number(a.amount), 0);
    const remainingBalance = employee.salary - totalAdvance;
    const percentUsed = (totalAdvance / employee.salary) * 100;

    return res.status(200).json({
      employeeId,
      name: employee.fullName,
      salary: employee.salary,
      totalAdvance,
      remainingBalance,
      percentUsed: percentUsed.toFixed(2) + "%",
      month,
      year,
    });
  } catch (error) {
    console.error("Error in getEmployeeSalaryAdvanceBalance:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllEmployeesAdnace = async (req: Request, res: Response) => {
  try {
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;

    const employees = await prisma.employee.findMany({
      // where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        phone: true,
        salary: true,
        dateOfHire: true,
      },
    });

    if (!month || !year) {
      // If no month/year, return just employees
      return res.status(200).json({
        count: employees.length,
        employees,
      });
    }

    // With month/year: fetch advance data
    const allEmployeeData = await Promise.all(
      employees.map(async (emp) => {
        const advances = await prisma.employeeAdvance.findMany({
          where: {
            employeeId: emp.id,
            month,
            year,
          },
          select: {
            amount: true,
          },
        });

        const totalAdvance = advances.reduce(
          (sum, a) => sum + Number(a.amount),
          0
        );
        const remainingBalance = emp.salary - totalAdvance;

        return {
          ...emp,
          totalAdvance,
          remainingBalance,
        };
      })
    );

    return res.status(200).json({
      count: allEmployeeData.length,
      month,
      year,
      employees: allEmployeeData,
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getEmployeeAdvancesDetail = async (
  req: Request,
  res: Response
) => {
  try {
    const employeeId = req.query.employeeId
      ? Number(req.query.employeeId)
      : undefined;
    const employeeName = req.query.employeeName?.toString().toLowerCase();
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;

    const where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (month) where.month = month;
    if (year) where.year = year;

    // If name is given (and no ID), search by name
    if (!employeeId && employeeName) {
      where.employee = {
        fullName: {
          contains: employeeName,
          mode: "insensitive",
        },
      };
    }

    const advances = await prisma.employeeAdvance.findMany({
      where,
      orderBy: { dateIssued: "desc" },
      include: {
        employee: {
          select: { fullName: true, phone: true },
        },
        createdBy: {
          select: { fullName: true },
        },
      },
    });

    const totalAdvance = advances.reduce((sum, a) => sum + a.amount, 0);

    const summary1 = {
      totalAdvance,
      advancesBy: advances.length > 0 ? advances[0].createdBy.fullName : null,
      employee:
        advances.length > 0
          ? {
              name: advances[0].employee.fullName,
              phone: advances[0].employee.phone,
            }
          : null,
    };

    res.status(200).json({
      count: advances.length,
      filters: { employeeId, employeeName, month, year },
      summary1,
      advances,
    });
  } catch (error) {
    console.error("Error fetching employee advances:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const payAllEmployeesRemainingSalary = async (
  req: Request,
  res: Response
) => {
  try {
    const { month, year } = req.body;

    // @ts-ignore
    const user = req.user as { useId: number };

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required" });
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (month !== currentMonth || year !== currentYear) {
      return res.status(400).json({
        message: "You can only pay salaries for the current month and year.",
        currentMonth,
        currentYear,
        attempted: { month, year },
      });
    }

    const employees = await prisma.employee.findMany({
      select: { id: true, fullName: true, salary: true, phone: true },
    });

    const results: any[] = [];

    await prisma.$transaction(async (tx) => {
      for (const emp of employees) {
        const advances = await tx.employeeAdvance.findMany({
          where: { employeeId: emp.id, month, year },
          select: { amount: true },
        });

        const totalAdvance = advances.reduce(
          (sum, adv) => sum + Number(adv.amount),
          0
        );

        const remainingSalary = emp.salary - totalAdvance;

        if (remainingSalary <= 0) {
          results.push({
            employeeId: emp.id,
            name: emp.fullName,
            message: "Salary already paid or fully covered by advances",
            salary: emp.salary,
            totalAdvance,
            remainingSalary: 0,
          });
          continue;
        }

        const payment = await tx.employeeAdvance.create({
          data: {
            employeeId: emp.id,
            amount: remainingSalary,
            reason: "Salary",
            month,
            year,
            createdById: user.useId,
          },
        });

        results.push({
          employeeId: emp.id,
          name: emp.fullName,
          salary: emp.salary,
          totalAdvance,
          remainingSalary,
          message: "Salary paid",
          recordId: payment.id,
        });
      }
    });

    return res.status(200).json({
      message: "Salary processing completed",
      month,
      year,
      results,
    });
  } catch (error) {
    console.error("Error paying all salaries:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
