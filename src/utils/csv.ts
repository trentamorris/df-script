/** @internalfile */
import type { ColumnDict } from "../types";
import { strftime, toValidDate } from "./date";
import { createSafeJsonReplacer, type SafeJsonReplacerOptions } from "./json";
import { formatNumber, toValidNumber, toValidBigInt, type NumericFormatOptions } from "./number";
import { NEWLINE, CARRIAGE_RETURN, UTF8_BOM } from "../dataframe/constants";
import { DataType, Utf8, Boolean as BoolType, Int64, Float64, Datetime } from "../datatypes";
import type { ReadCSVOptions } from "../dataframe/types";
import { unboxPrimitiveObj } from "./object";

export interface FormatCSVValueOptions {
    /**
     * The string representation to use for null/missing values.
     * @default ""
     */
    nullValue?: string;

    /**
     * Custom format string for Date values (e.g. "%Y-%m-%d").
     */
    dateFormat?: string;

    /**
     * Custom format string for Time values (e.g. "%H:%M:%S").
     */
    timeFormat?: string;

    /**
     * Custom format string for Datetime values (e.g. "%Y-%m-%d %H:%M:%S").
     */
    datetimeFormat?: string;

    /**
     * Options for numeric formatting (floats, ints, bigints).
     */
    numericFormatOptions?: NumericFormatOptions;

    /**
     * Options for the safe JSON replacer used when formatting objects/arrays.
     */
    replacerOptions?: SafeJsonReplacerOptions;
}

export interface WriteCSVOptions extends FormatCSVValueOptions {
    /**
     * Whether to write the header row.
     * @default true
     */
    includeHeader?: boolean;

    /**
     * Character that separates fields.
     * @default ","
     */
    separator?: string;

    /**
     * The string used to end each row.
     * @default "\n"
     */
    lineTerminator?: string;

    /**
     * The character used for quoting fields.
     * @default '"'
     */
    quoteChar?: string;

    /**
     * Defines when to use quotes.
     * - "necessary": Quotes only when required (e.g., value contains separator, quote_char, or newlines).
     * - "always": Quotes every field.
     * - "never": Never quotes fields.
     * - "non_numeric": Quotes all fields that are non-numeric.
     * @default "necessary"
     */
    quoteStyle?: "necessary" | "always" | "never" | "non_numeric";

    /**
     * Whether to include a Byte Order Mark (BOM) at the start of the file.
     * @default false
     */
    includeBom?: boolean;
}

// Removed stringifyCsvObject

function formatCsvValueInternal(options: FormatCSVValueOptions = {}) {
    const nullValue = options.nullValue !== undefined ? options.nullValue : "";
    const formatNum = formatNumber(options.numericFormatOptions);
    const replacerOptions = options.replacerOptions || {};

    const formatDate = (v: Date): string => {
        if (options.datetimeFormat) return strftime(v, { format: options.datetimeFormat });
        if (options.dateFormat) return strftime(v, { format: options.dateFormat });
        if (options.timeFormat) return strftime(v, { format: options.timeFormat });
        return v.toISOString();
    };

    const replacer = createSafeJsonReplacer({
        formatDate,
        ...replacerOptions
    });

    const hasCustomBigInt = typeof replacerOptions.onBigInt === "function";

    return (val: any): { str: string; isNumeric: boolean } => {
        if (val === null || val === undefined || typeof val === "symbol" || typeof val === "function") {
            return { str: nullValue, isNumeric: false };
        }

        if (typeof val === "bigint" && !hasCustomBigInt && !replacerOptions.voidBigIntReplacement) {
            return { str: formatNum(val), isNumeric: true };
        }

        const raw = replacer.call(null, "", val);
        const processed = unboxPrimitiveObj(raw);

        if (processed === null || processed === undefined || typeof processed === "symbol" || typeof processed === "function") {
            return { str: nullValue, isNumeric: false };
        }

        if (typeof processed === "string") return { str: processed, isNumeric: false };
        if (typeof processed === "number" || typeof processed === "bigint") {
            return { str: formatNum(processed), isNumeric: true };
        }
        if (typeof processed === "boolean") return { str: processed ? "true" : "false", isNumeric: false };

        if (typeof processed === "object") {
            // Instantiate a fresh replacer specifically for nested stringification
            // to avoid state carry-over (such as visited circular reference sets)
            return {
                str: JSON.stringify(processed, createSafeJsonReplacer({
                    formatDate,
                    ...replacerOptions
                })),
                isNumeric: false
            };
        }

        return { str: String(processed), isNumeric: false };
    };
}

