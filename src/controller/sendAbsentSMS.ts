import { PrismaClient } from "@prisma/client";
import { sendTelesomSMS } from "../Utils/sendTelesomSMS";
const prisma = new PrismaClient();

export const sendAbsentMessagesForToday = async (): Promise<void> => {
  const today = new Date();
  const startOfDay = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

  const absentees = await prisma.attendance.findMany({
    where: {
      date: {
        gte: startOfDay,
        lt: endOfDay,
      },
      present: false,
    },
    include: {
      student: {
        select: {
          fullname: true,
          phone: true,
        },
      },
    },
  });

  const uniqueMessages = new Set<string>();

  for (const record of absentees) {
    const student = record.student;
    const dateStr = startOfDay.toISOString().split("T")[0];

    if (!student || !student.phone) continue;

    const message = `Dear parent, your child ${student.fullname} was absent on ${dateStr}. Reason: ${record.remark}`;

    const messageKey = `${student.phone}-${dateStr}`;
    if (uniqueMessages.has(messageKey)) continue; // prevent duplicate

    try {
      await sendTelesomSMS(student.phone, message);
      console.log(`SMS sent to ${student.fullname} (${student.phone})`);
      uniqueMessages.add(messageKey);
    } catch (err) {
      console.error(`Failed to send SMS to ${student.phone}:`, err);
    }
  }
};
