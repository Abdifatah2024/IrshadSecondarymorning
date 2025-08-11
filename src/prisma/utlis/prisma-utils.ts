// src/prisma/utils/prisma-utils.ts
import { PrismaClient, Prisma } from "@prisma/client";

/* -----------------------------------------------------------
   Prisma client singleton (safe for dev hot-reload & prod)
----------------------------------------------------------- */
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}
export const prisma: PrismaClient =
  global.__prisma__ ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "production"
        ? ["warn", "error"]
        : ["query", "warn", "error"],
  });

if (process.env.NODE_ENV !== "production") global.__prisma__ = prisma;

/* Handy alias for the tx type (what Prisma passes into $transaction callback) */
export type Tx = Prisma.TransactionClient;

/* -----------------------------------------------------------
   Decimal / Number helpers
----------------------------------------------------------- */
export const toNumber = (v: unknown): number => {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  // Prisma.Decimal or similar:
  if (typeof (v as any).toNumber === "function") return (v as any).toNumber();
  return 0;
};

export const toDecimal = (v: unknown): Prisma.Decimal => {
  // Always be explicit when writing money into DECIMAL columns
  const n = toNumber(v);
  return new Prisma.Decimal(n);
};

/** ✅ Fix: specify accumulator type for reduce so TS knows it's a number */
export const sumNumbers = (arr: unknown[]): number =>
  arr.reduce<number>((acc, x) => acc + toNumber(x), 0);

/* -----------------------------------------------------------
   Phone helpers
----------------------------------------------------------- */
export const uniquePhones = (
  phones?: (string | null | undefined)[]
): string[] => {
  if (!phones?.length) return [];
  const cleaned = phones.map((p) => (p ?? "").trim()).filter(Boolean);
  return Array.from(new Set(cleaned));
};

export const joinPhones = (phones?: (string | null | undefined)[]): string =>
  uniquePhones(phones).join(", ");

/* -----------------------------------------------------------
   Pagination helpers
----------------------------------------------------------- */
export const getPagination = (page?: number, pageSize?: number) => {
  const p = Math.max(1, Number(page || 1));
  const s = Math.min(200, Math.max(1, Number(pageSize || 20)));
  return { skip: (p - 1) * s, take: s };
};

export type PageResult<T> = {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};

export async function withPagination<T>(
  listPromise: Promise<T[]>,
  countPromise: Promise<number>,
  page = 1,
  pageSize = 20
): Promise<PageResult<T>> {
  const [data, total] = await Promise.all([listPromise, countPromise]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { data, meta: { page, pageSize, total, totalPages } };
}

/* -----------------------------------------------------------
   Transactions (incl. read-only)
   NOTE: Prisma exposes isolationLevel but not a read-only flag,
   so we SET it via raw SQL at the start of an interactive tx.
----------------------------------------------------------- */
export async function withTx<T>(
  fn: (tx: Tx) => Promise<T>,
  opts?: { isolationLevel?: Prisma.TransactionIsolationLevel }
): Promise<T> {
  return prisma.$transaction(async (tx) => fn(tx), {
    isolationLevel: opts?.isolationLevel ?? "ReadCommitted",
  });
}

// Run a block in a READ ONLY transaction (PostgreSQL)
export async function withReadOnly<T>(
  fn: (tx: Tx) => Promise<T>,
  isolation: Prisma.TransactionIsolationLevel = "ReadCommitted"
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`SET TRANSACTION READ ONLY`);
      return fn(tx);
    },
    { isolationLevel: isolation }
  );
}

/* -----------------------------------------------------------
   Case-insensitive search helpers
----------------------------------------------------------- */
export const ciContains = (value?: string) =>
  value && value.trim()
    ? { contains: value.trim(), mode: "insensitive" as const }
    : undefined;

export const ciStartsWith = (value?: string) =>
  value && value.trim()
    ? { startsWith: value.trim(), mode: "insensitive" as const }
    : undefined;

/* -----------------------------------------------------------
   Error helpers
----------------------------------------------------------- */
export const isPrismaKnownError = (
  e: unknown,
  code?: Prisma.PrismaClientKnownRequestError["code"]
): e is Prisma.PrismaClientKnownRequestError => {
  return !!(
    e &&
    typeof e === "object" &&
    "code" in (e as any) &&
    (!code || (e as any).code === code)
  );
};

export const isUniqueViolation = (e: unknown) => isPrismaKnownError(e, "P2002");

/* -----------------------------------------------------------
   StudentFee-specific helper:
   Use base Student.fee when monthly StudentFee.student_fee is NULL
----------------------------------------------------------- */
export function feeOrFallback(
  monthlyFee: unknown,
  studentBaseFee: unknown
): number {
  const m = toNumber(monthlyFee);
  if (m > 0) return m;
  return toNumber(studentBaseFee); // 0 or positive
}

/* Example usage in your controller:

// summing a student's unpaid fees with fallback
const balance = student.StudentFee.reduce((acc, fee) => {
  return acc + feeOrFallback(fee.student_fee, student.fee);
}, 0);

// shaping the API response consistently as number/string:
const unpaidFees = student.StudentFee.map((fee) => ({
  month: fee.month,
  year: fee.year,
  student_fee: feeOrFallback(fee.student_fee, student.fee), // number
}));

*/

/* -----------------------------------------------------------
   Small convenience: safe upsert wrapper (typed correctly)
   Pass a DELEGATE (e.g. prisma.studentFee or tx.studentFee)
----------------------------------------------------------- */
export async function safeUpsert<
  D extends { upsert: (args: any) => Promise<any> }
>(delegate: D, args: Parameters<D["upsert"]>[0]) {
  try {
    return await delegate.upsert(args as any);
  } catch (e) {
    if (isPrismaKnownError(e)) {
      // handle/log P2002 etc. if you want
      throw e;
    }
    throw e;
  }
}
