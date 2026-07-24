import { ExprBase, derive } from "../ExprBase"
import { isArrayOrTypedArray, getArrayStats, fillSequence } from "../../utils"
import type { FillNullOptions } from "../../types"

export class ManipulationExpr extends ExprBase {
        /**
         * Replaces null, undefined, or missing values with a specified value or strategy.
         * @param options Configuration options including fill value, strategy ("forward", "backward", "zero", "one", "mean", "min", "max"), and optional limit.
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({
         * ...   a: [1, null, 3]
         * ... })
         * >>> df.with_columns($df.col("a").fill_null({ value: 0 }).alias("filled"))
         * shape: (3, 2)
         * ┌──────┬────────┐
         * │ a    │ filled │
         * ├──────┼────────┤
         * │ 1    │ 1      │
         * │ null │ 0      │
         * │ 3    │ 3      │
         * └──────┴────────┘
         */
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

        /**
         * Reverses the order of values in the column.
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({
         * ...   a: [1, 2, 3]
         * ... })
         * >>> df.with_columns($df.col("a").reverse().alias("reversed"))
         * shape: (3, 2)
         * ┌───┬──────────┐
         * │ a │ reversed │
         * ├───┼──────────┤
         * │ 1 │ 3        │
         * │ 2 │ 2        │
         * │ 3 │ 1        │
         * └───┴──────────┘
         */
        reverse(): this {
            return derive(this, (vArray) => {
                return (vArray as any).slice().reverse();
            }) as this;
        }
}
