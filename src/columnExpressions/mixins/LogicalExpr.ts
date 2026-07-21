import { ExprBase, derive } from "../ExprBase"
import { kleeneUnary, kleeneBinary } from "../utils"
import { isArrayOrTypedArray } from "../../utils"

export class LogicalExpr extends ExprBase {
        /**
         * Logical AND check supporting Kleene logic.
         * @param other The other boolean column expression or literal value to compare.
         * @example
         * $df.col("category").eq("toys").and($df.col("price").lt(50))
         * @since v1.5.0
         */
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
        /**
         * Logical negation.
         * @example
         * $df.col("is_active").not()
         * @since v1.5.0
         */
        not() {
            return derive(this, kleeneUnary((v) => !v));
        }
        /**
         * Logical OR check supporting Kleene logic.
         * @param other The other boolean column expression or literal value to compare.
         * @example
         * $df.col("category").eq("toys").or($df.col("category").eq("books"))
         * @since v1.5.0
         */
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
        /**
         * Logical XOR check.
         * @param other The other boolean column expression or literal value to compare.
         * @example
         * $df.col("is_subscribed").xor($df.col("is_member"))
         * @since v1.6.0
         */
        xor(other: any) {
            return derive(this, kleeneBinary(this, other, (v, w) => !!v !== !!w));
        }
}
