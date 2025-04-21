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

export class AuthController {

    static async addVisitors(req: any){
        try{
            const userAgent = req.headers['user-agent'] || '';

            const { device, os, browser } = Utils.parseUserAgent(userAgent);
           
            const forwarded = req.headers['x-forwarded-for'];
            const ip = typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress;
           
            const existing = await prisma.visitor.findFirst({ where: { ip } });
            
            if (existing) {
            await prisma.visitor.update({
                where: { id: existing.id },
                data: {
                visitCount: { increment: 1 },
                lastVisit: new Date()
                }
            });
            } else {
            const geo: any = await fetch(`https://ipapi.co/${ip}/json`);
            let data = {
                ip,
                city: geo.city,
                region: geo.region,
                country: geo.country_name,
                latitude: parseFloat(geo.latitude),
                longitude: parseFloat(geo.longitude),
                userAgent: req.headers['user-agent'],
                referrer: req.headers.referer || null,
                browser: browser,
                os: os,
                device: device,
                page: req.url
            }
            await prisma.visitor.create({
                data: data
            });
            }
            return;
            // const totalVisitors = await prisma.visitor.count();
            // const totalVisits = await prisma.visitor.aggregate({
            // _sum: {
            //     visitCount: true
            // }
            // });
        }catch(e: any){
            console.log('e: ', e);
            return;
        }
    }

    static async checkAddress(req: any, res: Response, next: NextFunction){
        try{
            let pincode = req.query.pincode;
            let details: any = await axios.get(`https://geocodes.envia.com/zipcode/MX/${pincode}`);
            console.log('details: ', details);
            res.status(200).json({ success: true, data: details.data, message: "Addreess fetched successfully!" });
        }catch(e: any){
            console.log(e);
        }
    }

    static async login(req: any, res: Response, next: NextFunction) {
        try{
            const { username, password, isRemember } = req.body;
            const user: any = await prisma.users.findFirst({
                where: {
                    username: username
                },
                include:{
                    vendor_profile: true
                }
            });
            if (!user) {
                res.status(403).json({ success: false, message: "Invalid credentials" });
                return;
            }
            if(user && !user?.isVerified){
                res.status(403).json({ success: false, message: "Verify Your Email To Complete Your Mextodo Registration" });
                return;
            }
            if(user && !(await comparePassword(password, user.password))){
                res.status(403).json({ success: false, message: "Invalid Password" });
                return;
            }
            let userData = {
                id: user.id,
                username: user.username,
                email: user.email,
                first_name: user.firstName,
                last_name: user.lastName,
                role: user.role,
                language: user.language,
                currency: user.currency,
                store_name: user?.vendor_profile?.storeName
            }
            let sign = jwt.sign(userData, process.env.JWT_SECRET!, { expiresIn: isRemember ? "168h" : "24h" });
            res.status(200).json({ success: true, data: { userData }, token: sign, message: "User logged in successfully!" });
        }catch (error) {
            console.log('error: ', error);
            res.status(401).json({ success: false, message: "User logged in failed" });
        }
    }

