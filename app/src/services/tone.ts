/**
 * Tone Service
 *
 * Maps the named colors stored on categories, wallets, etc. (Quasar palette names
 * such as "teal" or "orange") onto the calm 1.0 palette: a deep foreground color
 * for icons/text and a soft tint for tile backgrounds.
 * @module services/tone
 */

/** Foreground + soft background pair */
export interface Tone {
    /** Deep color for icons, text and chart marks */
    fg: string;
    /** Soft tint for tile and chip backgrounds */
    bg: string;
}

const NEUTRAL: Tone = { fg: '#3D4743', bg: '#E9EEEA' };

const TONES: Record<string, Tone> = {
    primary: { fg: '#0B6E5F', bg: '#D5ECE6' },
    teal: { fg: '#0B6E5F', bg: '#D5ECE6' },
    green: { fg: '#2E7D32', bg: '#DFF0DF' },
    'light-green': { fg: '#4F7A12', bg: '#E8F2D8' },
    positive: { fg: '#0B6E5F', bg: '#D5ECE6' },
    blue: { fg: '#2F4A9A', bg: '#E3E8F6' },
    'light-blue': { fg: '#1D5F8C', bg: '#DDEDF7' },
    info: { fg: '#2F4A9A', bg: '#E3E8F6' },
    indigo: { fg: '#4338A0', bg: '#E6E5F7' },
    purple: { fg: '#5B3FA0', bg: '#ECE6F8' },
    'deep-purple': { fg: '#5B3FA0', bg: '#ECE6F8' },
    pink: { fg: '#A3306B', bg: '#F8E3EE' },
    red: { fg: '#A8322D', bg: '#F9E1DF' },
    negative: { fg: '#A63E14', bg: '#FBE6DA' },
    orange: { fg: '#A63E14', bg: '#FBE6DA' },
    'deep-orange': { fg: '#A63E14', bg: '#FBE6DA' },
    amber: { fg: '#8A5A00', bg: '#F6ECD3' },
    yellow: { fg: '#8A5A00', bg: '#F6ECD3' },
    warning: { fg: '#8A5A00', bg: '#F6ECD3' },
    cyan: { fg: '#0E6A80', bg: '#DBEFF4' },
    brown: { fg: '#6D4C3D', bg: '#EFE6E1' },
    grey: NEUTRAL,
    'blue-grey': NEUTRAL,
};

/**
 * Resolves a stored color name (or hex) into a calm foreground/background pair.
 * Shade suffixes ("teal-7") are ignored; hex values get a translucent tint.
 * @param color - Named Quasar color, hex string, or undefined
 * @returns The tone to use for tiles and marks
 */
export function toneOf(color?: string | null): Tone {
    if (!color) return NEUTRAL;
    if (color.startsWith('#')) {
        return { fg: color, bg: `${color.slice(0, 7)}24` };
    }
    const base = color.replace(/-\d+$/, '');
    return TONES[base] ?? NEUTRAL;
}

/**
 * Inline style for a tile (soft background + deep icon color).
 * @param color - Named Quasar color, hex string, or undefined
 * @returns A style object for :style bindings
 */
export function toneStyle(color?: string | null): Record<string, string> {
    const tone = toneOf(color);
    return { background: tone.bg, color: tone.fg };
}
