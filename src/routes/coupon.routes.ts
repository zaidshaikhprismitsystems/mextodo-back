import express from "express";
import { CouponController } from "../controllers/coupon.controller";
import { validateLogin, validateRegister } from "../validations/auth.validations";
import { validateKey } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/get_all_coupon", validateKey, CouponController.getAllCoupons);
router.post("/create_coupon", validateKey, CouponController.createCoupon);
router.delete("/delete_coupon", validateKey, CouponController.deleteCoupon);
router.post("/update_coupon", validateKey, CouponController.updateCoupon);

router.get("/get_all_vendor_coupon", validateKey, CouponController.getAllVendorCoupons);
router.post("/create_vendor_coupon", validateKey, CouponController.createVendorCoupon);
router.post("/update_vendor_coupon", validateKey, CouponController.updateVendorCoupon);
router.delete("/delete_vendor_coupon", validateKey, CouponController.deleteVendorCoupon);

export default router;