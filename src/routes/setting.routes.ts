import express from "express";
import { SettingController } from "../controllers/setting.controller";
import { validateLogin, validateRegister } from "../validations/auth.validations";
import { validateKey } from "../middleware/auth.middleware";

const router = express.Router();


// router.post("/vendor_approve", validateKey, SettingController.vendorApprove);
router.post("/save_setting", validateKey, SettingController.saveSetting);
router.get("/get_setting", validateKey, SettingController.getSetting);
// router.post("/update_vendor", validateKey, SettingController.vendorUpdate);

// router.get("/get_all_vendors", validateKey, SettingController.getAllVendors);
// router.delete("/delete_vendors", validateKey, SettingController.deleteVendors);

export default router;