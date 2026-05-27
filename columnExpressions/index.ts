import type { IExpr } from "../types"
import { ColumnExpr } from "./ColumnExpr"
import { AllColumnsExpr } from "./AllColumnsExpr"

export * from "./ExprBase"
export * from "./mixins/ArithmeticExpr"
export * from "./mixins/LogicalExpr"
export * from "./mixins/ComparisonExpr"
export * from "./mixins/StringExpr"
export * from "./mixins/AggregationExpr"
export * from "./mixins/WindowExpr"
export * from "./mixins/TemporalExpr"
export * from "./ColumnExpr"
export * from "./AllColumnsExpr"

export function resolveColumnSelectors(
    exprs: any[],
    allKeys: string[],
    keysToExcludeFromAll?: string[]
): IExpr[] {
    const expanded: IExpr[] = [];
    const excludeSet = keysToExcludeFromAll ? new Set(keysToExcludeFromAll) : new Set<string>();

    for (const expr of exprs) {
        if (typeof expr === "string") {
            expanded.push(new ColumnExpr(expr));
        } else if (expr instanceof AllColumnsExpr) {
            const excluded = new Set(expr.excludedCols);
            for (const key of allKeys) {
                if (!excludeSet.has(key) && !excluded.has(key)) {
                    const concrete = new ColumnExpr(key);
                    concrete.ops = [...expr.ops];
                    concrete.aggFn = expr.aggFn;
                    concrete.partitionOpsIndex = expr.partitionOpsIndex;
                    concrete.groupingOpsIndex = expr.groupingOpsIndex;
                    concrete.partitionBy = expr.partitionBy;
                    if (expr.evaluateWindow) {
                        concrete.evaluateWindow = expr.evaluateWindow;
                    }
                    if (expr.outputName && expr.outputName !== "*") {
                        concrete.outputName = expr.outputName;
                    }
                    expanded.push(concrete);
                }
            }
        } else if (expr && typeof expr === 'object' && 'evaluate' in expr && !expr.colName) {
            // Anonymous/base expressions (e.g. $tbl.mean() with no column specified) target all columns by default.
            for (const key of allKeys) {
                if (!excludeSet.has(key)) {
                    const concrete = new ColumnExpr(key);
                    concrete.ops = [...expr.ops];
                    concrete.aggFn = expr.aggFn;
                    concrete.groupingOpsIndex = expr.groupingOpsIndex;
                    concrete.partitionOpsIndex = expr.partitionOpsIndex;
                    expanded.push(concrete);
                }
            }
        } else {
            expanded.push(expr);
        }
    }
    return expanded;
}
