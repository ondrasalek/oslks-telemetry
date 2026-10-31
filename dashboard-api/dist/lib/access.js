import sql from './db.js';
/**
 * True for a logged-in superuser session. API keys never get the bypass: their
 * reach stays bounded by the owner's team memberships and the key's team scope.
 */
export const isSuperuserSession = async (req, userId) => {
    if (req.apiKey)
        return false;
    const [user] = await sql `SELECT role FROM users WHERE id = ${userId}::uuid LIMIT 1`;
    return user?.role === 'superuser';
};
//# sourceMappingURL=access.js.map