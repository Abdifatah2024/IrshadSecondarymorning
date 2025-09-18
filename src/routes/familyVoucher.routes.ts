// routes/familyVoucher.routes.ts
import { Router } from "express";
import {
  createFamilyVoucher,
  getFamilyVoucherByNo,
  listFamilyGroupsByParent,
  listFamilyVouchers,
  listFamilyVouchersByParent,
  voidFamilyVoucher,
} from "../controller/FamilyVouchers";

const router = Router();

// Create voucher with allocations
router.post("/payments/family", createFamilyVoucher);

// List (paged + filters)
router.get("/payments/family", listFamilyVouchers);

// Read one by voucherNo (includes allocations)
router.get("/payments/family/:voucherNo", getFamilyVoucherByNo);

// List all vouchers for a specific parent
router.get("/payments/family/parent/:parentUserId", listFamilyVouchersByParent);

// Void a voucher (reverse allocations + remove payments)
router.delete("/payments/family/:voucherNo", voidFamilyVoucher);  
router.get("/payments/families", listFamilyGroupsByParent);  

export default router;
