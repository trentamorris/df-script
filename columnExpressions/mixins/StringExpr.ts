import type { IExpr, ExprConstructor } from "../../types"
import { kleene, derive } from "../ExprBase"

export const StringExpr = <TBase extends ExprConstructor>(Base: TBase) => {
    return class extends Base {
        concat(other: string | IExpr) {
            return derive(this, kleene((v, row) => {
                const otherVal = (this as any)._resolve(other, row);
                if (otherVal == null) return null;
                return String(v) + String(otherVal);
            }));
        }
        contains(pattern: string | RegExp) {
            if (pattern == null) {
                return derive(this, () => null);
            }
            return derive(this, kleene((v) => {
                const str = String(v);
                return pattern instanceof RegExp ? pattern.test(str) : str.includes(pattern);
            }));
        }
        ends_with(suffix: string) {
            return derive(this, kleene((v) => String(v).endsWith(suffix)));
        }
        len() {
            return derive(this, kleene((v) => String(v).length));
        }
        lower() {
            return derive(this, kleene((v) => String(v).toLowerCase()));
        }
        lpad(width: number, fill: string = " ") {
            return derive(this, kleene((v) => String(v).padStart(width, fill)));
        }
        replace_all(pattern: string | RegExp, replacement: string) {
            if (pattern == null) {
                return derive(this, () => null);
            }
            return derive(this, kleene((v) => {
                const str = String(v);
                if (pattern instanceof RegExp) {
                    const regex = pattern.global 
                        ? pattern 
                        : new RegExp(pattern.source, pattern.flags + "g");
                    return str.replace(regex, replacement);
                }
                return str.replaceAll(pattern, replacement);
            }));
        }
        rpad(width: number, fill: string = " ") {
            return derive(this, kleene((v) => String(v).padEnd(width, fill)));
        }
        slice_str(start: number, end?: number) {
            return derive(this, kleene((v) => String(v).slice(start, end)));
        }
        split(delimiter: string) {
            return derive(this, kleene((v) => String(v).split(delimiter)));
        }
        starts_with(prefix: string) {
            return derive(this, kleene((v) => String(v).startsWith(prefix)));
        }
        trim() {
            return derive(this, kleene((v) => String(v).trim()));
        }
        upper() {
            return derive(this, kleene((v) => String(v).toUpperCase()));
        }
        zfill(width: number) {
            return derive(this, kleene((v) => String(v).padStart(width, "0")));
        }
    };
};
