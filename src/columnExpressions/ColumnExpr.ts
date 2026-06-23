import { ExprBase } from "./ExprBase"
import { ArithmeticExpr } from "./mixins/ArithmeticExpr"
import { ComparisonExpr } from "./mixins/ComparisonExpr"
import { AggregationExpr } from "./mixins/AggregationExpr"
import { WindowExpr } from "./mixins/WindowExpr"
import { StringExpr } from "./mixins/StringExpr"
import { LogicalExpr } from "./mixins/LogicalExpr"
import { TemporalExpr } from "./mixins/TemporalExpr"
import { ArrayExpr } from "./mixins/ArrayExpr"
import { StructExpr } from "./mixins/StructExpr"
import { ManipulationExpr } from "./mixins/ManipulationExpr"
import { isObj } from "../utils"
import { DataType } from "../datatypes"
import type { IntoExpr, IExpr, DataFrameSchema, ColumnDict } from "../types"
import { ALL_COLUMNS_MARKER } from "./constants"

export class ColumnExpr<T> extends ExprBase {
    public _colName: string
    public _colNames?: string[];
    public _excludedCols: string[] = [];
    public _targetType?: any;
    public _targetTypes?: any[];

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
                this._targetTypes = colName;
                this._colName = "";
                this._outputName = "";
            } else {
                this._colNames = colName.map(String);
                this._colName = "";
                this._outputName = "";
            }
        } else if (colName instanceof DataType || typeof colName === "function") {
            this._targetType = colName;
            this._colName = "";
            this._outputName = "";
        } else {
            this._colName = String(colName);
            this._outputName = this._colName;
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
    ArrayExpr,
    StructExpr,
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
    ArrayExpr,
    StructExpr,
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
        if (isObj(expr) && "evaluate" in expr && !expr._colName) {
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

    if (expr._colNames && expr._colNames.length > 0) {
        return expr._colNames;
    }

    if (expr._colName === ALL_COLUMNS_MARKER) {
        const excluded = new Set(expr._excludedCols);
        const targets: string[] = [];
        for (let i = 0; i < allKeys.length; i++) {
            const key = allKeys[i];
            if (!excluded.has(key) && !excludeSet.has(key)) {
                targets.push(key);
            }
        }
        return targets;
    }

    if (expr._targetType || (expr._targetTypes && expr._targetTypes.length > 0)) {
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

            if (expr._targetType) {
                if (colType.matches(expr._targetType)) {
                    targets.push(key);
                }
            } else if (expr._targetTypes) {
                for (let k = 0; k < expr._targetTypes.length; k++) {
                    if (colType.matches(expr._targetTypes[k])) {
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
    schema?: DataFrameSchema,
    columns?: ColumnDict
): IExpr[] {
    const expanded: IExpr[] = [];
    const excludeSet = keysToExcludeFromAll ? new Set(keysToExcludeFromAll) : new Set<string>();

    for (let i = 0; i < exprs.length; i++) {
        const expr = exprs[i];

        if (typeof expr === "string") {
            expanded.push(new ColumnExpr(expr));
            continue;
        }

        // Handle struct unnesting expansion
        if (isObj(expr) && (expr as any).isUnnest) {
            let fields: string[] = [];
            const colName = expr._colName;
            if (typeof colName === "string" && schema && schema[colName] && schema[colName].name === "Struct") {
                fields = Object.keys((schema[colName] as any).fields);
            }
            if (fields.length === 0 && columns) {
                const columnsKeys = Object.keys(columns);
                const firstKey = columnsKeys[0];
                const height = firstKey ? columns[firstKey].length : 0;
                const evaluated = (expr as any).baseExpr.evaluate(columns, height);
                const evalLen = evaluated.length;
                for (let idx = 0; idx < evalLen; idx++) {
                    const item = evaluated[idx];
                    if (item != null && typeof item === "object") {
                        fields = Object.keys(item);
                        break;
                    }
                }
            }
            const fieldsLen = fields.length;
            if (fieldsLen > 0) {
                for (let fIdx = 0; fIdx < fieldsLen; fIdx++) {
                    const fieldName = fields[fIdx];
                    const fieldExpr = (expr as any).baseExpr.struct.field(fieldName);
                    expanded.push(fieldExpr);
                }
                continue;
            }
        }

        const targets = getTargetKeys(expr, allKeys, excludeSet, schema);
        if (targets !== null) {
            for (let j = 0; j < targets.length; j++) {
                const concrete = new ColumnExpr(targets[j]);
                concrete._ops = [...(expr._ops || [])];
                concrete._aggFn = expr._aggFn;
                concrete._partitionOpsIndex = expr._partitionOpsIndex;
                concrete._groupingOpsIndex = expr._groupingOpsIndex;
                concrete._partitionBy = expr._partitionBy;
                if (expr._evaluateWindow) {
                    concrete._evaluateWindow = expr._evaluateWindow;
                }
                if (expr._outputName && expr._outputName !== ALL_COLUMNS_MARKER) {
                    concrete._outputName = expr._outputName;
                }
                expanded.push(concrete);
            }
        } else {
            expanded.push(expr);
        }
    }

    return expanded;
}

