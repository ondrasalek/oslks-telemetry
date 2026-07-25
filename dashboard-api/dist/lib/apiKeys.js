import crypto from 'node:crypto';
/**
 * API key format: oslks_<prefix>_<secret>
 *
 * – prefix: 8 hex chars, stored in clear for display and for indexed lookup.
 * – secret: 64 hex chars (256 bits of entropy).
 *
 * Only sha256(full token) is persisted; the plaintext is returned to the
 * caller exactly once, at creation time.
 */
const KEY_NAMESPACE = 'oslks';
const PREFIX_BYTES = 4; // -> 8 hex chars
const SECRET_BYTES = 32; // -> 64 hex chars
const KEY_PATTERN = new RegExp(`^${KEY_NAMESPACE}_([0-9a-f]{${PREFIX_BYTES * 2}})_([0-9a-f]{${SECRET_BYTES * 2}})$`);
/** SHA-256 of the full token, as lowercase hex. */
export const hashApiKey = (token) => crypto.createHash('sha256').update(token, 'utf8').digest('hex');
export const generateApiKey = () => {
    const prefix = crypto.randomBytes(PREFIX_BYTES).toString('hex');
    const secret = crypto.randomBytes(SECRET_BYTES).toString('hex');
    const token = `${KEY_NAMESPACE}_${prefix}_${secret}`;
    return { token, prefix, hash: hashApiKey(token) };
};
/** Returns the (non-secret) prefix if the token is well-formed, else null. */
export const parseApiKey = (token) => {
    const match = KEY_PATTERN.exec(token);
    return match ? { prefix: match[1] } : null;
};
/** Constant-time comparison of two lowercase hex SHA-256 digests. */
export const hashesMatch = (a, b) => {
    const left = Buffer.from(a, 'hex');
    const right = Buffer.from(b, 'hex');
    if (left.length !== right.length || left.length === 0)
        return false;
    return crypto.timingSafeEqual(left, right);
};
//# sourceMappingURL=apiKeys.js.map