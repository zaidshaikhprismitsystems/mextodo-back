import { NextFunction, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import axios from 'axios';
import { EmailService } from '../utils/email';
import { Utils } from '../utils/utils';
import fs from 'fs';
import path from 'path'

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-01-27.acacia" });
const emailService = EmailService.getInstance();

export class OrderController {
  
    // Create Order and initiate payment
    static async createOrder(req: any, res: Response, next: NextFunction): Promise<void> {
        const { items, totalPrice, vendorId, totalItems, shippingAddressId, billingAddressId, paymentDetails } = req.body;
        const user = req.user;

        let userDetails = await prisma.users.findUnique({
            where:{
                id: user.id
            }
        })

        if (!items || !totalPrice || !totalItems) {
            res.status(400).json({ success: false, message: "Missing required fields" });
            return;
        }
        
        try {
            // Step 1: Create the order in the database
            const order = await prisma.orders.create({
                data: {
                    customerId: user.id,
                    totalPrice,
                    totalItems,
                    vendorId: parseInt(vendorId),
                    status: 'pending',
                    shippingStatus: 'pending',
                    billingAddressId: parseInt(billingAddressId),
                    shippingAddressId: parseInt(shippingAddressId),
                    order_items: {
                        create: items.map((item: any) => ({
                            productId: item.productId,
                            vendorId: item.vendorId,
                            quantity: item.quantity,
                            price: item.price,
                            discount: item.discount,
                            total: item.total,
                        })),
                    },
                },
            });
            
            console.log('userDetails?.stripeCustomerId: ', userDetails?.stripeCustomerId);
            
            // Step 2: Create a PaymentIntent with Stripe
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(totalPrice * 100), // Stripe expects amount in cents
                currency: 'usd', // Change to your currency
                customer: userDetails?.stripeCustomerId ? userDetails?.stripeCustomerId : "",
                metadata: { orderId: order.id },
            });
            console.log('paymentIntent: ', paymentIntent);
            
            // Step 3: Save the payment information in the database
            await prisma.payments.create({
                data: {
                    orderId: order.id,
                    stripeId: paymentIntent.id,
                    amount: totalPrice,
                    status: 'pending',
                    vendorId: vendorId,
                    platformFee: paymentDetails?.platformFee || 0,
                },
            });

            // Step 4: Send back the Payment Intent client secret to the front-end
            res.status(201).json({
                success: true,
                message: 'Order created successfully',
                data: { clientSecret: paymentIntent.client_secret, orderId: order.id },
            });
        } catch (error) {
            console.error("Error creating order and payment:", error);
            res.status(500).json({ success: false, message: "Error creating order and payment" });
        }
    }

    // Get All Orders (for admin or order list view)
    static async listOrder(req: any, res: Response): Promise<void> {
        try {
            const { search, orderStatus, paymentStatus, page, rowsPerPage } = req.query;

            let vendor: any = await prisma.vendor_profiles.findFirst({
                where: {
                    userId: req.user.id
                }
            });

            // let where: any = {
            //     vendorId: vendor.id
            // };

            let where: any = req.user.role === 'super_admin' ? {} : {
                vendorId: vendor.id
            };
            
            if (search) {
                where = {
                    ...where,
                    customer:{ email: { contains: search, mode: 'insensitive' } }
                };
            }

            if (orderStatus) {
                where = {
                    ...where,
                    status: orderStatus
                };
            }

            if (paymentStatus) {
                where = {
                    ...where,
                    payment:{
                        some:{
                            status: paymentStatus
                        }
                    }
                };
            }
            
            const orders = await prisma.orders.findMany({
                where: where,
                orderBy: {
                    createdAt: "desc"
                },
                include: {
                    order_items: true,
                    payment: true,
                    customer: true
                },
                skip: parseInt(page)*parseInt(rowsPerPage),
                take: parseInt(rowsPerPage)
            });
            const totalCount = await prisma.orders.count({ where });
            res.status(200).json({ success: true, data: orders, totalCount });
            return;
        } catch (error) {
            console.error("Error fetching orders:", error);
            res.status(500).json({ success: false, message: "Error fetching orders" });
        }
    }

    static async getRateData(data: any){
        let packages = data.order_items?.map((data: any) => ({
            type: "box",
            content: "shoes",
            amount: 1,
            name: data.product.titleEn,
            declaredValue: 1,
            lengthUnit: data.product.attributes.dimensions_type,
            weightUnit: data.product.attributes.weight_type,
            weight: data.product.attributes.weight,
            dimensions: {
                length: data.product.attributes.length,
                width: data.product.attributes.width,
                height: data.product.attributes.height
            }
        })) || [];
        return {
            "origin": {
                "number": "123",
                "postalCode": data.vendor.postalCode,
                "company": "Envia",
                "name": data.vendor.vendorFullName,
                "email": data.vendor.email,
                "phone": data.vendor.whatsappNumber,
                "country": "MX",
                "phone_code": "MX",
                "street": data.vendor.storeLocation,
                "district": "Centro",
                "city": data.vendor.cities.name,
                "state": data.vendor.state.isoCode
            },
            "destination": {
                "number": "2470",
                "postalCode": data.shippingAddress.zipCode,
                "company": "Test",
                "name": data.shippingAddress.receiverName,
                "phone": data.shippingAddress.receiverPhone,
                "country": "MX",
                "phone_code": "MX",
                "street": data.shippingAddress.address,
                "district": "Centro",
                "city": data.shippingAddress.cities.name,
                "state": data.shippingAddress.state.isoCode
            },
            "packages": packages,
            "settings": {
                "currency": "MXN",
                "printFormat": "PDF",
                "printSize": "PAPER_7X4.75"
            },
            "shipment": {
                "carrier": data.carrier,
                "service": "ground",
                "reverse_pickup": 0,
                "type": 1
            }
        };
    }

    static async getOrder(req: any, res: Response): Promise<void> {
        try {
            const { id } = req.query;
           
            let where: any = {
                id: parseInt(id)
            };

            const order = await prisma.orders.findUnique({
                where: where,
                include: {
                    order_items: {
                        include:{
                            product: true
                        }
                    },
                    payment: true,
                    customer: {
                        include:{
                            addresses: true
                        }
                    },
                    billingAddress: {
                        include:{
                            state: true,
                            cities: true,
                            countries: true
                        }
                    },
                    shippingAddress: {
                        include:{
                            state: true,
                            cities: true,
                            countries: true,
                            users: true
                        }
                    },
                    vendor: {
                        include: {
                            cities: true,
                            state: true
                        }
                    }
                },
            });

            console.log(order);

            let data = await OrderController.getRateData(order);
            const token = process.env.ENVIA_API_KEY;
            const getShippingRate = await axios.post("https://api-test.envia.com/ship/rate/", data, {
                headers:{
                    Authorization: `Bearer ${token}`
                }
            })
            res.status(200).json({ success: true, data: order, shippingData: getShippingRate.data });
            return;
        } catch (error) {
            console.error("Error fetching orders:", error);
            res.status(500).json({ success: false, message: "Error fetching orders" });
        }
    }

    static async getShippingData(req: any, res: Response): Promise<void> {
        try {
            const { id } = req.query;
            const token = process.env.ENVIA_API_KEY;
            let allShippingData: any = [];
            await ["mensajerosUrbanos", "tresGuerras", "almex", "noventa9Minutos", "paquetexpress", "redpack", "dhl", "fedex"].map(async (item: any) =>{
                let data = {
                    "origin": {
                        "number": "123",
                        "postalCode": "64600",
                        "company": "Envia",
                        "name": "Edwin TEST",
                        "email": "Noreply@envia.com",
                        "phone": "8181818111",
                        "country": "MX",
                        "phone_code": "MX",
                        "street": "Belisario dominguez",
                        "district": "Centro",
                        "city": "Monterrey",
                        "state": "NL"
                    },
                    "destination": {
                        "number": "2470",
                        "postalCode": "64600",
                        "company": "Test",
                        "name": "Edwin carrasco",
                        "phone": "8129024699",
                        "country": "MX",
                        "phone_code": "MX",
                        "street": "belisario dominguez",
                        "district": "Centro",
                        "city": "Monterrey",
                        "state": "NL"
                    },
                    "packages": [
                    {
                        "type": "box",
                        "content": "artesania",
                        "amount": 1,
                        "name": "paquete mediano",
                        "declaredValue": 0,
                        "lengthUnit": "CM",
                        "weightUnit": "KG",
                        "weight": 1,
                        "dimensions": {
                        "length": 20,
                        "width": 20,
                        "height": 15
                        }
                    }
                    ],
                    "settings": {
                        "currency": "MXN",
                        "printFormat": "PDF",
                        "printSize": "PAPER_7X4.75"
                    },
                    "shipment": {
                        "carrier": item,
                        "service": "ground",
                        "reverse_pickup": 0,
                        "type": 1
                    }
                };
                await axios.post("https://api-test.envia.com/ship/rate/", data, {
                    headers:{
                        "Authorization": `Bearer ${token}`
                    }
                } ).then((data: any) => {
                    console.log('data: ', data);
                    allShippingData.push(data.data);
                })}
            )
            if(allShippingData.length === 8){
                res.status(200).json({ success: true, allShippingData: allShippingData });
            }
        } catch (error) {
            console.error("Error fetching orders:", error);
            res.status(500).json({ success: false, message: "Error fetching orders" });
        }
    }

    static async cancelOrder(req: any, res: Response): Promise<void> {
        try {
            const { orderIds } = req.query;
            const ids = orderIds.split(",");
            const orders: any = await prisma.orders.updateMany({
                where: {
                    id:{
                        in: ids
                    }
                },
                data: {
                    status: "canceled"
                }
            });
            console.log('orders: ', orders);
            for (let index = 0; index < orders.length; index++) {
                const element = orders[index];
                console.log('element: ', element);
                const refund = await this.refundOrder(orders[index]);
                console.log('refund: ', refund);
            }
            const ordersRefund: any = await prisma.orders.updateMany({
                where: {
                    id:{
                        in: ids
                    }
                },
                data: {
                    status: "refunded"
                }
            });
            res.status(200).json({ success: true, data: orders });
        } catch (error) {
            console.error("Error fetching orders:", error);
            res.status(500).json({ success: false, message: "Error fetching orders" });
        }
    }

    static async refundOrder(order: any){
        const refund = await stripe.refunds.create({
            charge: order.payments.stripeId,
        });
        console.log('refund: ', refund);
        return refund;
    }

    // Create Stripe Checkout Session and get the URL
    static async createCheckoutSession(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { orderId } = req.body;

        try {
            const order = await prisma.orders.findUnique({
                where: { id: orderId },
                include: { order_items: {
                    include: {
                        product: true
                    }
                } },
            });
            console.log('order: ', order);
            
            if (!order) {
                res.status(404).json({ success: false, message: 'Order not found' });
                return;
            }

            let line_items: any = order.order_items.map((item: any) => ({
                price_data: {
                    currency: 'inr',
                    product_data: {
                        name: item.product.nameEn,
                        description: item.product.descriptionEn,
                    },
                    unit_amount: Math.round(item.total * 100),
                },
                quantity: item.quantity,
            }));
            console.log('line_items: ', line_items);
            console.log('line_items: ', line_items.length);
            console.log('line_items: ', line_items[0].product_data);
            
            // Create a Checkout Session
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: order.order_items.map((item: any) => ({
                  price_data: {
                    currency: 'inr',
                    product_data: {
                      name: item.product.titleEn,
                      description: item.product.descriptionEn || '',
                    },
                    unit_amount: Math.round(item.price * 100),
                  },
                  quantity: item.quantity,
                })),
                mode: 'payment',
                success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
                metadata: { orderId: order.id },
              });
            
            console.log('session: ', session);
            // // Send session URL to front-end
            res.status(200).json({ success: true, url: session.url });
            // res.status(200).json({ success: true, order: order});
        } catch (error) {
            console.error("Error creating Stripe Checkout session:", error);
            res.status(500).json({ success: false, message: "Error creating Stripe Checkout session" });
        }
    }

    static async generateShipping(req: any, res: Response): Promise<void> {
        try{
            const user = req.user;

            const vendor: any = await prisma.vendor_profiles.findFirst({
                where:{
                    userId: user.id,
                },
                include:{
                    state: true,
                    cities: true
                }
            })

            let details: any = await axios.get(`https://geocodes.envia.com/zipcode/MX/${vendor.postalCode}`);
           
            const { order_id, from, to, items, declaredValue, carriers } = req.body;
            console.log('carriers: ', carriers);

            console.log('items: ', items);
            
            let packages = items?.map((data: any) => ({
                type: data.product.packType,
                content: data.product.content,
                amount: data.product.boxQuantity,
                name: data.product.titleEn,
                declaredValue: 0,
                lengthUnit: data.product.attributes.dimensions_type,
                weightUnit: data.product.attributes.weight_type,
                weight: data.product.attributes.weight,
                dimensions: {
                    length: data.product.attributes.length,
                    width: data.product.attributes.width,
                    height: data.product.attributes.height
                }
            })) || [];

            let itemName = items?.map((data: any) => (
                data.product.titleEn
            ));
            
            let data = {
                "origin": {
                    "number": "123",
                    "postalCode": details.data[0]?.zip_code || "",
                    "company": vendor.storeName,
                    "name": vendor.vendorFullName,
                    "email": vendor.email,
                    "phone": vendor.whatsappNumber,
                    "country": "MX",
                    "phone_code": "MX",
                    "street": vendor.storeLocation,
                    "district": details.data[0]?.suburbs?.[0] || "",
                    "city": details.data[0]?.locality || "",
                    "state": details.data[0]?.state?.code?.["2digit"] || ""
                },
                "destination": {
                    "number": "2470",
                    "postalCode": details.data[0]?.zip_code, //to.zipCode,
                    "company": "Test",
                    "name": to.receiverName,
                    "email": to.users?.email || "",
                    "phone": to.receiverPhone,
                    "country": "MX",
                    "phone_code": "MX",
                    "street": to.address,
                    "district": details.data[0]?.suburbs?.[0] || "",
                    "city": to.cities?.name || "",
                    "state": details.data[0]?.state?.code?.["2digit"] || ""
                },
                "packages": packages,
                "settings": {
                    "currency": "MXN",
                    "printFormat": "PDF",
                    "printSize": "PAPER_7X4.75"
                },
                "shipment": {
                    "carrier": carriers,
                    "service": "ground",
                    "reverse_pickup": 0,
                    "type": 1
                }
            };

            console.log('data: ', data);
            
            const token = process.env.ENVIA_API_KEY;
            let shipment = await axios.post("https://api-test.envia.com/ship/generate/", data, {
                headers:{
                    "Authorization": `Bearer ${token}`
                }
            });
            console.log('shipment: ', shipment);
            
            let updateOrder = await prisma.orders.update({
                where:{
                    id: parseInt(order_id)
                },
                data:{
                    trackingNumber: shipment.data.data[0].trackingNumber,
                    trackUrl: shipment.data.data[0].trackUrl, 
                    shipmentId: shipment.data.data[0].shipmentId,
                    label: shipment.data.data[0].label,
                    carrier: shipment.data.data[0].carrier,
                    service: shipment.data.data[0].service,
                    totalShipingPrice: shipment.data.data[0].totalPrice,
                    status: "shipped"
                },
                include:{
                    order_items: {
                        include:{
                            product: true
                        }
                    },
                    payment: true,
                    customer: {
                        include:{
                            addresses: true
                        }
                    },
                    billingAddress: {
                        include:{
                            state: true,
                            cities: true,
                            countries: true
                        }
                    },
                    shippingAddress: {
                        include:{
                            state: true,
                            cities: true,
                            countries: true,
                            users: true
                        }
                    }
                }
            });
            // to.users?.email
            console.log(to.users?.email);
            await emailService.sendEmail("jeyaro3327@erapk.com", "Order Shipped", `Order Containing items ${itemName.toString()} Shipped.`);
            res.status(200).json({ success: true, data: shipment.data.data, order: updateOrder });
        }catch(error: any){
            console.error("Shipping error:", error.response?.data || error.message);
            if (error.response) {
                res.status(error.response.status).json({
                    success: false,
                    error: error.response.data.error || "Failed to create shipping"
                });
                return;
            }
            res.status(500).json({ success: false, error: "Internal Server Error" });
        }
    }

    static async getAllCarriers(req: any, res: Response): Promise<void> {
        try{
            const token = process.env.ENVIA_API_KEY;
            let carrier = await axios.get("https://queries-test.envia.com/available-carrier/MX/0", {
                headers:{
                    "Authorization": `Bearer ${token}`
                }
            });
            console.log('carrier: ', carrier.data);
            res.status(200).json({ success: true, data: carrier.data.data });
        }catch(error: any){
            console.error("carrier error:", error.response?.data || error.message);
            if (error.response) {
                res.status(error.response.status).json({
                    success: false,
                    error: error.response.data.error || "Failed to get carrier"
                });
                return;
            }
            res.status(500).json({ success: false, error: "Internal Server Error" });
        }
    }

    static async shedulePickup(req: any, res: Response): Promise<void> {
        try{
            const user = req.user;

            const vendor: any = await prisma.vendor_profiles.findFirst({
                where:{
                    userId: user.id,
                },
                include:{
                    state: true,
                    cities: true
                }
            })
            const { timeFrom ,timeTo, date, instructions, totalPackages, totalWeight } = req.body;

            let details: any = await axios.get(`https://geocodes.envia.com/zipcode/MX/${vendor.postalCode}`);
          
            let data = {
                "origin": {
                    "name": vendor.vendorFullName,
                    "company": vendor.storeName,
                    "email": vendor.email,
                    "phone": vendor.whatsappNumber,
                    "street": vendor.storeLocation,
                    "number": "1400",
                    "district":  details.data[0]?.suburbs?.[0] || "",
                    "city": vendor.cities?.name || "",
                    "state": details.data[0]?.state?.code?.["2digit"] || "",
                    "country": "MX",
                    "postalCode": vendor.postalCode
                },
                "shipment": {
                    "carrier": "fedex",
                    "type": 1,
                    "pickup": {
                        "timeFrom": timeFrom,
                        "timeTo": timeTo,
                        "date": date,
                        "instructions": instructions,
                        "totalPackages": totalPackages,
                        "totalWeight": totalWeight
                    }
                },
                "settings": {
                    "currency": "MXN",
                    "labelFormat": "pdf"
                }
            };

            const token = process.env.ENVIA_API_KEY;
            // try{
                let pickup = await axios.post("https://api-test.envia.com/ship/pickup/", data, {
                    headers:{
                        "Authorization": `Bearer ${token}`
                    }
                });
                console.log('pickup: ', pickup);
                res.json(pickup.data);
        }catch(error: any){
            console.error("Pickup error:", error.response?.data || error.message);
            if (error.response) {
                res.status(error.response.status).json({
                    success: false,
                    error: this.getErrorStatus(error.response.data.error) || "Failed to schedule pickup"
                });
                return;
            }

            res.status(500).json({ success: false, error: "Internal Server Error" });
        }
    }

    static async successOrderPayment(){
        // const htmlBody = emailTemplate.html.replace('{user}', `${doneBooking.user.first_name || ''} ${doneBooking.user.last_name || ''}`)
        //         .replace('{ground}', doneBooking.ground.ground_name)
        //         .replace('{address}', doneBooking.ground.ground_address)
        //         .replace('{location}', `<a href=${`https://maps.google.com/?q=${doneBooking.ground.latitude},${doneBooking.ground.longitude}`} target='__blank'>Click here</a>`);

        //     const generatedHtmlInvoice = await Utils.generateInvoiceHTML(doneBooking);

        //     const uploadPath = path.join(__dirname, '../../upload/invoices');
        //     if (!fs.existsSync(uploadPath)) {
        //         fs.mkdirSync(uploadPath, { recursive: true });
        //     }

        //     const outputPath = path.join(uploadPath, `invoice_${doneBooking.id}.pdf`);

        //     await Utils.generateInvoicePDF(generatedHtmlInvoice, outputPath);

        //     await emailService.sendEmailWithAttachment(doneBooking.user.email, emailTemplate.subject, htmlBody, outputPath);
    }

    static async getErrorStatus(error: any){
        switch (error) {
            case "PICKUPDATE.TOO.FAR - GENERIC.ERROR":
                return "Pickup date issues. Try diffrent dates.";
                break;
            default:
                break;
        }
    }

    static async generateInvoice (req: any, res: Response): Promise<void> {
        const { id } = req.query;
           
        let where: any = {
            id: parseInt(id)
        };

        const order: any = await prisma.orders.findUnique({
            where: where,
            include: {
                order_items: {
                    include:{
                        product: true
                    }
                },
                payment: true,
                customer: {
                    include:{
                        addresses: true
                    }
                },
                billingAddress: {
                    include:{
                        state: true,
                        cities: true,
                        countries: true
                    }
                },
                shippingAddress: {
                    include:{
                        state: true,
                        cities: true,
                        countries: true,
                        users: true
                    }
                },
                vendor: {
                    include: {
                        cities: true,
                        state: true
                    }
                }
            },
        });

        const generatedHtmlInvoice = await Utils.generateInvoiceHTML(order);
        const uploadPath = path.join(__dirname, '../../uploads/invoices');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        const outputPath = path.join(uploadPath, `invoice_${order.id}.pdf`);

        await Utils.generateInvoicePDF(generatedHtmlInvoice, outputPath);

        res.status(200).json({ success: true, url: `${process.env.BASE_URL}uploads/invoices/invoice_${order.id}.pdf` });
    }

}
