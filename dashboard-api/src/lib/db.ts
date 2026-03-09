import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL as string, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
});

export default sql;
