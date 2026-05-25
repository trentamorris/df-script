import type { IExpr, ExprConstructor } from "../../types"
import { kleene, derive } from "../ExprBase"

export const ArithmeticExpr = <TBase extends ExprConstructor>(Base: TBase) => {
    return class extends Base {
        add(val: number | IExpr | null) { 
            return derive(this, kleene((v, row) => {
                const r = this._resolve(val, row);
                return r == null ? null : v + r;
            })); 
        }
        sub(val: number | IExpr | null) { 
            return derive(this, kleene((v, row) => {
                const r = this._resolve(val, row);
                return r == null ? null : v - r;
            })); 
        }
        mul(val: number | IExpr | null) { 
            return derive(this, kleene((v, row) => {
                const r = this._resolve(val, row);
                return r == null ? null : v * r;
            })); 
        }
        div(val: number | IExpr | null) { 
            return derive(this, kleene((v, row) => {
                const r = this._resolve(val, row);
                return r == null ? null : v / r;
            })); 
        }
        floordiv(val: number | IExpr | null) { 
            return derive(this, kleene((v, row) => {
                const r = this._resolve(val, row);
                return r == null ? null : Math.floor(v / r);
            })); 
        }
        mod(val: number | IExpr | null) { 
            return derive(this, kleene((v, row) => {
                const r = this._resolve(val, row);
                return r == null ? null : v % r;
            })); 
        }
        pow(val: number | IExpr | null) { 
            return derive(this, kleene((v, row) => {
                const r = this._resolve(val, row);
                return r == null ? null : Math.pow(v, r);
            })); 
        }
    };
};
