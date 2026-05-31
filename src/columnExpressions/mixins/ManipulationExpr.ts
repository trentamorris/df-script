
import type { ExprConstructor } from "../types"
import { derive } from "../ExprBase"
import { isArrayOrTypedArray } from "../../utils"

export const ManipulationExpr = <TBase extends ExprConstructor>(Base: TBase) => {
    return class extends Base {
        fill_null(value: any): this {
            return derive(this, (vArray, columns) => {
                const height = vArray.length;
                const resolved = this._resolve(value, columns, height);
                const result = new Array(height);
                if (isArrayOrTypedArray(resolved)) {
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        result[i] = v == null ? resolved[i] : v;
                    }
                } else {
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        result[i] = v == null ? resolved : v;
                    }
                }
                return result;
            }) as this;
        }
    }
}
