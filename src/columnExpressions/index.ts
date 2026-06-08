import type { IExpr } from "../types"
import { ColumnExpr } from "./ColumnExpr"
import { ALL_COLUMNS_MARKER } from "./constants"

export * from "./constants"
export * from "./types"
export * from "./ExprBase"
export * from "./mixins/ArithmeticExpr"
export * from "./mixins/LogicalExpr"
export * from "./mixins/ComparisonExpr"
export * from "./mixins/StringExpr"
export * from "./mixins/AggregationExpr"
export * from "./mixins/WindowExpr"
export * from "./mixins/TemporalExpr"
export * from "./mixins/ListExpr"
export * from "./ColumnExpr"
export * from "./functions/lit"
export * from "./functions/all"
export * from "./functions/exclude"
export * from "./functions/coalesce"
export * from "./functions/when"
export * from "./functions/implode"
export * from "./functions/seq_range"




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
        } else if (expr instanceof ColumnExpr && expr.colName === ALL_COLUMNS_MARKER) {
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
                    if (expr.outputName && expr.outputName !== ALL_COLUMNS_MARKER) {
                        concrete.outputName = expr.outputName;
                    }
                    expanded.push(concrete);
                }
            }
        } else if (expr instanceof ColumnExpr && expr.colNames && expr.colNames.length > 0) {
            for (const name of expr.colNames) {
                const concrete = new ColumnExpr(name);
                concrete.ops = [...expr.ops];
                concrete.aggFn = expr.aggFn;
                concrete.partitionOpsIndex = expr.partitionOpsIndex;
                concrete.groupingOpsIndex = expr.groupingOpsIndex;
                concrete.partitionBy = expr.partitionBy;
                if (expr.evaluateWindow) {
                    concrete.evaluateWindow = expr.evaluateWindow;
                }
                if (expr.outputName) {
                    concrete.outputName = expr.outputName;
                }
                expanded.push(concrete);
            }
        } else if (expr && typeof expr === 'object' && 'evaluate' in expr && !expr.colName) {
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
