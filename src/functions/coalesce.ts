import { ColumnExpr } from "../columnExpressions/columnExpr";
import type { ScalarArg } from "../types";
import type { CoalesceArg } from "./types";
import { evaluateArgsMatrix } from "../columnExpressions/utils";
import { COALESCE_MARKER } from "../columnExpressions/constants";

/**
 * Returns the first non-null value among the specified expressions.
 *
 * @param {...CoalesceArg} exprs The list of expressions or columns to coalesce.
 * @returns {ColumnExpr<any>} A column expression resolving to the first non-null value.
 * @namespace $df
 * @category Function
 * @syntax $df.{symbol}(...)
 * @example
 * // 1. Coalesce across multiple columns to pick the first non-null:
 * <!-- doc:base_nulls_3x2 -->
 * >>> df.select($df.coalesce($df.col("a"), $df.col("b")).alias("ab"))
 * shape: (3, 1)
 * +----+
 * | ab |
 * +----+
 * | 1  |
 * | 2  |
 * | 3  |
 * +----+
 *
 * @example
 * // 2. Coalesce column with a fallback literal value:
 * <!-- doc:base_nulls_3x2 -->
 * >>> df.select($df.coalesce($df.col("a"), $df.lit(0)).alias("a0"))
 * shape: (3, 1)
 * +----+
 * | a0 |
 * +----+
 * | 1  |
 * | 0  |
 * | 3  |
 * +----+
 */
export function coalesce(...exprs: CoalesceArg[]): ColumnExpr<any> {
    const rawArgs = (exprs.length === 1 && Array.isArray(exprs[0]))
        ? (exprs[0] as ScalarArg[])
        : (exprs as ScalarArg[]);

    const expr = new ColumnExpr(COALESCE_MARKER);
    expr._ops.push((_, columns) => {
        const height = _.length;
        const exprCount = rawArgs.length;
        const { evaluatedArrays, isCol } = evaluateArgsMatrix(rawArgs, columns, height);

        const result = new Array(height);

        for (let i = 0; i < height; i++) {
            let foundVal = null;
            for (let j = 0; j < exprCount; j++) {
                const arr = evaluatedArrays[j];
                const val = isCol[j] ? arr[i] : arr;
                if (val != null) {
                    foundVal = val;
                    break;
                }
            }
            result[i] = foundVal;
        }
        return result;
    });

    return expr;
}