export function formatCsvValue(options: FormatCSVValueOptions = {}) {
    const formatted = formatCsvValueInternal(options);
    return (val: any): string => formatted(val).str;
}

export function stringifyCSV(
    columns: ColumnDict,
    height: number,
    options: WriteCSVOptions & { onRow?: (rowStr: string) => void } = {}
): string {
    const {
        separator = ",",
        quoteChar = '"',
        includeHeader = true,
        lineTerminator = NEWLINE,
        quoteStyle = "necessary",
        includeBom = false,
        onRow,
        ...formatOptions
    } = options;

    const keys = Object.keys(columns);
    const numKeys = keys.length;
    const lines: string[] = [];
    let isFirstRow = true;

    const formatValue = formatCsvValueInternal(formatOptions);

    const escapeAndQuote = (val: any, isHeader = false): string => {
        let strVal: string;
        let isNumeric = false;

        if (isHeader) {
            strVal = String(val);
        } else {
            const formatted = formatValue(val);
            strVal = formatted.str;
            isNumeric = formatted.isNumeric;
        }

        if (quoteStyle === "never") {
            return strVal;
        }

        if (quoteStyle === "always") {
            const escaped = strVal.split(quoteChar).join(quoteChar + quoteChar);
            return quoteChar + escaped + quoteChar;
        }

        if (quoteStyle === "non_numeric") {
            if (!isNumeric && val != null) {
                const escaped = strVal.split(quoteChar).join(quoteChar + quoteChar);
                return quoteChar + escaped + quoteChar;
            }
        }

        // Default: "necessary"
        const needsQuoting =
            strVal.includes(separator) ||
            strVal.includes(quoteChar) ||
            strVal.includes(NEWLINE) ||
            strVal.includes(CARRIAGE_RETURN);

        if (needsQuoting) {
            const escaped = strVal.split(quoteChar).join(quoteChar + quoteChar);
            return quoteChar + escaped + quoteChar;
        }
        return strVal;
    };

    const outputLine = (line: string) => {
        if (isFirstRow) {
            const initial = includeBom ? UTF8_BOM + line : line;
            if (onRow) {
                onRow(initial);
            } else {
                lines.push(initial);
            }
            isFirstRow = false;
        } else {
            if (onRow) {
                onRow(lineTerminator + line);
            } else {
                lines.push(line);
            }
        }
    };

    // Headers
    if (includeHeader) {
        const headerRow = new Array(numKeys);
        for (let i = 0; i < numKeys; i++) {
            headerRow[i] = escapeAndQuote(keys[i], true);
        }
        outputLine(headerRow.join(separator));
    }

    // Rows
    for (let r = 0; r < height; r++) {
        const row = new Array(numKeys);
        for (let i = 0; i < numKeys; i++) {
            row[i] = escapeAndQuote(columns[keys[i]][r], false);
        }
        outputLine(row.join(separator));
    }

    return onRow ? (includeBom ? UTF8_BOM : "") : lines.join(lineTerminator);
}

