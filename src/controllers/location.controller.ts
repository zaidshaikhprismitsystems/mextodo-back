import { NextFunction, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
// import { Utils } from '../utils/utils';
const prisma = new PrismaClient();

export class LocationService {
    static async getAllCountries(req: any, res: Response, next: NextFunction) {
        try {
            const countries = await prisma.countries.findMany();
            res.status(200).json({ success: true, data: countries, message: "Fetch all countries successfully!" });
        } catch (error) {
            console.log('Failed to fetch countries: ', error);
            res.status(500).json({ success: false, message: "An error occurred while fetching countries" });
            next(error);
        }
    }
    
    static async getAllStates(req: any, res: Response, next: NextFunction) {
        const { country_code } = req.query;
        console.log('country_code: ', country_code);
        let where = {};
        if(country_code){
          where = { isoCode: country_code }
        }

        try {
            const states = await prisma.countries.findFirst({
                where,
                select:{
                    id: true,
                    name: true,
                    states: true
                },
                orderBy: { name: 'asc' }
            });
            res.status(200).json({ success: true, data: states, message: "Fetch all states successfully!" });
        } catch (error) {
            console.log('Failed to fetch states: ', error);
            res.status(500).json({ success: false, message: "An error occurred while fetching states" });
            next(error);
        }
    }
    
    static async getAllCities(req: any, res: Response, next: NextFunction) {
        const { state_id } = req.query;
        let where = {};
        if(state_id){
          where = { stateId: parseInt(state_id) }
        }
        try {
            const cities = await prisma.cities.findMany({
                where,
                orderBy: { name: 'asc' },
                select:{
                    id: true,
                    name: true
                }
            });
            res.status(200).json({ success: true, data: cities, message: "Fetch all cities successfully!" });
        } catch (error) {
            console.log('Failed to fetch cities: ', error);
            res.status(500).json({ success: false, message: "An error occurred while fetching cities" });
            next(error);
        }
    }
}