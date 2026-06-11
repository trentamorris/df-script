import { ExprBase } from "./ExprBase"
import { ArithmeticExpr } from "./mixins/ArithmeticExpr"
import { ComparisonExpr } from "./mixins/ComparisonExpr"
import { AggregationExpr } from "./mixins/AggregationExpr"
import { WindowExpr } from "./mixins/WindowExpr"
import { StringExpr } from "./mixins/StringExpr"
import { LogicalExpr } from "./mixins/LogicalExpr"
import { TemporalExpr } from "./mixins/TemporalExpr"
import { ListExpr } from "./mixins/ListExpr"
import { ManipulationExpr } from "./mixins/ManipulationExpr"
import { isObj } from "../utils"
import { DataType } from "../datatypes"
import type { IntoExpr, IExpr, DataFrameSchema } from "../types"
import { ALL_COLUMNS_MARKER } from "./constants"

export class ColumnExpr<T> extends ExprBase {
    public colName: string
    public colNames?: string[];
    public excludedCols: string[] = [];
    public targetType?: any;
    public targetTypes?: any[];

    static isColExpr(v: unknown): v is ColumnExpr<any> {
        if (!isObj(v)) return false;
        try {
            return "evaluate" in v && typeof (v as any).evaluate === "function";
        } catch {
            return false;
        }
    }

    static toColExpr(col: IntoExpr | IntoExpr[]): ColumnExpr<any> {
        if (col == null) {
            throw new Error("Column reference cannot be null or undefined.");
        }
        return ColumnExpr.isColExpr(col) ? col : new ColumnExpr(col as string | string[]);
    }

    constructor(colName: keyof T | string | (keyof T | string)[] | DataType | Function | (DataType | Function)[]) {
        super()
        if (Array.isArray(colName)) {
            const hasTypes = colName.some(x => x instanceof DataType || typeof x === "function");
            if (hasTypes) {
                this.targetTypes = colName;
                this.colName = "";
                this.outputName = "";
            } else {
                this.colNames = colName.map(String);
                this.colName = "";
                this.outputName = "";
            }
        } else if (colName instanceof DataType || typeof colName === "function") {
            this.targetType = colName;
            this.colName = "";
            this.outputName = "";
        } else {
            this.colName = String(colName);
            this.outputName = this.colName;
        }
    }
}

export interface ColumnExpr<T> extends
    ArithmeticExpr,
    ComparisonExpr,
    AggregationExpr,
    WindowExpr,
    StringExpr,
    LogicalExpr,
    TemporalExpr,
    ListExpr,
    ManipulationExpr {}

function applyMixins(derivedCtor: any, constructors: any[]) {
    for (const baseCtor of constructors) {
        for (const name of Object.getOwnPropertyNames(baseCtor.prototype)) {
            if (name !== 'constructor') {
                Object.defineProperty(
                    derivedCtor.prototype,
                    name,
                    Object.getOwnPropertyDescriptor(baseCtor.prototype, name) || Object.create(null)
                );
            }
        }
    }
}

applyMixins(ColumnExpr, [
    ArithmeticExpr,
    ComparisonExpr,
    AggregationExpr,
    WindowExpr,
    StringExpr,
    LogicalExpr,
    TemporalExpr,
    ListExpr,
    ManipulationExpr
]);

/**
 * Determines which concrete keys a column selector matches.
 * Returns null if the expression is not a multi-column selector.
 */
function getTargetKeys(
    expr: any,
    allKeys: string[],
    excludeSet: Set<string>,
    schema?: DataFrameSchema
): string[] | null {
    if (!(expr instanceof ColumnExpr)) {
        if (expr && typeof expr === "object" && "evaluate" in expr && !expr.colName) {
            const targets: string[] = [];
            for (let i = 0; i < allKeys.length; i++) {
                if (!excludeSet.has(allKeys[i])) {
                    targets.push(allKeys[i]);
                }
            }
            return targets;
        }
        return null;
    }

    if (expr.colNames && expr.colNames.length > 0) {
        return expr.colNames;
    }

    if (expr.colName === ALL_COLUMNS_MARKER) {
        const excluded = new Set(expr.excludedCols);
        const targets: string[] = [];
        for (let i = 0; i < allKeys.length; i++) {
            const key = allKeys[i];
            if (!excluded.has(key) && !excludeSet.has(key)) {
                targets.push(key);
            }
        }
        return targets;
    }

    if (expr.targetType || (expr.targetTypes && expr.targetTypes.length > 0)) {
        if (!schema) {
            throw new Error("Cannot resolve DataType column selector without DataFrame schema.");
        }
        const targets: string[] = [];
        for (let i = 0; i < allKeys.length; i++) {
            const key = allKeys[i];
            if (excludeSet.has(key)) {
                continue;
            }

            const colType = schema[key];
            if (!colType) {
                continue;
            }

            if (expr.targetType) {
                if (colType.matches(expr.targetType)) {
                    targets.push(key);
                }
            } else if (expr.targetTypes) {
                for (let k = 0; k < expr.targetTypes.length; k++) {
                    if (colType.matches(expr.targetTypes[k])) {
                        targets.push(key);
                        break;
                    }
                }
            }
        }
        return targets;
    }

    return null;
}

/**
 * Resolves column selectors, expanding wildcards, datatypes, and arrays of columns/types
 * into concrete ColumnExpr instances.
 */
export function resolveColumnSelectors(
    exprs: any[],
    allKeys: string[],
    keysToExcludeFromAll?: string[],
    schema?: DataFrameSchema
): IExpr[] {
    const expanded: IExpr[] = [];
    const excludeSet = keysToExcludeFromAll ? new Set(keysToExcludeFromAll) : new Set<string>();

    for (let i = 0; i < exprs.length; i++) {
        const expr = exprs[i];

        if (typeof expr === "string") {
            expanded.push(new ColumnExpr(expr));
            continue;
        }

        const targets = getTargetKeys(expr, allKeys, excludeSet, schema);
        if (targets !== null) {
            for (let j = 0; j < targets.length; j++) {
                const concrete = new ColumnExpr(targets[j]);
                concrete.ops = [...(expr.ops || [])];
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
        } else {
            expanded.push(expr);
        }
    }

    return expanded;
}

