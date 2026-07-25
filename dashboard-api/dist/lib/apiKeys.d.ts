export interface GeneratedApiKey {
    /** Full plaintext secret — never persisted, never logged. */
    token: string;
    prefix: string;
    hash: string;
}
/** SHA-256 of the full token, as lowercase hex. */
export declare const hashApiKey: (token: string) => string;
export declare const generateApiKey: () => GeneratedApiKey;
/** Returns the (non-secret) prefix if the token is well-formed, else null. */
export declare const parseApiKey: (token: string) => {
    prefix: string;
} | null;
/** Constant-time comparison of two lowercase hex SHA-256 digests. */
export declare const hashesMatch: (a: string, b: string) => boolean;
//# sourceMappingURL=apiKeys.d.ts.map