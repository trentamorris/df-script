import { ColumnExpr, resolveColumnSelectors } from "../columnExpressions/columnExpr";
import { toColExpr } from "../columnExpressions/exprBase";
import type { IntoExpr, IntoExprArg } from "../types";
import type { HorizontalExpr } from "./types";
import { evaluateArgsMatrix, createDelegatingProxy } from "../columnExpressions/utils";
import { HORIZONTAL_MARKER } from "../columnExpressions/constants";

/**
 * Combines multiple columns or expressions horizontally into an array per row,
 * allowing expression evaluation with `.eval($df.element()...)`, direct horizontal
 * aggregations (`.sum()`, `.min()`, `.max()`, `.mean()`), or `.arr` operations across columns.
 *
 * @param {...IntoExprArg} exprs Column names, expressions, selectors (e.g. `$df.all()`), or arrays of them.
 * @returns {HorizontalExpr} A column expression representing the horizontal row arrays.
 * @namespace $df
 * @syntax $df.{symbol}(...)
 * @example
 * // 1. Horizontal sum across row values:
 * <!-- doc:base_numbers_3x2 -->
 * df.select($df.horizontal("a", "b").sum().alias("row_sum"));
 * // shape: (3, 1)
 * // +---------+
 * // | row_sum |
 * // +---------+
 * // | 11      |
 * // | 22      |
 * // | 33      |
 * // +---------+
 *
 * @example
 * // 2. Horizontal row-wise minimum:
 * <!-- doc:base_numbers_3x2 -->
 * df.select($df.horizontal("a", "b").min().alias("row_min"));
 * // shape: (3, 1)
 * // +---------+
 * // | row_min |
 * // +---------+
 * // | 1       |
 * // | 2       |
 * // | 3       |
 * // +---------+
 */
export function horizontal(
    ...exprs: IntoExprArg[]
): HorizontalExpr {
    const flat = (exprs.length === 1 && Array.isArray(exprs[0]))
        ? (exprs[0] as IntoExpr[])
        : (exprs as IntoExpr[]);

    const expr = new ColumnExpr<unknown[]>(HORIZONTAL_MARKER);

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
                row[j] = isCol[j] ? (evaluatedArrays[j] as unknown[])[i] : evaluatedArrays[j];
            }
            result[i] = row;
        }

        return result;
    });

    return createDelegatingProxy(expr, (prop, target) => {
        const arrNamespace = target.arr as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>;
        if (prop === "eval") {
            return (subExpr: ColumnExpr<unknown> & { _isGlobalAgg?: () => boolean }) =>
                subExpr?._isGlobalAgg?.() ? arrNamespace.agg?.(subExpr) : arrNamespace.eval?.(subExpr);
        }
        if (arrNamespace && typeof arrNamespace[prop] === "function") {
            return (...args: unknown[]) => arrNamespace[prop]!(...args);
        }
        return undefined;
    }) as unknown as HorizontalExpr;
}
