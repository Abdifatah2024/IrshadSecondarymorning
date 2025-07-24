// utils/generateAssetNumber.ts

export const generateAssetNumber = async (prisma: any): Promise<string> => {
  const now = new Date();
  const datePart = now.toISOString().split("T")[0].replace(/-/g, ""); // YYYYMMDD

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const count = await prisma.asset.count({
    where: {
      createdAt: {
        gte: todayStart,
      },
    },
  });

  const numberPart = String(count + 1).padStart(4, "0"); // e.g., 0001
  return `ASSET-${datePart}-${numberPart}`;
};
