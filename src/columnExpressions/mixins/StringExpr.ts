import type { IExpr } from "../../types";
import { ExprBase, derive } from "../ExprBase";
import { kleeneUnary, kleeneBinary } from "../utils";
import {
    toValidDate,
    toValidDecimal,
    toValidInt,
    toValidTime,
    strptime,
    stripChars,
    StripCharsOptions,
    isRegExp
} from "../../utils";

export class StringExprNamespace {
    constructor(public expr: any) { }

    _deriveString(fn: (v: string) => any) {
        return derive(this.expr, kleeneUnary((v) => fn(String(v))));
    }

    _patternGuard(pattern: any, fn: () => any) {
        if (pattern == null) {
            return derive(this.expr, (vArray) => new Array(vArray.length).fill(null));
        }
        return fn();
    }

    concat(other: string | IExpr) {
        return derive(this.expr, kleeneBinary(this.expr, other, (v, o) => String(v) + String(o)));
    }

    contains(pattern: string | RegExp) {
        return this._patternGuard(pattern, () =>
            this._deriveString((str) => isRegExp(pattern) ? pattern.test(str) : str.includes(pattern))
        );
    }

    count_matches(pattern: string | RegExp) {
        return this._patternGuard(pattern, () =>
            this._deriveString((str) => {
                if (isRegExp(pattern)) {
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
            })
        );
    }

    decode_uri_component() {
        return this._deriveString((str) => {
            try {
                return decodeURIComponent(str);
            } catch {
                return str;
            }
        });
    }

    encode_uri_component() {
        return this._deriveString((str) => {
            try {
                return encodeURIComponent(str);
            } catch {
                return str;
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
        return this._patternGuard(pattern, () =>
            this._deriveString((str) => {
                const match = str.match(pattern);
                if (!match) return null;
                return match[group] !== undefined ? match[group] : null;
            })
        );
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

    replace(
        pattern: string | RegExp,
        replacement: string | ((match: string, ...args: any[]) => string)
    ) {
        return this._patternGuard(pattern, () =>
            this._deriveString((str) => str.replace(pattern, replacement as any))
        );
    }

    replace_all(
        pattern: string | RegExp,
        replacement: string | ((match: string, ...args: any[]) => string)
    ) {
        return this._patternGuard(pattern, () =>
            this._deriveString((str) => str.replaceAll(pattern, replacement as any))
        );
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

    strip_chars(characters?: string | RegExp, options?: StripCharsOptions) {
        return this._deriveString((str) => stripChars(str, characters, { mode: "both", ...options }));
    }

    strip_chars_end(characters?: string | RegExp, options?: StripCharsOptions) {
        return this._deriveString((str) => stripChars(str, characters, { mode: "end", ...options }));
    }

    strip_chars_start(characters?: string | RegExp, options?: StripCharsOptions) {
        return this._deriveString((str) => stripChars(str, characters, { mode: "start", ...options }));
    }

    strip_prefix(prefix: string) {
        return this._deriveString((str) => {
            return stripChars(str, prefix, {
                mode: "start",
                maxScanStart: 1,
                maxMatchesStart: 1,
                returnStringOnNull: true,
                stringOptions: { literal: true }
            }) as string;
        });
    }

    strip_suffix(suffix: string) {
        return this._deriveString((str) => {
            return stripChars(str, suffix, {
                mode: "end",
                maxScanEnd: 1,
                maxMatchesEnd: 1,
                returnStringOnNull: true,
                stringOptions: { literal: true }
            }) as string;
        });
    }

    strptime(format: string, strict: boolean = true) {
        return this._deriveString((str) => strptime(str, format, strict));
    }

    to_date() {
        return this._deriveString((str) => toValidDate(str, { dateOnly: true }));
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
        return this._deriveString(toValidTime);
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

export class StringExpr extends ExprBase {
    get str() {
        return new StringExprNamespace(this);
    }
}
