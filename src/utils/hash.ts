import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    console.log('bcrypt.compare(password, hash): ', bcrypt.compare(password, hash));
    return await bcrypt.compare(password, hash);
};