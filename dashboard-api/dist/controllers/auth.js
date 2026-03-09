import bcrypt from 'bcryptjs';
import sql from '../lib/db.js';
export const login = async (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt for: ${email}`);
    try {
        const users = await sql `
            SELECT id, email, name, password, role 
            FROM users 
            WHERE email = ${email}
            LIMIT 1
        `;
        const user = users[0];
        if (!user || !user.password) {
            console.warn(`Login failed: user not found or no password for ${email}`);
            return res
                .status(401)
                .json({ success: false, error: 'Invalid credentials' });
        }
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.warn(`Login failed: invalid password for ${email}`);
            return res
                .status(401)
                .json({ success: false, error: 'Invalid credentials' });
        }
        // Fetch primary team membership
        const memberships = await sql `
            SELECT team_id, role
            FROM team_members
            WHERE user_id = ${user.id}::uuid
            LIMIT 1
        `;
        const membership = memberships[0];
        // Store user in session
        req.session.userId = user.id;
        console.log(`Successfully logged in user ${user.id}. Session ID: ${req.sessionID}`);
        const sessionUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            teamId: membership?.team_id || null,
            teamRole: membership?.role || null,
        };
        res.json({ success: true, user: sessionUser });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
};
export const register = async (req, res) => {
    const { name, email, password } = req.body;
    console.log(`Registration attempt for: ${email}`);
    try {
        const existing = await sql `SELECT id FROM users WHERE email = ${email}`;
        if (existing.length > 0) {
            return res
                .status(409)
                .json({ success: false, error: 'Email already in use' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        // Use a transaction for registration
        const result = await sql.begin(async (tx) => {
            const [user] = await tx `
                INSERT INTO users (name, email, password, role)
                VALUES (${name}, ${email}, ${hashedPassword}, 'user')
                RETURNING id, email, name, role
            `;
            // Create a default "Personal" team for the user
            const [team] = await tx `
                INSERT INTO teams (name)
                VALUES ('Personal')
                RETURNING id
            `;
            // Make the user the owner of the team
            await tx `
                INSERT INTO team_members (team_id, user_id, role)
                VALUES (${team.id}::uuid, ${user.id}::uuid, 'owner')
            `;
            return { user, teamId: team.id };
        });
        const { user, teamId } = result;
        if (!user) {
            throw new Error('Failed to create user');
        }
        req.session.userId = user.id;
        console.log(`Registered and logged in user ${user.id}. Created personal team ${teamId}`);
        res.status(201).json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                teamId: teamId,
                teamRole: 'owner',
            },
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
};
export const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res
                .status(500)
                .json({ success: false, error: 'Failed to logout' });
        }
        res.clearCookie('oslks_session');
        res.json({ success: true });
    });
};
export const me = async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        console.log('Auth check (me): No userId in session');
        return res.json(null);
    }
    try {
        const users = await sql `
            SELECT id, email, name, role 
            FROM users 
            WHERE id = ${userId}::uuid
            LIMIT 1
        `;
        const user = users[0];
        if (!user) {
            console.warn(`Auth check (me): User ${userId} not found in DB`);
            return res.json(null);
        }
        const memberships = await sql `
            SELECT team_id, role
            FROM team_members
            WHERE user_id = ${user.id}::uuid
            LIMIT 1
        `;
        const membership = memberships[0];
        console.log(`Auth check (me): Authenticated user ${user.id} (Email: ${user.email})`);
        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            teamId: membership?.team_id || null,
            teamRole: membership?.role || null,
        });
    }
    catch (error) {
        console.error('Auth check (me) error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
//# sourceMappingURL=auth.js.map