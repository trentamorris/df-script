import type { IExpr, ExprConstructor } from "../../types"
import { derive } from "../ExprBase"

export const LogicalExpr = <TBase extends ExprConstructor>(Base: TBase) => {
    return class extends Base {
        and(other: IExpr) { 
            return derive(this, (v, row) => {
                const w = other.evaluate(row);
                if (v === false || w === false) return false;
                if (v == null || w == null) return null;
                return true;
            }); 
        }
        or(other: IExpr) { 
            return derive(this, (v, row) => {
                const w = other.evaluate(row);
                if (v === true || w === true) return true;
                if (v == null || w == null) return null;
                return false;
            }); 
        }
        xor(other: IExpr) {
            return derive(this, (v, row) => {
                const w = other.evaluate(row);
                if (v == null || w == null) return null;
                return Number(!!v) ^ Number(!!w);
            });
        }
        not () {
            return derive(this, (v) => (v == null ? null : !v));
        }
    }
}
