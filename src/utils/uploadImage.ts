import { Utils } from "./utils";
import fs from "fs";
import path from "path";

export const imageUpload = async (image: any, uploadPath: string) => {
    try {
        const random = Utils.genrateRandomNumber();
      
        let ext: any;
        let buffer: Buffer;

        if (image.data) {
            const { mimetype } = image;
            console.log('mimetype: ', mimetype);
            ext = Utils.getExtension(mimetype);

            // Ensure correct Base64 decoding
            buffer = Buffer.from(image.data, "base64");
        } else {
            throw new Error("Invalid image data");
        }

        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        const filePath = path.join(uploadPath, `${random}${ext}`);
        const fileName = `${random}${ext}`;

        await fs.promises.writeFile(filePath, buffer);
        
        return fileName;
    } catch (e) {
        console.error("Error uploading image:", e);
        return false;
    }
};
