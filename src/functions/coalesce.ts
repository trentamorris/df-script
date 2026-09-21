import { ColumnExpr } from "../columnExpressions/ColumnExpr";
import type { IExpr, ValidScalarTypes } from "../types";
import { evaluateArgsMatrix } from "../columnExpressions/utils";
import { COALESCE_MARKER } from "../columnExpressions/constants";

/**
 * Returns the first non-null value among the specified expressions.
 *
 * @param {...(IExpr | ValidScalarTypes | (IExpr | ValidScalarTypes)[])[]} exprs The list of expressions or columns to coalesce.
 * @returns {ColumnExpr<any>} A column expression resolving to the first non-null value.
 * @namespace $df
 * @category ColumnExpression
 * @syntax $df.{symbol}(...)
 * @example
 * <!-- doc:base_nulls_3x2 -->
 * >>> df.select($df.coalesce($df.col("a"), $df.col("b"), $df.lit(3)).alias("coalesced"))
 * shape: (3, 1)
 * ┌───────────┐
 * │ coalesced │
 * ├───────────┤
 * │ 1         │
 * │ 2         │
 * │ 3         │
 * └───────────┘
 */
export function coalesce(...exprs: (IExpr | ValidScalarTypes | (IExpr | ValidScalarTypes)[])[]): ColumnExpr<any> {
    const rawArgs = (exprs.length === 1 && Array.isArray(exprs[0]))
        ? (exprs[0] as (IExpr | ValidScalarTypes)[])
        : (exprs as (IExpr | ValidScalarTypes)[]);

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
