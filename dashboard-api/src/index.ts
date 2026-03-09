import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import authRoutes from './routes/auth.js';
import websiteRoutes from './routes/websites.js';
import analyticsRoutes from './routes/analytics.js';
import sql from './lib/db.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 8081;

if (!process.env.DATABASE_URL) {
    console.error(
        'FATAL: DATABASE_URL is not defined in environment variables.',
    );
    process.exit(1);
}

console.log('Starting Dashboard API...');
console.log(`Port: ${port}`);
console.log(
    `Database URL (masked): ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`,
);
const PgSession = connectPg(session);

// Trust proxy for secure cookies over HTTPS (Caddy)
app.set('trust proxy', 1);

app.use(
    cors({
        origin:
            process.env.CORS_ALLOWED_ORIGINS?.split(',') ||
            'http://localhost:5173',
        credentials: true,
    }),
);

app.use(express.json());

// Session management
app.use(
    session({
        store: new PgSession({
            conString: process.env.DATABASE_URL,
            tableName: 'app_sessions',
            createTableIfMissing: true,
        }),
        secret: process.env.SESSION_SECRET || 'local_dev_secret_key_change_me',
        resave: false,
        saveUninitialized: false,
        name: 'oslks_session',
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        },
    }),
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/websites', websiteRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/health', async (req, res) => {
    try {
        await sql`SELECT 1`;
        res.json({
            status: 'ok',
            service: 'dashboard-api',
            database: 'connected',
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            service: 'dashboard-api',
            database: 'disconnected',
        });
    }
});

app.get('/api/users/count', async (req, res) => {
    try {
        const result = await sql`SELECT count(*)::int FROM users`;
        res.json({ count: result[0]?.count || 0 });
    } catch (error) {
        res.status(500).json({ error: 'Database connection failed' });
    }
});

app.listen(port, () => {
    console.log(`Dashboard API listening on port ${port}`);
});