    static async adminLogin(req: any, res: Response, next: NextFunction) {
        try{
            const { username, password, isRemember } = req.body;
            const user: any = await prisma.super_admin.findFirst({
                where: {
                    username
                }
            });
            if (!user) {
                res.status(403).json({ success: false, message: "Invalid credentials" });
                return;
            }
            if(user && !(await comparePassword(password, user.password))){
                res.status(403).json({ success: false, message: "Invalid Password" });
                return;
            }
            let userData = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: "super_admin"
                // language: user.language,
                // currency: user.currency
            }
            let sign = jwt.sign(userData, process.env.JWT_SECRET!, { expiresIn: isRemember ? "168h" : "24h" });
            res.status(200).json({ success: true, data: { userData }, token: sign, message: "Super Admin logged in successfully!" });
        }catch (error) {
            console.log('error: ', error);
            res.status(401).json({ success: false, message: "Super Admin logged in failed" });
        }
    }

    static async register(req: Request, res: Response, next: NextFunction) {
        try{
            const { email, password, username } = req.body;
            const hashedPassword = await hashPassword(password);
            const isUser = await prisma.users.findFirst({
                where: {
                    email: email
                }
            })
            if(isUser){
                res.status(409).json({ success: false, message: "User Already Registered with this email. Please Login To continue." });
                return;
            }
            const userCreate = await prisma.users.create({
                data:{
                    email: email,
                    password: hashedPassword,
                    username: username
                }
            })
            if(userCreate.id){
                const customer = await stripe.customers.create({
                    name: username,
                    email: email,
                    metadata: { mextodo_user_id:  userCreate.id }
                });
                const userStripeIdUpdate = await prisma.users.update({
                    where:{
                        id: userCreate.id
                    },
                    data:{
                        stripeCustomerId: customer.id
                    }
                })
                const token = crypto.randomBytes(32).toString("hex");
                const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
                await prisma.verifyuser_tokens.create({
                    data: { userId: userCreate.id, token, expiresAt }
                });
                await emailService.sendEmail(email, "Email Verification for Mextodo", "click below link to verify \n <a href=http://localhost:5173/verifyuser?token="+token+">Click Here</a>");
                // send email and password in token in email to verify
                // const [emailTemplate, credentials] = await Promise.all([
                //     prisma.emailPatterns.findFirst({ where: { slug: "user-registered" } }),
                //     prisma.email_credentials.findFirst() as any
                // ])
                // if (emailTemplate && credentials) {
                //     const htmlBody = emailTemplate.html.replace('{user}', `${username}`)
                //     await emailService.sendEmail(credentials?.email, emailTemplate.subject, htmlBody);
                // }
                res.status(200).json({ success: true, message: "User registered successfully!" });
            }else{
                throw new Error("error in user registration");
                
            }
        }catch(error){
            console.log('error: ', error);
            res.status(401).json({ success: false, message: "Error in user registration" });
        }
    }

    static async verifyUser(req: Request, res: Response, next: NextFunction) {
        try{
            const { token } = req.body;
            const checkUser = await prisma.verifyuser_tokens.findFirst({
                where: {
                    token: token
                },
                include:{
                    users: true
                }
            });
            if (!checkUser || checkUser.expiresAt < new Date()) {
                res.status(401).json({ success: false, message: "Invalid or Expired Token" });
                return;
            }
            const updateUser = await prisma.users.update({
                where: {
                    id: checkUser.users.id
                },
                data:{
                    isVerified: true
                }
            });
            await prisma.verifyuser_tokens.deleteMany({
                where:{
                    token: token
                }
            })
            res.status(200).json({ success: true, message: "User Verified successfully!" });
        }catch (error) {
            console.log('error: ', error);
            res.status(401).json({ success: false, message: "User verification failed" });
        }
    }

    static async getCurrentUser(req: Request, res: Response, next: NextFunction){
        try{
            console.log('req.headers.authorization: ', req.headers.authorization);
            let token = req.headers.authorization?.split(" ")[1];
            let visitorsLog = AuthController.addVisitors(req);
            if(token){
                const decoded = jwt.verify(token, process.env.JWT_SECRET!);
                let user: any = decoded;
                console.log('user: ', user);
                res.status(200).json({ success: true, data: {
                userData: 
                {   
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    first_name: user.firstName,
                    last_name: user.lastName,
                    role: user.role,
                    language: user.language,
                    currency: user.currency,
                    store_name: user?.store_name
                }
                }, message: "User Verified successfully!" });
            }else{
                res.status(200).json({ success: true, data: {userData: {}}, message: "User Verified successfully!" });
            }
        }catch (error) {
            console.log('error: ', error);
            res.status(401).json({ success: false, message: "Token Expired" });
        }
    }

    static async getUserData(req: Request, res: Response, next: NextFunction){
        try{
            let token = req.headers.authorization?.split(" ")[1];
            console.log('token: ', token);
            if(token){
                const decoded = jwt.verify(token, process.env.JWT_SECRET!);
                let user: any = decoded;
                let userData = await prisma.users.findFirst({
                    where: {
                        id: user.id
                    },
                    select:{
                        id: true, username: true, email: true, language: true, currency: true, firstName: true, lastName: true
                    }
                })
                res.status(200).json({ success: true, data: {userData: userData}, message: "User data fetched successfully!" });
            }else{
                res.status(200).json({ success: true, data: {userData: {}}, message: "User data fetched failed!" });
            }
        }catch (error) {
            console.log('error: ', error);
            res.status(401).json({ success: false, message: "Token Expired" });
        }
    }

    static async checkUserVendor(req: Request, res: Response, next: NextFunction){
        try{
            let token = req.headers.authorization?.split(" ")[1];
            if(token){
                const decoded = jwt.verify(token, process.env.JWT_SECRET!);
                let user: any = decoded;
                console.log('user: ', user);
                if(user){
                    let applied: any = await prisma.vendor_profiles.findFirst({
                        where: {
                            userId: user.id
                        }
                    })
                    if(applied){
                        res.status(200).json({ success: true, isApplied: true, status: applied.status,  message: "User Already Applied!"});
                        return;
                    }
                    res.status(200).json({ success: true, isApplied: false, message: "User Verified successfully!"});
                    return;
                }
                }else{
                    // No token
                res.status(200).json({ success: true, data: {userData: {}}, message: "User Verified successfully!" });
            }
        }catch (error) {
            console.log('error: ', error);
            res.status(401).json({ success: false, message: "Token Expired" });
        }
    }

    static async vendorRegister(req: Request, res: Response, next: NextFunction) {
        try{   
            const { userId, vendorFullName, storeName, storeLocation, curp, whatsappNumber, email, postalCode, cityId, stateId:stateId, countryId, district, sellDescription } = req.body;
            const vendorCreate = await prisma.vendor_profiles.create({
                data:{
                    userId, vendorFullName, storeName, storeLocation, curp, whatsappNumber: whatsappNumber.toString(), email, postalCode, cityId: parseInt(cityId), stateId: parseInt(stateId), countryId: parseInt(countryId), district, sellDescription
                }
            })
            if(vendorCreate.id){
                res.status(200).json({ success: true, data: vendorCreate, message: "Applied for vendor successfully!" });
            }else{
                throw new Error("error in application");
            }
        }catch(error){
            console.log('error: ', error);
            res.status(401).json({ success: false, message: "Vendor Application Failed" });
        }
    }

    static async vendorUpdate(req: Request, res: Response, next: NextFunction) {
        try{   
            const { id, vendorFullName, storeName, storeLocation, curp, whatsappNumber, email, postalCode, cityId, stateId:stateId, countryId, district, sellDescription, status } = req.body;
            const vendorUpdate = await prisma.vendor_profiles.update({
                where:{
                    id
                },
                data:{
                    vendorFullName, storeName, storeLocation, curp, whatsappNumber: whatsappNumber.toString(), email, postalCode, cityId: parseInt(cityId), stateId: parseInt(stateId), countryId: parseInt(countryId), district, sellDescription, status
                }
            })
            if(vendorUpdate){
                res.status(200).json({ success: true, data: vendorUpdate, message: "Vendor Updated successfully!" });
            }else{
                throw new Error("error in application");
            }
        }catch(error){
            console.log('error: ', error);
            res.status(401).json({ success: false, message: "Vendor Updation Failed" });
        }
    }

    static async vendorApprove(req: Request, res: Response, next: NextFunction) {
        try{   
            const { id } = req.body;
            const vendor: any = await prisma.vendor_profiles.findUnique({
                where:{
                    id
                }
            });

            if(!vendor){
                res.status(400).json({error: true, message: "Vendor Not Found. Try Again After some time"});
                return;
            }
            // const account = await stripe.accounts.create({
            //     type: "standard", // standard or express
            //     email,
            //     capabilities: {
            //         transfers: { requested: true }
            //     }
            // });
            // const account = await stripe.accounts.create({
            //     email: email,
            //     business_type: 'individual',
            //     controller: {
            //         fees: {
            //             payer: 'application',
            //         },
            //         stripe_dashboard: {
            //             type: 'express',
            //         },
            //     }
            // });

            const account = await stripe.accounts.create({
                type: "standard",
                country: "IN",
                email: vendor.email,
            });

            const vendorApproved = await prisma.vendor_profiles.update({
                where: { id },
                data: { stripeAccountId: account.id, approved: true, status: "approved" }
            });

            const updateRole = await prisma.users.update({
                where: { id: vendor.userId },
                data: { role: "seller" }
            });

            const accountLink: any = await AuthController.generateOnBoarding(account.id);
            
            // send mail for approved
            // const [emailTemplate, credentials] = await Promise.all([
            //     prisma.emailPatterns.findFirst({ where: { slug: "user-registered" } }),
            //     prisma.email_credentials.findFirst() as any
            // ])
            // if (emailTemplate && credentials) {
            //     const htmlBody = emailTemplate.html.replace('{user}', `${username}`)
            //     await emailService.sendEmail(credentials?.email, emailTemplate.subject, htmlBody);
            // }

            await emailService.sendEmail(vendor.email, "Vendor Application Approved", `click below link to start verification on stripe to accept payments \n <a href=${accountLink.url}>Click Here</a>`);
            
            res.status(200).json({ success: true, message: "Vendor updated successfully!", link: accountLink.url });
        }catch(error){
            console.log('error: ', error);
            res.status(500).json({ success: false, message: "Vendor updation failed" });
        }
    }

    static async vendorReject(req: Request, res: Response, next: NextFunction) {
        try{   
            const { id, reason } = req.body;
            const vendor: any = await prisma.vendor_profiles.findUnique({
                where:{
                    id
                }
            })
            if(!vendor){
                res.status(400).json({error: true, message: "Vendor Not Found. Try Again After some time"});
                return;
            }
            const vendorReject = await prisma.vendor_profiles.update({
                where:{ id: id },
                data:{
                    approved: false,
                    status: "rejected"
                }
            })
            await emailService.sendEmail(vendor.email, "Vendor Application Rejected", `Reason: \n ${reason} `);
            res.status(200).json({ success: true, message: "Vendor rejected!" });
            // send mail for reject
            // const [emailTemplate, credentials] = await Promise.all([
            //     prisma.emailPatterns.findFirst({ where: { slug: "user-registered" } }),
            //     prisma.email_credentials.findFirst() as any
            // ])
            // if (emailTemplate && credentials) {
            //     const htmlBody = emailTemplate.html.replace('{user}', `${username}`)
            //     await emailService.sendEmail(credentials?.email, emailTemplate.subject, htmlBody);
            // }
        }catch(error){
            console.log('error: ', error);
            res.status(401).json({ success: false, message: "Vendor Application Failed" });
        }
    }

    static async vendorReset(req: any, res: Response, next: NextFunction) {
        try{   
            console.log('req.user: ', req.user);
            const { id } = req.user;
            const userVendor: any = await prisma.users.findUnique({
                where:{
                    id: parseInt(id)
                },
                include: {
                    vendor_profile: true
                }
            })
            if(!userVendor || !userVendor?.vendor_profile){
                res.status(400).json({error: true, message: "Vendor Not Found. Try Again After some time"});
                return;
            }
            console.log('userVendor?.vendor_profile: ', userVendor?.vendor_profile);
            const vendorReset = await prisma.vendor_profiles.delete({
                where:{
                    id: parseInt(userVendor?.vendor_profile.id)
                }
            })
            res.status(200).json({ success: true, message: "Vendor Application Reset Successfully!" });
        }catch(error){
            console.log('error: ', error);
            res.status(401).json({ success: false, message: "Vendor Application Reset Failed" });
        }
    }

    static async sendOnBoarding(req: any, res: Response, next: NextFunction) {
        try{   
            const vendor: any = await prisma.vendor_profiles.findFirst({
                where:{
                    userId: req.user.id,
                }
            })
            if(vendor && vendor?.stripeAccountId){
                const accountLink: any = await AuthController.generateOnBoarding(vendor?.stripeAccountId);
                console.log('accountLink: ', accountLink);
                res.status(200).json({ success: true, message: "generate link successfully!", link: accountLink.url });
                return;
            }else{
                res.status(200).json({ success: false, message: "Stripe Account Not Found. Contact To Admin!" });
            }
        }catch(error){
            console.log('error: ', error);
            res.status(500).json({ success: false, message: "generate link failed" });
        }
    }

    static async generateOnBoarding(accountId: any){
        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: "http://localhost:5173/dashboard/", 
            return_url: "http://localhost:5173/dashboard/?success=true", 
            type: "account_onboarding",
        });
        return accountLink;
    }

    static async checkStripeChargeEnable(req: any, res: Response, next: NextFunction) {
        try{   
            const user = req.user;
            console.log('user: ', user);

            const vendor: any = await prisma.vendor_profiles.findFirst({
                where:{
                    userId: user.id,
                },
                include:{
                    state: true,
                    cities: true
                }
            })
            if(vendor && vendor?.stripeAccountId){
                const account = await stripe.accounts.retrieve(vendor?.stripeAccountId);
                console.log('account: ', account);
                if (account.charges_enabled) {
                    res.status(200).json({ success: true, message: "Vendor charges enabled!", is_enabled: true});
                    console.log("Vendor carges enabled!");
                    return;
                } else {
                    res.status(200).json({ success: false, message: "Vendor charges disabled!", is_enabled: false});
                    console.log("Vendor still needs to complete onboarding.");
                    return;
                }
            }else{
                res.status(200).json({ success: true, message: "Vendor didn't have accepted yet" });
            }
        }catch(error: any){
            console.log('error: ', error);
            res.status(500).json({ success: false, message: "something went wrong." });
        }
    }

    static async getAllVendors(req: any, res: Response) {
        try {
            const { search, status, page, rowsPerPage } = req.query;

            let where: any = {
            };

            if (search) {
                where = {
                    ...where,
                    OR: [
                        { vendorFullName: { contains: search, mode: 'insensitive' } }, 
                        { email: { contains: search, mode: 'insensitive' } },
                    ]
                };
            }

            if (status) {
                where = {
                    ...where,
                    status: status
                };
            }

            const vendors = await prisma.vendor_profiles.findMany({ 
                where: where,
                orderBy: {
                    createdAt: "desc"
                },
                // include: { category: true, vendor: true },
                skip: parseInt(page)*parseInt(rowsPerPage),
                take: parseInt(rowsPerPage)
            });
            const totalCount = await prisma.vendor_profiles.count({ where });
            res.status(200).json({ success: true, data: vendors, totalCount });
        } catch (error) {
            console.error("Error fetching products:", error);
            res.status(500).json({ success: false, message: "Error fetching products" });
        }
    }

    static async deleteVendors(req: any, res: Response){
        try {
            let ids = req.query.ids.split(",");
            const idList = ids.map((id: any) => parseInt(id, 10)); 
            const vendors = await prisma.vendor_profiles.updateMany({ 
                where:{
                    id: {
                        in: idList
                    }
                },
                data:{
                    status: "suspended"
                }
            });
            console.log('vendors: ', vendors);
            res.status(200).json({ success: true, data: vendors });
        } catch (error) {
            console.error("Error deleting vendors:", error);
            res.status(500).json({ success: false, message: "Error deleting vendors" });
        }
    }

    static async forgotPassword(req: Request, res: Response, next: NextFunction) {
        try{
            const { email } = req.body;
            const user = await prisma.users.findFirst({
                where: {
                    email: email
                }
            });
            if (!user) {
                res.status(401).json({ success: false, message: "No user found with this Email" });
                throw new Error("No user found with this Email");
            }

            const token = crypto.randomBytes(32).toString("hex");
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

            await prisma.password_reset_tokens.create({
                data: { userId: user.id, token, expiresAt }
            });

            await emailService.sendEmail(email, "Password reset for Mextodo", "click below link to set new password \n <a href=http://localhost:5173/reset-password?token="+token+">Click Here</a>");                

            // sent email with link to reset password
            // const [emailTemplate, credentials] = await Promise.all([
            //     prisma.emailPatterns.findFirst({ where: { slug: "user-forget-password" } }),
            //     prisma.email_credentials.findFirst() as any
            // ])
            // if (emailTemplate && credentials) {
            //     const htmlBody = emailTemplate.html.replace('{email}', `${email}`)
            //     await emailService.sendEmail(credentials?.email, emailTemplate.subject, htmlBody);
            // }
            res.status(200).json({ success: true, message: "password reset link sent to your email address!" });
        }catch (error) {
            console.log('error: ', error);
            res.status(401).json({ success: false, message: "User logged in failed" });
        }
    }

    static async resetPassword(req: Request, res: Response, next: NextFunction) {
        try{
            const { token, email, password } = req.body;
            const passwordReset = await prisma.password_reset_tokens.findFirst({
                where: {
                    token: token
                },
                include:{
                    users: true
                }
            });
            if (!passwordReset || passwordReset.expiresAt < new Date()) {
                await prisma.password_reset_tokens.deleteMany({
                    where: {
                        token: token
                    }
                });
                res.status(401).json({ success: false, message: "Invalid or Expired Token. Try Forget Password Again." });
                return;
            }
            const hashedPassword = await hashPassword(password);
            let updatedPassword = await prisma.users.update({
                where:{
                    id: passwordReset.users.id
                },
                data:{
                    password: hashedPassword
                }
            });
            await prisma.password_reset_tokens.deleteMany({
                where: {
                    token: token
                }
            });
            res.status(200).json({ success: true, message: "password reset successfully!" });
        }catch (error) {
            console.log('error: ', error);
            res.status(401).json({ success: false, message: "Password reset failed" });
        }
    }

    static async changePassword(req: Request, res: Response, next: NextFunction) {
        try{
            const { email, currentPassword, newPassword } = req.body;
            const user = await prisma.users.findFirst({
                where: {
                    email: email
                }
            });
            
            if (!user) {
                res.status(401).json({ success: false, message: "No user found with this Email" });
                return;
            }

            if (!(await comparePassword(currentPassword, user.password))) {
                res.status(401).json({ success: true, message: "Current Password Not matched!" });
                return;
            }
            const hashedPassword = await hashPassword(newPassword);
            let updatedPassword = await prisma.users.update({
                where:{
                    id: user.id
                },
                data:{
                    password: hashedPassword
                }
            });
            res.status(200).json({ success: true, message: "password changed successfully!" });
        }catch (error) {
            console.log('error: ', error);
            res.status(401).json({ success: false, message: "Password change failed" });
        }
    }

    static async changeAdminPassword(req: any, res: Response, next: NextFunction) {
        try{
            const user = req.user;
            console.log('user: ', user);
            const { currentPassword, newPassword } = req.body;
            const userData: any = await prisma.super_admin.findFirst({
                where: {
                    email: user.email
                }
            });
            
            if (!user) {
                res.status(401).json({ success: false, message: "No Admin found with this Email" });
                return;
            }

            if (!(await comparePassword(currentPassword, userData.password))) {
                res.status(401).json({ success: true, message: "Current Password Not matched!" });
                return;
            }
            const hashedPassword = await hashPassword(newPassword);
            let updatedPassword = await prisma.super_admin.update({
                where:{
                    id: user.id
                },
                data:{
                    password: hashedPassword
                }
            });
            res.status(200).json({ success: true, message: "password changed successfully!" });
        }catch (error) {
            console.log('error: ', error);
            res.status(401).json({ success: false, message: "Password change failed" });
        }
    }

    static async updateProfile(req: Request, res: Response, next: NextFunction) {
        try{
            const {id, firstName, lastName, currency, language} = req.body;
            let updateProfile = await prisma.users.update({
                where: {
                    id: id
                },
                data:{
                    firstName, lastName, currency, language
                }
            })
            res.status(200).json({ success: true, message: "Profile updated successfully" });
        }catch(error){
            console.log('error: ', error);
            res.status(401).json({ success: false, message: "Profile updation failed" });
        }
    }

    static async addAddress(req: Request, res: Response, next: NextFunction) {
        try{
            const { userId, zipCode, address, cityId, stateId, countryId, type, label, receiverPhone, receiverName, isDefault }  = req.body;
            let addAddress = await prisma.addresses.create({
                data:{
                    userId, zipCode, address, cityId, stateId, countryId, type, label, receiverPhone, receiverName, isDefault
                }
            })
            res.status(200).json({ success: true, message: "Address added successfully" });
        }catch(error){
            console.log('error: ', error);
            res.status(500).json({ success: false, message: "Adding address failed" });
        }
    }

    static async deleteAddress(req: Request, res: Response, next: NextFunction) {
        try{
            const { id }  = req.body;
            let deleteAddress = await prisma.addresses.delete({
                where:{
                    id: id
                }
            })
            res.status(200).json({ success: true, message: "Address deleted successfully" });
        }catch(error){
            console.log('error: ', error);
            res.status(500).json({ success: false, message: "Address Deletion failed" });
        }
    }

    static async updateAddress(req: Request, res: Response, next: NextFunction) {
        try{
            const {id, data} = req.body;
            let updateAddress = await prisma.addresses.update({
                where:{
                    id: id
                },
                data:{
                    ...data
                }
            })
            res.status(200).json({ success: true, message: "Address updated successfully" });
        }catch(error){
            console.log('error: ', error);
            res.status(500).json({ success: false, message: "Address updation failed" });
        }
    }
  
}