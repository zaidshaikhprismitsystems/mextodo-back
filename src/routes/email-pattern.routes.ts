import express from "express";
import { EmailPatternController } from "../controllers/email-template.controller";
import { validateLogin, validateRegister } from "../validations/auth.validations";
import { validateKey } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/get_email_template", validateKey, EmailPatternController.getEmailPattern);
router.post("/add_email_template", validateKey, EmailPatternController.addEmailPattern);

export default router;