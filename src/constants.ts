export const NEWLINE = "\n";
export const CARRIAGE_RETURN = "\r";
export const UTF8_BOM = "\ufeff";

export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;
export const US_PER_MS = 1000;
export const NS_PER_MS = 1_000_000;
export const US_PER_MS_BI = 1000n;
export const NS_PER_MS_BI = 1_000_000n;

/** Separates composite key segments within a single row hash (e.g. multi-column join keys). */
export const KEY_SEPARATOR = "\x00";
/** Separates key-value pairs within a serialized object or map canonical hash. */
export const KEY_PAIR_SEPARATOR = "\x01";
/** Sentinel value used in join left-index arrays to indicate a right-only (unmatched) row. */
export const UNMATCHED_ROW_INDEX = -1;
