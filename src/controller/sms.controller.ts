import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { sendTelesomSMS } from "../Utils/sendTelesomSMS";
const prisma = new PrismaClient();
import qs from "qs";
import axios from "axios";
export const sendSMSController = async (req: Request, res: Response) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res
      .status(400)
      .json({ message: "Both 'to' and 'message' are required." });
  }

  try {
    const response = await sendTelesomSMS(to, message);
    res.status(200).json({
      success: true,
      message: "SMS sent successfully",
      response,
    });
  } catch (error: any) {
    console.error("SMS Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to send SMS",
      error: error.message || "Unknown error",
    });
  }
};

interface AbsentStudent {
  fullname: string;
  phone: string;
  remark: string;
  date: string;
}

/**
 * 🔍 Fetch all students marked absent today
 */
export const getAbsentStudentsForToday = async (): Promise<AbsentStudent[]> => {
  const today = new Date();
  const startOfDay = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

  const records = await prisma.attendance.findMany({
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

  const result: AbsentStudent[] = records
    .filter((record) => record.student?.phone)
    .map((record) => ({
      fullname: record.student!.fullname,
      phone: record.student!.phone!,
      remark: record.remark || "Lama cayimin",
      date: startOfDay.toISOString().split("T")[0],
    }));

  return result;
};

export const sendSMS = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = {
      username: "cabdabdivy4mh2025",
      password: "jBiSRISG",
      mno: "00252634740303",
      sid: "Abdifatah",
      msg: "Hello World",
      mt: "0",
    };

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie:
        "ASPSESSIONIDACTQTSTS=GEAEKPFCNECDACOHHKHDONEB; ASPSESSIONIDCATTSSST=HFAGPIFCMLKJADCMIOHCLBKD",
    };

    const response = await axios.post(
      "https://api.1s2u.io/bulksms",
      qs.stringify(data),
      { headers }
    );

    res.status(200).send(response.data);
  } catch (error) {
    console.error("Error sending SMS:", error);
    res.status(500).json({ error: "Failed to send SMS" });
  }
};
