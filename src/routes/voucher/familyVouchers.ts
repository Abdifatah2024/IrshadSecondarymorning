import { Router } from "express";
// import * as ctrl from "../controllers/vouchers/familyVouchers.controller";
// import * as ctrl from "../controllers/vouchers/familyVouchers.controller";
import * as ctrl from "../../controller/vouchers/familyVouchers.controller";

const r = Router();

// GET /api/family-vouchers
r.get("/", ctrl.listFamilyVouchers);

// GET /api/family-vouchers/:id
r.get("/:id", ctrl.getFamilyVoucherById);

// GET /api/family-vouchers/stats/monthly
r.get("/stats/monthly/list", ctrl.monthlyFamilyVoucherStats);

export default r;
