import express from "express";
import { AuthController } from "../controllers/auth.controller";
import { validateLogin, validateRegister } from "../validations/auth.validations";
import { validateKey } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/log", AuthController.addVisitors);

router.post("/login", validateLogin, AuthController.login);
router.post("/adminlogin", validateLogin, AuthController.adminLogin);
router.post("/register", validateRegister, AuthController.register);
router.post("/verifyuser", AuthController.verifyUser);
router.get("/me", AuthController.getCurrentUser);
router.get("/getuserdata", AuthController.getUserData);
router.post("/forgotpassword", AuthController.forgotPassword);
router.post("/resetpassword", AuthController.resetPassword);
router.post("/changepassword", AuthController.changePassword);

router.post("/change_admin_password", validateKey, AuthController.changeAdminPassword);

router.post("/updateprofile", AuthController.updateProfile);
router.post("/vendorregister", AuthController.vendorRegister);
router.get("/checkuservendor", AuthController.checkUserVendor);

router.post("/vendor_approve", validateKey, AuthController.vendorApprove);
router.post("/vendor_reject", validateKey, AuthController.vendorReject);
router.post("/vendor_reset", validateKey, AuthController.vendorReset);
router.post("/update_vendor", validateKey, AuthController.vendorUpdate);

router.get("/get_all_vendors", validateKey, AuthController.getAllVendors);
router.delete("/delete_vendors", validateKey, AuthController.deleteVendors);

router.get("/check_stripe_connect", validateKey, AuthController.checkStripeChargeEnable);
router.get("/generate_onboarding", validateKey, AuthController.sendOnBoarding);

router.get("/checkaddress", AuthController.checkAddress);

export default router;