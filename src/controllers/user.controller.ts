import { NextFunction, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class UserController {
    static async getAllUsers(req: any, res: Response) {
        try {
            const { search, status, page, rowsPerPage } = req.query;

            let where: any = {
            };

            if (search) {
                where = {
                    ...where,
                    OR: [
                        { firstName: { contains: search, mode: 'insensitive' } }, 
                        { lastName: { contains: search, mode: 'insensitive' } }, 
                        { email: { contains: search, mode: 'insensitive' } },
                    ]
                };
            }

            if (status) {
                where = {
                    ...where,
                    isDeleted: status == "enabled" ? false : true
                };
            }

            const users = await prisma.users.findMany({ 
                where: where,
                orderBy: {
                    createdAt: "desc"
                },
                skip: parseInt(page)*parseInt(rowsPerPage),
                take: parseInt(rowsPerPage)
            });
            const totalCount = await prisma.users.count({ where });
            res.status(200).json({ success: true, data: users, totalCount });
        } catch (error) {
            console.error("Error fetching users:", error);
            res.status(500).json({ success: false, message: "Error fetching users" });
        }
    }

    static async deleteUsers(req: any, res: Response){
        try {
            let ids = req.query.ids.split(",");
            const idList = ids.map((id: any) => parseInt(id, 10)); 
            const users = await prisma.users.updateMany({ 
                where:{
                    id: {
                        in: idList
                    }
                },
                data:{
                    isDeleted: true
                }
            });
            res.status(200).json({ success: true, data: users });
        } catch (error) {
            console.error("Error deleting vendors:", error);
            res.status(500).json({ success: false, message: "Error deleting vendors" });
        }
    } 

    static async updateUser(req: Request, res: Response, next: NextFunction) {
            try{
                const { id, email, username, firstName, lastName, isVerified, isDeleted } = req.body;
                const userUpdate = await prisma.users.update({
                    where:{
                        id
                    },
                    data:{
                        email, username, firstName, lastName, isVerified, isDeleted
                    }
                })
                if(userUpdate){
                    res.status(200).json({ success: true, data: userUpdate, message: "User Updated successfully!" });
                }else{
                    throw new Error("error in application");
                }
            }catch(error){
                console.log('error: ', error);
                res.status(401).json({ success: false, message: "User Updation Failed" });
            }
    }
}