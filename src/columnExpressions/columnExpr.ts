import type { ColumnExprInternal } from "./types"
import { ExprBase } from "./exprBase"
import { StandardExpr } from "./mixins/standardExpr"
import { StringExpr } from "./mixins/stringExpr"
import { TemporalExpr } from "./mixins/temporalExpr"
import { ArrayExpr } from "./mixins/arrayExpr"
import { StructExpr } from "./mixins/structExpr"
import { isObj, isRegExp, isArrayOfType } from "../utils"
import { DataType } from "../datatypes"
import type { IExpr, DataFrameSchema, ColumnDict, ColumnSelector } from "../types"
import { SchemaError } from "../exceptions"
import { ALL_COLUMNS_MARKER } from "./constants"

/**
 * Column expression representing one or more target columns or literal values with vectorized operations.
 */
export class ColumnExpr<T> extends ExprBase {
    _colName: string = "";
    _colNames?: string[];
    _excludedCols: string[] = [];
    _targetType?: unknown;
    _targetTypes?: unknown[];
    _pattern?: RegExp;
    _patterns?: RegExp[];


    /**
     * Creates a column expression representing a column or a raw expression value.
     * @namespace $df.col
     * @category ColumnExpression
     * @syntax $df.col(<column_name>).{symbol}(...)
     */
    constructor(colName: ColumnSelector<T>) {
        super();

        if (isRegExp(colName)) {
            this._patterns = [colName];
            return;
        }

        if (colName instanceof DataType || typeof colName === "function") {
            this._targetTypes = [colName];
            return;
        }

        if (!Array.isArray(colName)) {
            this._colName = String(colName);
            this._outputName = this._colName;
            return;
        }

        if (isArrayOfType(colName, (x) => x instanceof DataType || typeof x === "function", { mode: "some" })) {
            this._targetTypes = colName;
            return;
        }

        const strings: string[] = [];
        const patterns: RegExp[] = [];
        const len = colName.length;

        for (let i = 0; i < len; i++) {
            const item = colName[i];
            if (isRegExp(item)) patterns.push(item);
            else strings.push(String(item));
        }

        if (patterns.length > 0) this._patterns = patterns;
        if (strings.length > 0) this._colNames = strings;
    }
}

export interface ColumnExpr<T> extends
    StandardExpr,
    StringExpr,
    TemporalExpr,
    ArrayExpr,
    StructExpr { }

function _applyMixins(derivedCtor: { prototype: object }, constructors: Array<{ prototype: object }>) {
    for (const ctor of constructors) {
        const desc = Object.getOwnPropertyDescriptors(ctor.prototype);
        delete (desc as { constructor?: unknown }).constructor;
        Object.defineProperties(derivedCtor.prototype, desc);
    }
}

_applyMixins(ColumnExpr, [
    StandardExpr,
    StringExpr,
    TemporalExpr,
    ArrayExpr,
    StructExpr
]);

/**
 * @internal
 * Determines which concrete keys a column selector matches.
 * Returns null if the expression is not a multi-column selector.
 */
