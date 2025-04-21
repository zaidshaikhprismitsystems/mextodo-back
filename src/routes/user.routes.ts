import express from "express";
import { UserController } from "../controllers/user.controller";
import { validateLogin, validateRegister } from "../validations/auth.validations";
import { validateKey } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/get_all_users", validateKey, UserController.getAllUsers);
router.delete("/delete_users", validateKey, UserController.deleteUsers);
router.post("/update_user", validateKey, UserController.updateUser);


export default router;