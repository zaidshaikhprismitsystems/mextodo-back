import { NextFunction, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../utils/email';
import { imageUpload } from "../utils/uploadImage"
import path from "path"
import { videoUpload } from '../utils/uploadVideo';

const emailService = EmailService.getInstance();
const prisma = new PrismaClient();

export class TicketController {
    // Create a new ticket
    static async createTicket(req: any, res: Response) {
        try {
            const userId = req.user.id;
            const { title, description, category, priority, images, relatedType, relatedId } = req.body;

            let imageArray: any = [];  
            // Thumbnail Images
            const uploadPath = path.join(__dirname, "../../uploads/tickets");
            for(let i = 0; i < images.length; i++){
                const buffer = Buffer.from(images[i].image, "base64");
                const filePath = await imageUpload({ data: buffer, mimetype: images[i].mimetype }, uploadPath);
                imageArray.push(filePath);
            }

            // Create a new ticket in the database
            const newTicket = await prisma.tickets.create({
                data: {
                    userId,
                    title,
                    description,
                    category,
                    priority,
                    images: imageArray,
                    relatedType, 
                    relatedId,
                    status: 'open'
                }
            });

            res.status(201).json({ success: true, data: newTicket });
        } catch (error) {
            console.error("Error creating ticket:", error);
            res.status(500).json({ success: false, message: "Error creating ticket" });
        }
    }

    // View a single ticket by its ID
    static async viewTicket(req: Request, res: Response) {
        try {
            const ticketId = req.query.id;
            
            if (!ticketId) {
                res.status(404).json({ success: false, message: "Ticket Id not found" });
                return;
            }

            const ticket: any = await prisma.tickets.findUnique({
                where: { id: parseInt(ticketId?.toString()) },
                include: {
                    replies: {
                        include:{
                            users: true
                        },
                        orderBy: {
                            createdAt: "desc"
                        }
                    },
                    assignedAgent: true,
                    users: true,

                }
            });

            let relatedData: any = null;

            if (ticket.relatedType && ticket.relatedId) {
                switch (ticket.relatedType) {
                    case "product":
                        relatedData = await prisma.products.findUnique({
                            where: { id: ticket.relatedId },
                            include: {
                                vendor: true
                            }
                        });
                        break;
                    case "order":
                        relatedData = await prisma.orders.findUnique({
                            where: { id: ticket.relatedId },
                            include: {
                                customer: true,
                                vendor: true
                            }
                        });
                        break;
                    default:
                        break;
                }
            }

            if (!ticket) {
                res.status(404).json({ success: false, message: "Ticket not found" });
                return;
            }

            res.status(200).json({ success: true, data: ticket, relatedData: relatedData });
        } catch (error) {
            console.error("Error fetching ticket:", error);
            res.status(500).json({ success: false, message: "Error fetching ticket" });
        }
    }

    static async viewVendorTicket(req: Request, res: Response) {
        try {
            const ticketId = req.query.id;
            
            if (!ticketId) {
                res.status(404).json({ success: false, message: "Ticket Id not found" });
                return;
            }

            const ticket: any = await prisma.tickets.findUnique({
                where: { id: parseInt(ticketId?.toString()) },
                include: {
                    replies: {
                        include:{
                            users: true
                        },
                        orderBy: {
                            createdAt: "desc"
                        }
                    },
                    assignedAgent: true
                }
            });

            if (!ticket) {
                res.status(404).json({ success: false, message: "Ticket not found" });
                return;
            }

            res.status(200).json({ success: true, data: ticket });
        } catch (error) {
            console.error("Error fetching ticket:", error);
            res.status(500).json({ success: false, message: "Error fetching ticket" });
        }
    }

    // List all tickets for the admin
    static async listAllTickets(req: Request, res: Response) {
        try {
            const { search, status, page, rowsPerPage } = req.query;
            let where: any = {
            };
            if (search) {
                where = {
                    ...where,
                    OR: [
                        { title: { contains: search, mode: 'insensitive' } }, 
                        { 
                            users: {
                                OR:[
                                    {firstName: { contains: search, mode: 'insensitive' }},
                                    {lastName: { contains: search, mode: 'insensitive' }}
                                ]
                            } 
                        },
                    ]
                };
            }
            if (status) {
                where = {
                    ...where,
                    status: status
                };
            }
            const tickets = await prisma.tickets.findMany({
                where: where,
                include: {
                    users: true,
                    assignedAgent: true,
                },
                orderBy: {
                    createdAt: "desc"
                },
                skip: parseInt(page ? page.toString() : '1')*parseInt(rowsPerPage ? rowsPerPage.toString() : '10'),
                take: parseInt(rowsPerPage ? rowsPerPage?.toString(): '10')
            });
            const totalCount = await prisma.tickets.count({ where });
            res.status(200).json({ success: true, data: tickets, total: totalCount });
        } catch (error) {
            console.error("Error fetching tickets:", error);
            res.status(500).json({ success: false, message: "Error fetching tickets" });
        }
    }

    // Update ticket (change status or priority)
    static async updateTicket(req: Request, res: Response) {

        try {
            const { ticketId, status, priority, assignedTo } = req.body;

            // Update ticket status and priority if provided
            const updatedTicket: any = await prisma.tickets.update({
                where: { id: parseInt(ticketId) },
                data: {
                    status: status ?? undefined,
                    priority: priority ?? undefined,
                    assignedTo: assignedTo ?? undefined
                },
                include:{
                    replies: {
                        include:{
                            users: true
                        },
                        orderBy: {
                            createdAt: "desc"
                        }
                    },
                    assignedAgent: true,
                    users: true
                }
            });

            let relatedData: any = null;
            if (updatedTicket.relatedType && updatedTicket.relatedId) {
                switch (updatedTicket.relatedType) {
                    case "product":
                        relatedData = await prisma.products.findUnique({
                            where: { id: updatedTicket.relatedId },
                            include: {
                                vendor: true
                            }
                        });
                        break;
    
                    case "order":
                        relatedData = await prisma.orders.findUnique({
                            where: { id: updatedTicket.relatedId },
                            include: {
                                customer: true,
                                vendor: true
                            }
                        });
                        break;
                    default:
                        break;
                }
            }

            res.status(200).json({ success: true, data: updatedTicket, relatedData: relatedData });
        } catch (error) {
            console.error("Error updating ticket:", error);
            res.status(500).json({ success: false, message: "Error updating ticket" });
        }
    }

    // Assign a ticket to a support agent
    static async assignTicket(req: Request, res: Response) {
        try {
            const { ticketId } = req.params;
            const { assignedTo } = req.body; // assignedTo is the userId of the support agent

            // Update the ticket with the assigned agent
            const assignedTicket = await prisma.tickets.update({
                where: { id: parseInt(ticketId) },
                data: {
                    assignedTo, // Assign the support agent
                    status: 'inProgress' // Optionally change the ticket status
                }
            });

            res.status(200).json({ success: true, data: assignedTicket });
        } catch (error) {
            console.error("Error assigning ticket:", error);
            res.status(500).json({ success: false, message: "Error assigning ticket" });
        }
    }

    // Add a reply to a ticket
    static async addReplyToTicket(req: any, res: Response) {
        try {
            const userId = req.user.id;
            const { ticketId, replyText } = req.body;

            // Create a new reply in the database
            const newReply = await prisma.reply.create({
                data: {
                    ticketId,
                    userId, // The user (support agent or admin) replying
                    replyText
                }
            });

            // Optionally update the ticket's `updatedAt` to the current timestamp
            let updatedData = await prisma.tickets.update({
                where: { id: ticketId },
                data: { updated_at: new Date() },
                include: {
                    replies: {
                        include:{
                            users: true
                        },
                        orderBy: {
                            createdAt: "desc"
                        }
                    },
                    assignedAgent: true,
                    users: true
                }
            });

            res.status(201).json({ success: true, data: updatedData });
        } catch (error) {
            console.error("Error adding reply to ticket:", error);
            res.status(500).json({ success: false, message: "Error adding reply to ticket" });
        }
    }

    // List all tickets for the admin
    static async listAllTicketsVendor(req: any, res: Response) {
        try {
            const { search, page, rowsPerPage } = req.query;
            let vendor: any = await prisma.vendor_profiles.findFirst({
                where: { userId: req.user.id }
            });

            let where: any = {
                assignedTo: vendor.id
            };

            if (search) {
                where = {
                    ...where,
                    OR: [
                        { title: { contains: search, mode: 'insensitive' } }
                    ]
                };
            }
            const tickets = await prisma.tickets.findMany({
                where: where,
                include: {
                    assignedAgent: true,
                },
                orderBy: {
                    createdAt: "desc"
                },
                skip: parseInt(page ? page.toString() : '1')*parseInt(rowsPerPage ? rowsPerPage.toString() : '10'),
                take: parseInt(rowsPerPage ? rowsPerPage?.toString(): '10')
            });
            const totalCount = await prisma.tickets.count({ where });
            res.status(200).json({ success: true, data: tickets, total: totalCount });
        } catch (error) {
            console.error("Error fetching tickets:", error);
            res.status(500).json({ success: false, message: "Error fetching tickets" });
        }
    }

}