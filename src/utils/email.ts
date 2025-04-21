const nodemailer = require('nodemailer');
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
// import logger from './logger';

const prisma = new PrismaClient();

export class EmailService {
    private static instance: EmailService;
    private transporter: any = null;
    private cachedCredentials: { email: string; app_password: string } | null = null;

    private constructor() { }

    public static getInstance(): EmailService {
        if (!EmailService.instance) {
            EmailService.instance = new EmailService();
        }
        return EmailService.instance;
    }

    private async loadCredentials() {
        if (!this.cachedCredentials) {
            console.log('Fetching SMTP credentials from database...');
            // const credentials = await prisma.email_credentials.findFirst();
            const credentials = {
                email: "16mscit072@gmail.com",
                app_password: "xluu mykf apwg yguk"
            };

            if (!credentials) {
                // logger.warn('SMTP credentials not found in database.');
                return null;
            }

            this.cachedCredentials = {
                email: credentials.email,
                app_password: credentials.app_password,
            };
        }
        return this.cachedCredentials;
    }

    private async getTransporter() {
        if (!this.transporter) {
            const credentials = await this.loadCredentials();
            if (!credentials) {
                // logger.warn('Cannot create transporter: SMTP credentials not available.');
                return null;
            }

            this.transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                service: process.env.SMPT_SERVICE || 'gmail',
                auth: {
                    user: credentials.email,
                    pass: credentials.app_password,
                },
            });
        }
        return this.transporter;
    }

    public invalidateCache() {
        this.cachedCredentials = null;
        this.transporter = null;
        console.log('SMTP credentials cache invalidated.');
    }

    // Send email
    public async sendEmail(to: string, subject: string, htmlBody: string) {
        try {
            const transporter = await this.getTransporter();
            if (!transporter) {
                return;
            }

            const mailOptions = {
                from: `"Mextodo" <${(await this.loadCredentials())?.email}>`,
                to,
                subject,
                html: htmlBody,
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent:', info.response);
        } catch (error) {
            console.error('Error sending email:', error);
        }
    }

    public async sendEmailWithAttachment(to: string, subject: string, htmlBody: string, pdfPath: string) {
        try {
            const transporter = await this.getTransporter();
            if (!transporter) {
                // logger.warn('Email sending skipped: No SMTP credentials available.');
                return;
            }

            const mailOptions = {
                from: `"Mextodo" <${(await this.loadCredentials())?.email}>`,
                to,
                subject,
                html: htmlBody,
                attachments: [{ filename: 'pdf.pdf', path: pdfPath }],
            };

            transporter.sendMail(mailOptions, (error: any, info: any) => {
                if (error) {
                    // logger.error('Error sending email:', error);
                } else {
                    console.log('Email sent:', info.response);
                }
            });
            fs.unlink(pdfPath, (err) => {
                if (err) {
                    console.error('Error removing the PDF file:', err);
                } else {
                    console.log('PDF file removed successfully');
                }
            });

            console.log('Invoice PDF processing completed!');
        } catch (error) {
            console.error('Error sending email with attachment:', error);
        }
    }
}
