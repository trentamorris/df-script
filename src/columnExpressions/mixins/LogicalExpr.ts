import { ExprBase, derive } from "../ExprBase"
import { kleeneUnary, kleeneBinary } from "../utils"
import { isArrayOrTypedArray } from "../../utils"

export class LogicalExpr extends ExprBase {
        and(other: any) { 
            return derive(this, (vArray, columns) => {
                const height = vArray.length;
                const otherVal = this._resolve(other, columns, height);
                const isOtherArray = isArrayOrTypedArray(otherVal);
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    const w = isOtherArray ? otherVal[i] : otherVal;
                    if (v === false || w === false) result[i] = false;
                    else if (v == null || w == null) result[i] = null;
                    else result[i] = true;
                }
                return result;
            }); 
        }
        not() {
            return derive(this, kleeneUnary((v) => !v));
        }
        or(other: any) { 
            return derive(this, (vArray, columns) => {
                const height = vArray.length;
                const otherVal = this._resolve(other, columns, height);
                const isOtherArray = isArrayOrTypedArray(otherVal);
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    const w = isOtherArray ? otherVal[i] : otherVal;
                    if (v === true || w === true) result[i] = true;
                    else if (v == null || w == null) result[i] = null;
                    else result[i] = false;
                }
                return result;
            }); 
        }
        xor(other: any) {
            return derive(this, kleeneBinary(this, other, (v, w) => !!v !== !!w));
        }
}