function _getTargetKeys(
    expr: unknown,
    allKeys: string[],
    excludeSet: Set<string>,
    schema?: DataFrameSchema
): string[] | null {
    const multiExpr = expr as ColumnExprInternal | undefined;
    if (multiExpr?._colNames?.length && !multiExpr._patterns?.length) {
        return multiExpr._colNames;
    }

    const isExpr = expr instanceof ColumnExpr;
    const isAll = isExpr && expr._colName === ALL_COLUMNS_MARKER;
    const patterns = isExpr && expr._patterns ? expr._patterns : [];
    const exactNames = isExpr && expr._colNames ? expr._colNames : [];
    const types = isExpr && expr._targetTypes ? expr._targetTypes : [];
    const numPatterns = patterns.length;
    const numTypes = types.length;

    if (!isAll && numPatterns === 0 && numTypes === 0) {
        if (isExpr || !isObj(expr) || !("_evaluate" in expr) || expr._colName) {
            return null;
        }
    }

    if (numTypes > 0 && !schema) {
        throw new SchemaError("Cannot resolve DataType without DataFrame schema.");
    }

    const excluded = isAll && expr._excludedCols ? new Set(expr._excludedCols) : null;
    const targets: string[] = [];
    const allLen = allKeys.length;

    for (let i = 0; i < allLen; i++) {
        const key = allKeys[i];
        if (excludeSet.has(key)) continue;

        if (isAll) {
            if (!excluded || !excluded.has(key)) targets.push(key);
            continue;
        }

        if (exactNames.indexOf(key) !== -1) {
            targets.push(key);
            continue;
        }

        let matched = false;
        for (let p = 0; p < numPatterns; p++) {
            patterns[p].lastIndex = 0;
            if (patterns[p].test(key)) {
                matched = true;
                break;
            }
        }

        if (!matched && numTypes > 0 && schema![key]) {
            const colType = schema![key];
            for (let t = 0; t < numTypes; t++) {
                if (colType.matches(types[t])) {
                    matched = true;
                    break;
                }
            }
        }

        if (matched || (!numPatterns && !numTypes)) {
            targets.push(key);
        }
    }

    return targets;
}

/**
 * @internal
 * Resolves column selectors, expanding wildcards, datatypes, and arrays of columns/types
 * into concrete ColumnExpr instances.
 */
export function resolveColumnSelectors(
    exprs: unknown[],
    allKeys: string[],
    keysToExcludeFromAll?: string[],
    schema?: DataFrameSchema,
    columns?: ColumnDict
): IExpr[] {
    const expanded: IExpr[] = [];
    const excludeSet = keysToExcludeFromAll ? new Set(keysToExcludeFromAll) : new Set<string>();
    const len = exprs.length;

    for (let i = 0; i < len; i++) {
        const expr = exprs[i];

        if (typeof expr === "string") {
            expanded.push(new ColumnExpr(expr));
            continue;
        }

        // Handle struct unnesting expansion
        if (isObj(expr) && expr._isUnnest && expr._baseExpr) {
            const baseExpr = expr._baseExpr as IExpr;
            let fields: string[] = [];
            const colName = expr._colName;
            const baseHasOps = ((baseExpr as ColumnExprInternal)._ops?.length ?? 0) > 0;
            if (!baseHasOps && typeof colName === "string" && schema && schema[colName] && schema[colName].name === "Struct") {
                fields = Object.keys((schema[colName] as unknown as { fields: Record<string, unknown> }).fields);
            }
            if (fields.length === 0 && columns) {
                const columnsKeys = Object.keys(columns);
                const firstKey = columnsKeys[0];
                const height = firstKey ? columns[firstKey].length : 0;
                const evaluated = baseExpr._evaluate(columns, height);
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
                    const fieldExpr = (baseExpr as ColumnExpr<unknown>).struct.field(fieldName);
                    expanded.push(fieldExpr);
                }
                continue;
            }
        }

        const typedExpr = expr as ColumnExpr<unknown>;
        const targets = _getTargetKeys(typedExpr, allKeys, excludeSet, schema);
        if (targets !== null) {
            const tLen = targets.length;
            for (let j = 0; j < tLen; j++) {
                const concrete = new ColumnExpr(targets[j]);
                concrete._ops = typedExpr._ops ? [...typedExpr._ops] : [];
                concrete._aggFn = typedExpr._aggFn;
                concrete._partitionOpsIndex = typedExpr._partitionOpsIndex;
                concrete._groupingOpsIndex = typedExpr._groupingOpsIndex;
                concrete._partitionBy = typedExpr._partitionBy;
                if (typedExpr._castType) concrete._castType = typedExpr._castType;
                if (typedExpr._evaluateWindow) concrete._evaluateWindow = typedExpr._evaluateWindow;
                if (typedExpr._outputName && typedExpr._outputName !== ALL_COLUMNS_MARKER) {
                    concrete._outputName = typedExpr._outputName;
                }
                expanded.push(concrete);
            }
        } else {
            expanded.push(typedExpr);
        }
    }

    return expanded;
}