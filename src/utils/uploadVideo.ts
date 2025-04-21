import fs from "fs";
import path from "path";
import { Utils } from "./utils";

export const videoUpload = async (video: any, uploadPath: string) => {
    try {
        const random = Utils.genrateRandomNumber();

        let ext: any;
        let buffer: Buffer;

        if (video.data) {
            const { mimetype } = video;
            ext = Utils.getExtension(mimetype);

            // Decode Base64 string to Buffer
            buffer = Buffer.from(video.data, "base64");
        } else {
            throw new Error("Invalid video data");
        }

        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        const filePath = path.join(uploadPath, `${random}${ext}`);
        const fileName = `${random}${ext}`;

        // Write the decoded buffer to a file
        await fs.promises.writeFile(filePath, buffer);

        return fileName;
    } catch (e) {
        console.error("Error uploading video:", e);
        return false;
    }
};
