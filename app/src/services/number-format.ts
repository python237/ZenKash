/**
 * Number Format Service
 *
 * Thousands are always separated by a visible space ("1 000 000"). Intl uses a
 * narrow no-break space for French since CLDR 34, which some fonts and old
 * WebViews render with almost no width ("1000000"): every displayed amount is
 * normalized to a regular no-break space instead.
 * @module services/number-format
 */

/** Regular no-break space: visible, and keeps an amount on one line */
export const GROUP_SEPARATOR = '\u00a0';

/**
 * Replaces narrow/thin spaces produced by Intl with a regular no-break space.
 * @param text - A formatted number or amount
 * @returns The text with visible thousands separators
 */
export function normalizeSpaces(text: string): string {
    return text.replace(/[\u202f\u2009\u2007]/g, GROUP_SEPARATOR);
}

/**
 * Groups the digits of an integer string by thousands ("1234567" → "1 234 567").
 * @param digits - A string of digits, without sign or decimals
 * @returns The grouped digits
 */
export function groupDigits(digits: string): string {
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
}

/**
 * Formats a number for an input field: grouped thousands, decimal comma,
 * decimals kept as they are (no rounding), empty for zero.
 * @param value - The numeric value
 * @returns The text to display in the field
 */
export function formatInputNumber(value: number): string {
    if (!value || !isFinite(value)) return '';
    const sign = value < 0 ? '-' : '';
    const [intPart = '0', decimalPart] = String(Math.abs(value)).split('.');
    return sign + groupDigits(intPart) + (decimalPart ? `,${decimalPart}` : '');
}

/**
 * Cleans what the user typed in a number field and re-groups it, keeping a
 * trailing decimal separator or trailing zeros while typing ("12 500," stays).
 * @param raw - The raw field text
 * @param allowNegative - Whether a leading minus sign is accepted
 * @returns The display text and the parsed numeric value
 */
export function parseInputNumber(
    raw: string,
    allowNegative: boolean,
): { text: string; value: number } {
    const negative = allowNegative && raw.trim().startsWith('-');
    // Accept both "," and "." as decimal separator; drop everything else
    const cleaned = raw.replace(/\./g, ',').replace(/[^\d,]/g, '');
    const commaIndex = cleaned.indexOf(',');
    const intDigits = (commaIndex === -1 ? cleaned : cleaned.slice(0, commaIndex)).replace(
        /^0+(?=\d)/,
        '',
    );
    const decimals = commaIndex === -1 ? null : cleaned.slice(commaIndex + 1).replace(/,/g, '');

    const sign = negative ? '-' : '';
    const text =
        intDigits === '' && decimals === null
            ? sign
            : sign + groupDigits(intDigits || '0') + (decimals !== null ? `,${decimals}` : '');

    const numeric = parseFloat(`${intDigits || '0'}.${decimals || '0'}`);
    return { text, value: negative ? -numeric : numeric };
}
