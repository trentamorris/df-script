import type { IExpr, ExprConstructor } from "../../types"
import { derive } from "../ExprBase"

export const LogicalExpr = <TBase extends ExprConstructor>(Base: TBase) => {
    return class extends Base {
        and(other: IExpr) { 
            return derive(this, (vArray, columns) => {
                const height = vArray.length;
                const otherArray = other.evaluate(columns, height);
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    const w = otherArray[i];
                    if (v === false || w === false) result[i] = false;
                    else if (v == null || w == null) result[i] = null;
                    else result[i] = true;
                }
                return result;
            }); 
        }
        not() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = (v == null ? null : !v);
                }
                return result;
            });
        }
        or(other: IExpr) { 
            return derive(this, (vArray, columns) => {
                const height = vArray.length;
                const otherArray = other.evaluate(columns, height);
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    const w = otherArray[i];
                    if (v === true || w === true) result[i] = true;
                    else if (v == null || w == null) result[i] = null;
                    else result[i] = false;
                }
                return result;
            }); 
        }
        xor(other: IExpr) {
            return derive(this, (vArray, columns) => {
                const height = vArray.length;
                const otherArray = other.evaluate(columns, height);
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    const w = otherArray[i];
                    if (v == null || w == null) result[i] = null;
                    else result[i] = Number(!!v) ^ Number(!!w);
                }
                return result;
            });
        }
    }
}
