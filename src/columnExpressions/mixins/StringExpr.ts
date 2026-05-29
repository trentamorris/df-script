import type { IExpr } from "../../types";
import type { ExprConstructor } from "../types";
import { kleeneUnary, kleeneBinary, derive } from "../ExprBase";
import {
    toValidDate,
    toValidDecimal,
    toValidInt,
    TIME_PREFIX_REGEX,
    ZONE_OFFSET_REGEX,
    isValidDateObj,
    strptime
} from "../../utils";

const REGEX_ESCAPE_REGEX = /[-/\\^$*+?.()|[\]{}]/g;

export class StringExprNamespace {
    constructor(public expr: any) { }

    _deriveString(fn: (v: string) => any) {
        return derive(this.expr, kleeneUnary((v) => fn(String(v))));
    }

    concat(other: string | IExpr) {
        return derive(this.expr, kleeneBinary(this.expr, other, (v, o) => String(v) + String(o)));
    }

    contains(pattern: string | RegExp) {
        if (pattern == null) {
            return derive(this.expr, (vArray) => new Array(vArray.length).fill(null));
        }
        return this._deriveString((str) => {
            return pattern instanceof RegExp ? pattern.test(str) : str.includes(pattern);
        });
    }

    count_matches(pattern: string | RegExp) {
        if (pattern == null) {
            return derive(this.expr, (vArray) => new Array(vArray.length).fill(null));
        }
        return this._deriveString((str) => {
            if (pattern instanceof RegExp) {
                const regex = pattern.global
                    ? pattern
                    : new RegExp(pattern.source, pattern.flags + "g");
                const matches = str.match(regex);
                return matches ? matches.length : 0;
            } else {
                let count = 0;
                let pos = str.indexOf(pattern);
                while (pos !== -1) {
                    count++;
                    pos = str.indexOf(pattern, pos + pattern.length);
                }
                return count;
            }
        });
    }

    ends_with(suffix: string) {
        return this._deriveString((str) => str.endsWith(suffix));
    }

    explode() {
        return this._deriveString((str) => str.split(""));
    }

    extract(pattern: RegExp, group: number = 0) {
        if (pattern == null) {
            return derive(this.expr, (vArray) => new Array(vArray.length).fill(null));
        }
        return this._deriveString((str) => {
            const match = str.match(pattern);
            if (!match) return null;
            return match[group] !== undefined ? match[group] : null;
        });
    }

    len() {
        return this.len_chars();
    }

    len_bytes() {
        return this._deriveString((str) => new TextEncoder().encode(str).length);
    }

    len_chars() {
        return this._deriveString((str) => str.length);
    }

    lower() {
        return this._deriveString((str) => str.toLowerCase());
    }

    lpad(width: number, fill: string = " ") {
        return this._deriveString((str) => str.padStart(width, fill));
    }

    pad_end(width: number, fill: string = " ") {
        return this.rpad(width, fill);
    }

    pad_start(width: number, fill: string = " ") {
        return this.lpad(width, fill);
    }

    replace(pattern: string | RegExp, replacement: string) {
        if (pattern == null) {
            return derive(this.expr, (vArray) => new Array(vArray.length).fill(null));
        }
        return this._deriveString((str) => str.replace(pattern, replacement));
    }

    replace_all(pattern: string | RegExp, replacement: string) {
        if (pattern == null) {
            return derive(this.expr, (vArray) => new Array(vArray.length).fill(null));
        }
        return this._deriveString((str) => {
            if (pattern instanceof RegExp) {
                const regex = pattern.global
                    ? pattern
                    : new RegExp(pattern.source, pattern.flags + "g");
                return str.replace(regex, replacement);
            }
            return str.replaceAll(pattern, replacement);
        });
    }

    reverse() {
        return this._deriveString((str) => str.split("").reverse().join(""));
    }

    rpad(width: number, fill: string = " ") {
        return this._deriveString((str) => str.padEnd(width, fill));
    }

