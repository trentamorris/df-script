import type { ExprConstructor } from "../../types"
import { kleene, derive } from "../ExprBase"

export const ComparisonExpr = <TBase extends ExprConstructor>(Base: TBase) => {
    return class extends Base {
        eq(val: any) { 
            return derive(this, kleene((v, row) => {
                const r = this._resolve(val, row);
                return r == null ? null : v === r;
            })); 
        }
        ne(val: any) { 
            return derive(this, kleene((v, row) => {
                const r = this._resolve(val, row);
                return r == null ? null : v !== r;
            })); 
        }
        gt(val: any) { 
            return derive(this, kleene((v, row) => {
                const r = this._resolve(val, row);
                return r == null ? null : v > r;
            })); 
        }
        ge(val: any) { 
            return derive(this, kleene((v, row) => {
                const r = this._resolve(val, row);
                return r == null ? null : v >= r;
            })); 
        }
        lt(val: any) { 
            return derive(this, kleene((v, row) => {
                const r = this._resolve(val, row);
                return r == null ? null : v < r;
            })); 
        }
        le(val: any) { 
            return derive(this, kleene((v, row) => {
                const r = this._resolve(val, row);
                return r == null ? null : v <= r;
            })); 
        } 
        is_in(values: any[]) {
            const arr = Array.isArray(values) ? values : [];
            const set = new Set(arr);
            return derive(this, kleene((v) => set.has(v)));
        }
        not_in(values: any[]) {
            const arr = Array.isArray(values) ? values : [];
            const set = new Set(arr);
            return derive(this, kleene((v) => !set.has(v)));
        }
        is_null() { 
            return derive(this, (v) => v == null); 
        }
        is_not_null() { 
            return derive(this, (v) => v != null); 
        }
        is_nan() {
            return derive(this, kleene((v) => Number.isNaN(v)));
        }
        is_not_nan() {
            return derive(this, kleene((v) => !Number.isNaN(v)));
        }
        is_finite() {
            return derive(this, kleene((v) => Number.isFinite(v)));
        }
        is_infinite() {
            return derive(this, kleene((v) => v === Infinity || v === -Infinity));
        }
    }
}
