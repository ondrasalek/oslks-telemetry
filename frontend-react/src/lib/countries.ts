/** Country display helpers (ISO 3166-1 alpha-2 codes, as stored on events). */

const names =
    typeof Intl !== 'undefined' && 'DisplayNames' in Intl
        ? new Intl.DisplayNames(['en'], { type: 'region' })
        : null;

export function countryName(code: string): string {
    try {
        return names?.of(code.toUpperCase()) ?? code;
    } catch {
        return code;
    }
}

/** Flag emoji from the two-letter code; empty for anything that isn't one. */
export function countryFlag(code: string): string {
    if (!/^[A-Za-z]{2}$/.test(code)) return '';
    return String.fromCodePoint(
        ...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)),
    );
}
