type AmountOnly = { amount: number | string };

export async function getMonthlyFinancialStatus(
  month: number,
  year: number,
  prisma: any
) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // 1. Get Total Income (from payment.amountPaid)
  const payments: { amountPaid: any }[] = await prisma.payment.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      amountPaid: true,
    },
  });

  const totalIncome = payments.reduce((sum, p) => {
    return sum + Number(p.amountPaid || 0);
  }, 0);

  // 2. Get Total Advances
  const advances: AmountOnly[] = await prisma.employeeAdvance.findMany({
    where: { month, year },
    select: { amount: true },
  });

  const totalAdvance = advances.reduce((sum, adv) => {
    return sum + Number(adv.amount);
  }, 0);

  // 3. Get Total Expenses
  const expenses: AmountOnly[] = await prisma.expense.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: { amount: true },
  });

  const totalExpense = expenses.reduce((sum, exp) => {
    return sum + Number(exp.amount);
  }, 0);

  // 4. Compute remaining
  const used = totalAdvance + totalExpense;
  const remaining = totalIncome - used;

  return {
    totalIncome,
    totalAdvance,
    totalExpense,
    used,
    remaining,
  };
}
