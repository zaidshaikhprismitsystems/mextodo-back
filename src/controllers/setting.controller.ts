import { NextFunction, Request, Response } from 'express';
import { hashPassword, comparePassword } from "../utils/hash";
import jwt from "jsonwebtoken";
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../utils/email';
import Stripe from "stripe";
import crypto from "crypto";
import axios from 'axios';

const emailService = EmailService.getInstance();
const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-01-27.acacia" });
import { Utils } from '../utils/utils';
import path from 'path';
import { imageUpload } from '../utils/uploadImage';

export class SettingController {

    static async saveSetting(req: Request, res: Response, next: NextFunction) {
        try {
            const { settingData } = req.body;

            for (const setting of settingData) {
                let settingValue = setting.value;
                if (typeof settingValue !== 'string' && typeof settingValue !== 'boolean') {

                    const buffer = Buffer.from(settingValue.image, "base64");
                    const uploadPath = path.join(__dirname, "../../uploads/settings");
                    settingValue = await imageUpload({ data: buffer, mimetype: settingValue.mimetype }, uploadPath);

                    await prisma.settings.upsert({
                        where: { key: setting.key },
                        update: { value: settingValue },
                        create: {
                            key: setting.key,
                            value: settingValue
                        }
                    });
                } else {
                    await prisma.settings.upsert({
                        where: { key: setting.key },
                        update: { value: setting.value.toString() },
                        create: {
                            key: setting.key,
                            value: setting.value.toString()
                        }
                    });
                }
            }
            res.status(200).json({ success: true, message: "setting data saved!" });
        } catch (error) {
            console.log('error: ', error);
            res.status(400).json({ success: false, message: "setting data saved failed" });
        }
    }

    static async getSetting(req: any, res: Response, next: NextFunction) {
        try {
            const settings: any = await prisma.settings.findMany({});
            if (!settings) {
                res.status(200).json({ error: false, message: "No Settings Data found" });
                return;
            }
            res.status(200).json({ success: true, data: settings, message: "Setting get Successfully!" });
            return;
        } catch (error) {
            console.log('error: ', error);
            res.status(400).json({ success: false, message: "Setting get Failed" });
        }
    }

}