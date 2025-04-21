import { Request, Response, NextFunction } from "express";
import jwt  from "jsonwebtoken"

interface AuthRequest extends Request {
    user?: any;
}

const validateKey = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = req.header("Authorization")?.split(" ")[1];
        if (!token) {
            res.status(401).json({ success: false, message: "Unauthorized User" });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!);
        if (!decoded) {
            res.status(401).json({ success: false, message: "Unauthorized: Invalid token" });
            return;
        }

        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: "Unauthorized: Invalid token" });
        return;
    }
};

const authorizeRole = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: "Forbidden: You are not allowed to access this resource" });
        }
        next();
    };
};

export { validateKey, authorizeRole };