    slice(offset: number, length?: number) {
        return this._deriveString((str) => {
            const start = offset < 0 ? str.length + offset : offset;
            const end = length !== undefined ? start + length : undefined;
            return str.slice(start, end);
        });
    }

    slice_str(offset: number, length?: number) {
        return this.slice(offset, length);
    }

    split(delimiter: string) {
        return this._deriveString((str) => str.split(delimiter));
    }

    starts_with(prefix: string) {
        return this._deriveString((str) => str.startsWith(prefix));
    }

    strip(characters?: string) {
        return this.strip_chars(characters);
    }

    strip_chars(characters?: string) {
        return this._deriveString((str) => {
            if (!characters) return str.trim();
            const escaped = characters.replace(REGEX_ESCAPE_REGEX, '\\$&');
            const regex = new RegExp(`^[${escaped}]+|[${escaped}]+$`, 'g');
            return str.replace(regex, '');
        });
    }

    strip_chars_end(characters?: string) {
        return this._deriveString((str) => {
            if (!characters) return str.trimEnd();
            const escaped = characters.replace(REGEX_ESCAPE_REGEX, '\\$&');
            const regex = new RegExp(`[${escaped}]+$`, 'g');
            return str.replace(regex, '');
        });
    }

    strip_chars_start(characters?: string) {
        return this._deriveString((str) => {
            if (!characters) return str.trimStart();
            const escaped = characters.replace(REGEX_ESCAPE_REGEX, '\\$&');
            const regex = new RegExp(`^[${escaped}]+`, 'g');
            return str.replace(regex, '');
        });
    }

    strip_end(characters?: string) {
        return this.strip_chars_end(characters);
    }

    strip_prefix(prefix: string) {
        return this._deriveString((str) => {
            return str.startsWith(prefix) ? str.slice(prefix.length) : str;
        });
    }

    strip_start(characters?: string) {
        return this.strip_chars_start(characters);
    }

    strip_suffix(suffix: string) {
        return this._deriveString((str) => {
            return str.endsWith(suffix) ? str.slice(0, str.length - suffix.length) : str;
        });
    }

    strptime(format: string, strict: boolean = true) {
        return this._deriveString((str) => strptime(str, format, strict));
    }

    to_date() {
        return this._deriveString((str) => {
            const d = toValidDate(str);
            if (!d) return null;
            const copy = new Date(d);
            copy.setUTCHours(0, 0, 0, 0);
            return copy;
        });
    }

    to_datetime() {
        return this._deriveString(toValidDate);
    }

    to_decimal(precision?: number, scale?: number) {
        return this._deriveString((str) => toValidDecimal(str, { precision, scale }));
    }

    to_integer() {
        return this._deriveString((str) => toValidInt(str));
    }

    to_lowercase() {
        return this.lower();
    }

    to_time() {
        return this._deriveString((str) => {
            const d = toValidDate(str);
            if (d) return d.toISOString().split("T")[1].slice(0, 12);

            const trimmed = str.trim();
            if (TIME_PREFIX_REGEX.test(trimmed)) {
                const td = new Date(`1970-01-01T${trimmed}${ZONE_OFFSET_REGEX.test(trimmed) ? "" : "Z"}`);
                if (isValidDateObj(td)) {
                    return td.toISOString().split("T")[1].slice(0, 12);
                }
            }
            return null;
        });
    }

    to_titlecase() {
        return this._deriveString((str) => str.replace(/\b\w/g, c => c.toUpperCase()));
    }

    to_uppercase() {
        return this.upper();
    }

    trim() {
        return this.strip_chars();
    }

    trim_end() {
        return this.strip_chars_end();
    }

    trim_start() {
        return this.strip_chars_start();
    }

    upper() {
        return this._deriveString((str) => str.toUpperCase());
    }

    zfill(width: number) {
        return this._deriveString((str) => str.padStart(width, "0"));
    }
}

export const StringExpr = <TBase extends ExprConstructor>(Base: TBase) => {
    return class extends Base {
        get str() {
            return new StringExprNamespace(this);
        }
    };
};
