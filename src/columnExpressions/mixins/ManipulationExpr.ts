import { ExprBase, derive } from "../ExprBase"
import { isArrayOrTypedArray, getArrayStats, fillSequence } from "../../utils"
import type { FillNullOptions } from "../../types"

export class ManipulationExpr extends ExprBase {
        fill_null({
            value = undefined,
            strategy = undefined,
            limit = undefined
        }: FillNullOptions = {}): this {
            return derive(this, (vArray, columns) => {
                const height = vArray.length;
                const result = Array.from(vArray);

                if (strategy !== undefined) {
                    if (strategy === "zero" || strategy === "one" || strategy === "min" || strategy === "max" || strategy === "mean") {
                        let fillVal: any;
                        if (strategy === "zero") {
                            fillVal = 0;
                        } else if (strategy === "one") {
                            fillVal = 1;
                        } else {
                            const stats = getArrayStats(vArray);
                            fillVal = stats[strategy];
                        }
                        fillSequence(result, fillVal, {
                            mode: "constant",
                            condition: (v) => v == null
                        });
                    } else if (strategy === "forward" || strategy === "backward") {
                        const isForward = strategy === "forward";
                        let lastVal: any = null;
                        let consecCount = 0;

                        fillSequence(result, null, {
                            mode: "independent",
                            reverse: !isForward,
                            step: ({ originalValue }) => {
                                if (originalValue != null) {
                                    lastVal = originalValue;
                                    consecCount = 0;
                                    return originalValue;
                                }
                                if (lastVal !== null && (limit === undefined || consecCount < limit)) {
                                    consecCount++;
                                    return lastVal;
                                }
                                return null;
                            }
                        });
                    } else {
                        throw new Error(`Unsupported fill_null strategy: "${strategy}"`);
                    }
                } else {
                    const resolved = this._resolve(value, columns, height);
                    const isArr = isArrayOrTypedArray(resolved);

                    fillSequence(result, null, {
                        mode: "independent",
                        step: ({ index, originalValue }) => originalValue == null ? (isArr ? resolved[index] : resolved) : originalValue
                    });
                }
                return result;
            }) as this;
        }

        reverse(): this {
            return derive(this, (vArray) => {
                return (vArray as any).slice().reverse();
            }) as this;
        }
}
