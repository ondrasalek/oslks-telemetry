import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import authRoutes from './routes/auth.js';
import websiteRoutes from './routes/websites.js';
import analyticsRoutes from './routes/analytics.js';
import sql from './lib/db.js';

// Only load .env if variables aren't already set by the environment (like Docker Compose)
dotenv.config({ override: false });

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

// Trust proxy correctly for multi-hop proxy chains (Traefik -> Caddy -> Node)
app.set('trust proxy', true);

// Secure CORS configuration
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['*'];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow if no origin (e.g., server-to-server), if wildcard is set, or if origin is in whitelist
            if (
                !origin ||
                allowedOrigins.includes('*') ||
                allowedOrigins.includes(origin)
            ) {
                callback(null, true);
            } else {
                console.warn(
                    `[CORS] Blocked request from unauthorized origin: ${origin}`,
                );
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    }),
);

app.use(express.json());

// Session management
const sessionStore = new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'app_sessions',
    createTableIfMissing: true,
});

sessionStore.on('error', (err) => {
    console.error('[SessionStore] Database error:', err);
});

app.use(
    session({
        store: sessionStore,
        secret: process.env.SESSION_SECRET || 'local_dev_secret_key_change_me',
        resave: false,
        saveUninitialized: false,
        name: 'oslks_session',
        cookie: {
            secure: true, // Always true since we are behind Traefik HTTPS
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        },
    }),
);

// Logging middleware
app.use((req, res, next) => {
    console.log(
        `[HTTP] ${req.method} ${req.url} (SessionID: ${req.sessionID}, UserID: ${(req.session as any).userId})`,
    );
    next();
});

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
        console.error('[Health] Check failed:', error);
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

app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Dashboard API listening on port ${port} (on 0.0.0.0)`);
});
