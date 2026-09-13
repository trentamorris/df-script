import { ColumnExpr, resolveColumnSelectors } from "../ColumnExpr";
import { toColExpr } from "../ExprBase";
import type { IntoExpr } from "../../types";
import { ArrayExprNamespace } from "../mixins/ArrayExpr";
import { evaluateArgsMatrix, createDelegatingProxy } from "../utils";
import { HORIZONTAL_MARKER } from "../constants";

export type HorizontalExpr = ColumnExpr<any[]> & ArrayExprNamespace;

/**
 * Combines multiple columns or expressions horizontally into an array per row,
 * allowing expression evaluation with `.eval($df.element()...)`, direct horizontal
 * aggregations (`.sum()`, `.min()`, `.max()`, `.mean()`), or `.arr` operations across columns.
 *
 * @param {...(IntoExpr | IntoExpr[])[]} exprs Column names, expressions, selectors (e.g. `$df.all()`), or arrays of them.
 * @returns {HorizontalExpr} A column expression representing the horizontal row arrays.
 * @namespace $df
 * @category ColumnExpression
 * @syntax $df.{symbol}(...)
 * @example
 * <!-- doc:base_2x2 -->
 * >>> df.select($df.horizontal("a", "b").sum().alias("row_sum"))
 * shape: (2, 1)
 * ┌─────────┐
 * │ row_sum │
 * ├─────────┤
 * │ 1       │
 * │ 2       │
 * └─────────┘
 */
export function horizontal(
    ...exprs: (IntoExpr | IntoExpr[])[]
): HorizontalExpr {
    const flat = (exprs.length === 1 && Array.isArray(exprs[0]))
        ? (exprs[0] as IntoExpr[])
        : (exprs as IntoExpr[]);

    const expr = new ColumnExpr<any[]>(HORIZONTAL_MARKER);

    expr._ops.push((_, columns) => {
        const height = _.length;
        const allKeys = Object.keys(columns);

        const flatLen = flat.length;
        const resolvedExprs = new Array(flatLen);
        for (let j = 0; j < flatLen; j++) {
            resolvedExprs[j] = toColExpr(flat[j], ColumnExpr);
        }

        const expanded = resolveColumnSelectors(resolvedExprs, allKeys, undefined, undefined, columns);
        const exprCount = expanded.length;

        const { evaluatedArrays, isCol } = evaluateArgsMatrix(expanded, columns, height);

        const result = new Array(height);
        for (let i = 0; i < height; i++) {
            const row = new Array(exprCount);
            for (let j = 0; j < exprCount; j++) {
                row[j] = isCol[j] ? evaluatedArrays[j][i] : evaluatedArrays[j];
            }
            result[i] = row;
        }

        return result;
    });

    return createDelegatingProxy(expr, (prop, target) => {
        const arrNamespace = target.arr as any;
        if (prop === "eval") {
            return (subExpr: any) => subExpr?._isGlobalAgg?.() ? arrNamespace.agg(subExpr) : arrNamespace.eval(subExpr);
        }
        if (arrNamespace && typeof arrNamespace[prop] === "function") {
            return (...args: any[]) => arrNamespace[prop](...args);
        }
        return undefined;
    }) as any;
}