export function parseCSV(content: string, options: ReadCSVOptions = {}): string[][] {
    const separator = options.separator || ",";
    const quoteChar = options.quoteChar || '"';

    let csvContent = content;
    if (csvContent.startsWith(UTF8_BOM)) {
        csvContent = csvContent.substring(UTF8_BOM.length);
    }

    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = "";
    let inQuotes = false;
    let hasAnyData = false;
    let lastCharWasSeparator = false;

    const len = csvContent.length;
    for (let i = 0; i < len; i++) {
        const char = csvContent[i];

        if (inQuotes) {
            hasAnyData = true;
            lastCharWasSeparator = false;
            if (char === quoteChar) {
                if (i + 1 < len && csvContent[i + 1] === quoteChar) {
                    currentCell += quoteChar;
                    i++; // Skip escaped quote
                } else {
                    inQuotes = false;
                }
            } else {
                currentCell += char;
            }
        } else {
            if (char === quoteChar) {
                hasAnyData = true;
                lastCharWasSeparator = false;
                inQuotes = true;
            } else if (char === separator) {
                currentRow.push(currentCell);
                currentCell = "";
                lastCharWasSeparator = true;
            } else {
                let isLineBreak = false;
                if (char === CARRIAGE_RETURN) {
                    isLineBreak = true;
                    if (i + 1 < len && csvContent[i + 1] === NEWLINE) {
                        i++;
                    }
                } else if (char === NEWLINE) {
                    isLineBreak = true;
                }

                if (isLineBreak) {
                    if (hasAnyData || currentRow.length > 0 || currentCell !== "" || lastCharWasSeparator) {
                        currentRow.push(currentCell);
                        rows.push(currentRow);
                        currentRow = [];
                        currentCell = "";
                        hasAnyData = false;
                        lastCharWasSeparator = false;
                    }
                } else {
                    hasAnyData = true;
                    lastCharWasSeparator = false;
                    currentCell += char;
                }
            }
        }
    }

    if (hasAnyData || currentRow.length > 0 || currentCell !== "" || lastCharWasSeparator) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }

    return rows;
}

export function inferAndCoerceCSVColumn(
    values: string[],
    options: ReadCSVOptions = {}
): { type: DataType; values: any[] } {
    const nullValues = new Set(options.nullValues ?? ["", "NA", "null", "NaN"]);
    const len = values.length;

    let isAllBoolean = true;
    let isAllNumber = true;
    let isAllBigInt = true;
    let isAllDate = true;

    let hasValidData = false;

    for (let i = 0; i < len; i++) {
        const val = values[i].trim();
        if (nullValues.has(val)) continue;

        hasValidData = true;

        if (isAllBoolean) {
            const lower = val.toLowerCase();
            if (lower !== "true" && lower !== "false" && lower !== "1" && lower !== "0") {
                isAllBoolean = false;
            }
        }

        if (isAllBigInt) {
            if (toValidBigInt(val, { truncate: false }) === null) {
                isAllBigInt = false;
            }
        }

        if (isAllNumber) {
            if (toValidNumber(val, { allowNonFiniteNumbers: true }) === null) {
                isAllNumber = false;
            }
        }

        if (isAllDate) {
            if (toValidDate(val) === null) {
                isAllDate = false;
            }
        }

        // Fast exit if it's strictly a string column
        if (!isAllBoolean && !isAllNumber && !isAllBigInt && !isAllDate) {
            break;
        }
    }

    const out = new Array(len);

    if (!hasValidData || (!isAllBoolean && !isAllNumber && !isAllBigInt && !isAllDate)) {
        for (let i = 0; i < len; i++) {
            const val = values[i];
            out[i] = nullValues.has(val.trim()) ? null : val;
        }
        return { type: Utf8, values: out };
    }

    if (isAllBoolean) {
        for (let i = 0; i < len; i++) {
            const val = values[i].trim();
            if (nullValues.has(val)) {
                out[i] = null;
            } else {
                const lower = val.toLowerCase();
                out[i] = (lower === "true" || lower === "1");
            }
        }
        return { type: BoolType, values: out };
    }

    if (isAllBigInt) {
        for (let i = 0; i < len; i++) {
            const val = values[i].trim();
            out[i] = nullValues.has(val) ? null : toValidBigInt(val, { truncate: false });
        }
        return { type: Int64, values: out };
    }

    if (isAllNumber) {
        for (let i = 0; i < len; i++) {
            const val = values[i].trim();
            out[i] = nullValues.has(val) ? null : toValidNumber(val, { allowNonFiniteNumbers: true });
        }
        return { type: Float64, values: out };
    }

    if (isAllDate) {
        for (let i = 0; i < len; i++) {
            const val = values[i].trim();
            out[i] = nullValues.has(val) ? null : toValidDate(val);
        }
        return { type: Datetime, values: out };
    }

    return { type: Utf8, values: out };
}
