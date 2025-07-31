"use strict";
// utils/generateAssetNumber.ts
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
exports.generateAssetNumber = void 0;
const generateAssetNumber = (prisma) => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const datePart = now.toISOString().split("T")[0].replace(/-/g, ""); // YYYYMMDD
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const count = yield prisma.asset.count({
        where: {
            createdAt: {
                gte: todayStart,
            },
        },
    });
    const numberPart = String(count + 1).padStart(4, "0"); // e.g., 0001
    return `ASSET-${datePart}-${numberPart}`;
});
exports.generateAssetNumber = generateAssetNumber;
