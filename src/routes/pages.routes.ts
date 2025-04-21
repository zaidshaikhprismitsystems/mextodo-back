import express from "express";
import { PageController } from "../controllers/pages.controller";
import { validateLogin, validateRegister } from "../validations/auth.validations";
import { validateKey } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/get_page", validateKey, PageController.getPage);
router.post("/save_page", validateKey, PageController.addOrUpdatePage);

export default router;