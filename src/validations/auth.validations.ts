import { Request, Response, NextFunction } from "express";
import Joi from "joi";

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().min(6).required(),
  isRemember: Joi.boolean().optional()
});

const registerSchema = Joi.object({
    username: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
});

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }
  next();
};

export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
    const { error } = registerSchema.validate(req.body);
    if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
    }
    next();
};