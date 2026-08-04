/**
 * Chart Service
 *
 * Single source of truth for chart colors and shared Chart.js styling.
 *
 * The categorical palette is validated for colorblind separation on a white
 * card surface (adjacent-pair CVD ΔE 9.1, normal-vision ΔE 19.6). Slots are
 * assigned in fixed order and **never cycled**: past `MAX_SERIES` entries the
 * remainder is folded into a single "other" bucket, so a color always means the
 * same thing in a given chart. Three slots sit below 3:1 contrast on white,
 * which is why every chart using this palette also ships a legend with values
 * and a list view.
 * @module services/chart
 */

/**
 * Categorical palette, in assignment order.
 * Do not reorder: the sequence is what guarantees adjacent-pair separation.
 */
export const CHART_COLORS = [
    '#2a78d6', // blue
    '#eb6834', // orange
    '#1baf7a', // aqua
    '#eda100', // yellow
    '#e87ba4', // magenta
    '#008300', // green
    '#4a3aa7', // violet
    '#e34948', // red
] as const;

/** Maximum number of distinct series before folding into an "other" bucket. */
export const MAX_SERIES = CHART_COLORS.length;

/** Neutral gray used for the folded "other" bucket. */
export const OTHER_COLOR = '#94a3b8';

/** Surface color charts are drawn on, used for the gaps between marks. */
export const CHART_SURFACE = '#ffffff';

/**
 * Returns the categorical color for a series index.
 * @param index - Zero-based position of the series
 * @returns The hex color of the matching slot, or the neutral gray past the last slot
 */
export function colorAt(index: number): string {
    return CHART_COLORS[index] ?? OTHER_COLOR;
}
