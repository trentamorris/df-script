import { ColumnExpr, resolveColumnSelectors, ALL_COLUMNS_MARKER } from "../columnExpressions"
import { GroupedData } from "./grouped/grouped"
import type { IExpr, ColumnData, ColumnDict, DataFrameColumns, ConcatOptions, ConcatItem, HorizontalConcatOptions, RowRecord, DataFrameSchema, RegisteredDataType } from "../types"
import type { GroupMap, LimitOptions, SortOptions, PivotOptions, JoinOptions, UnpivotOptions } from "./types"
import { DataTypeRegistry } from "../datatypes"
import { isArrayOrTypedArray, isTypedArray, toValidArray, toValidStringArray, isObj, isArrayOfType, isColExpr, clamp } from "../utils"
import { assertColumnExists, DataFrameError } from "../exceptions"
import { concat } from "../functions/concat"
import {
    resolveWindowExpr,
    rowsToColumns,
    columnsToRows,
    inferColumnType,
    gatherColumnsByIndices,
    computeRowHash
} from "./utils"

export class DataFrame<T extends RowRecord = any> {
    public _columns: DataFrameColumns<T>
    private _height: number
    private _schema: DataFrameSchema = {}

    constructor(data: T[] | ColumnDict, schema?: DataFrameSchema, height?: number) {
        if (Array.isArray(data)) {
            const { columns, height: h } = rowsToColumns(data);
            this._columns = columns as DataFrameColumns<T>;
            this._height = h;
            schema ? this.applySchema(schema) : this.inferSchema();
            return;
        }

        if (isObj(data)) {
            let firstLength = -1;
            for (const [key, col] of Object.entries(data)) {
                const colLen = isArrayOrTypedArray(col) ? col.length : 0;
                if (firstLength === -1) {
                    firstLength = colLen;
                } else if (colLen !== firstLength) {
                    throw new DataFrameError(`Column height mismatch: Column "${key}" has length ${colLen}, but previous columns have length ${firstLength}`);
                }
            }
            this._columns = data as DataFrameColumns<T>;
            this._height = height !== undefined ? height : (firstLength === -1 ? 0 : firstLength);

            schema ? this.applySchema(schema) : this.inferSchema();
            return;
        }

        this._columns = {} as DataFrameColumns<T>;
        this._height = 0;
        schema ? this.applySchema(schema) : (this._schema = {});
    }

    private inferSchema() {
        const schema: DataFrameSchema = {};
        const keys = Object.keys(this._columns);
        for (const key of keys) {
            schema[key] = inferColumnType(this._columns[key]);
        }
        this._schema = schema;
    }

    private applySchema(schema: DataFrameSchema) {
        this._schema = schema;
        const keys = Object.keys(schema);
        const newColumns: ColumnDict = {};
        for (const key of keys) {
            const type = schema[key];
            const oldCol = this._columns[key];

            let newCol: any = type.allocate ? type.allocate(this._height) : new Array(this._height).fill(null);

            if (!oldCol) {
                if (this._height > 0 && isTypedArray(newCol)) {
                    newCol = new Array(this._height).fill(null);
                }
                newColumns[key] = newCol;
                continue;
            }

            let hasNulls = false;
            const coercedVals = new Array(this._height);
            for (let i = 0; i < this._height; i++) {
                const coerced = type.coerce(oldCol[i]);
                coercedVals[i] = coerced;
                if (coerced == null) {
                    hasNulls = true;
                }
            }

            if (hasNulls && isTypedArray(newCol)) {
                newCol = new Array(this._height);
            }

            for (let i = 0; i < this._height; i++) {
                newCol[i] = coercedVals[i];
            }

            newColumns[key] = newCol;
        }
        this._columns = newColumns as DataFrameColumns<T>;
    }

    getSchema(): DataFrameSchema {
        return this._schema;
    }

    to_dicts(): T[] {
        return columnsToRows(this._columns, this._height);
    }

    to_dict(): DataFrameColumns<T> {
        return { ...this._columns };
    }

    get columns(): string[] {
        return Object.keys(this._columns);
    }

    concat<U extends RowRecord = any>(
        items: ConcatItem | ConcatItem[],
        options: ConcatOptions = {}
    ): DataFrame<U> {
        const arrayItems = isArrayOfType(items, DataFrame, { mode: "every", allowEmpty: false })
            ? (items as DataFrame[])
            : [items];
        return concat([this, ...arrayItems], options);
    }

    drop<K extends keyof T>(...args: (K | K[])[]): DataFrame<Omit<T, K>> {
        const columnsToDrop = new Set(args.flat() as string[]);
        const newColumns: ColumnDict = {};
        const outSchema: DataFrameSchema = {};
        for (const key of Object.keys(this._columns)) {
            if (!columnsToDrop.has(key)) {
                newColumns[key] = this._columns[key];
                outSchema[key] = this._schema[key];
            }
        }

        return new DataFrame<Omit<T, K>>(newColumns, outSchema, this._height);
    }

    get dtypes(): RegisteredDataType[] {
        const keys = Object.keys(this._columns);
        const len = keys.length;
        const result = new Array(len);
        for (let i = 0; i < len; i++) {
            result[i] = this._schema[keys[i]];
        }
        return result;
    }

    filter(...exprs: (IExpr | ((row: T) => any))[]): DataFrame<T> {
        if (this._height === 0) return new DataFrame({}, this._schema, 0);

        const height = this._height;
        const keys = Object.keys(this._columns);
        const numKeys = keys.length;

        const evaluatedExprs: ColumnData[] = [];
        const funcPredicates: ((row: T) => any)[] = [];

        for (const expr of exprs) {
            if (typeof expr === "function") {
                funcPredicates.push(expr);
            } else {
                evaluatedExprs.push(expr.evaluate(this._columns, height));
            }
        }

        const matchingIndices: number[] = [];

        let currentIndex = 0;
        let rowObj: T | null = null;
        if (funcPredicates.length > 0) {
            const columns = this._columns;
            rowObj = {} as unknown as T;
            for (let k = 0; k < numKeys; k++) {
                const key = keys[k];
                const col = columns[key];
                Object.defineProperty(rowObj, key, {
                    get() {
                        const val = col[currentIndex];
                        return val === undefined ? null : val;
                    },
                    enumerable: true,
                    configurable: true
                });
            }
        }

        for (let i = 0; i < height; i++) {
            let keep = true;

            for (let j = 0; j < evaluatedExprs.length; j++) {
                if (!evaluatedExprs[j][i]) {
                    keep = false;
                    break;
                }
            }

            if (!keep) continue;

            if (rowObj) {
                currentIndex = i;
                for (let j = 0; j < funcPredicates.length; j++) {
                    if (!funcPredicates[j](rowObj)) {
                        keep = false;
                        break;
                    }
                }
            }

            if (!keep) continue;

            matchingIndices.push(i);
        }

        const newColumns = gatherColumnsByIndices(this._columns, matchingIndices) as DataFrameColumns<T>;
        const newHeight = matchingIndices.length;

        return new DataFrame<T>(newColumns, this._schema, newHeight);
    }

    groupby<K extends keyof T>(keys: K | K[]): GroupedData<T, K> {
        const keysArr = toValidArray(keys);
        const groups: GroupMap = new Map();
        const len = this._height;
        const keysStr = toValidStringArray(keys);

        for (let j = 0; j < keysStr.length; j++) {
            assertColumnExists(keysStr[j], this._columns, "Grouping key");
        }

        for (let i = 0; i < len; i++) {
            const hash = computeRowHash(this._columns, keysStr, i);

            let group = groups.get(hash);
            if (group === undefined) {
                groups.set(hash, group = []);
            }
            group.push(i);
        }

        const allKeys = Object.keys(this._columns) as (keyof T)[];
        return new GroupedData(groups, keysArr, allKeys, this._columns, this._height, this._schema);
    }

    head(n: number = 10): DataFrame<T> {
        return this.limit(n, { offset: 0, from: "start" })
    }

    get height(): number {
        return this._height;
    }

    hstack<U extends RowRecord = any>(
        other: ConcatItem | ConcatItem[],
        options: HorizontalConcatOptions = {}
    ): DataFrame<U> {
        return this.concat<U>(other, { how: "horizontal", horizontal: options });
    }

    join<U extends RowRecord = any, R extends RowRecord = any>(config: JoinOptions<T, U>): DataFrame<R> {
        const { other, on, how = "inner", suffixes = ["", "_right"] } = config;
        const joinKeysStr = toValidStringArray(on);
        for (let i = 0; i < joinKeysStr.length; i++) {
            const keyStr = joinKeysStr[i];
            assertColumnExists(keyStr, this._columns, "Join key", " in the left DataFrame.");
            assertColumnExists(keyStr, other._columns, "Join key", " in the right DataFrame.");
        }

        const [leftSuffix, rightSuffix] = suffixes;

        const leftKeys = Object.keys(this._columns);
        const rightKeys = Object.keys(other._columns);
        const joinKeySet = new Set(joinKeysStr);

        const leftLen = leftKeys.length;
        const rightLen = rightKeys.length;

        const getColumnHashAt = (columns: ColumnDict, idx: number): string | null => {
            const len = joinKeysStr.length;
            for (let i = 0; i < len; i++) {
                if (columns[joinKeysStr[i]][idx] == null) return null;
            }
            return computeRowHash(columns, joinKeysStr, idx);
        };

        const rightHash = new Map<string, number[]>();
        const rightHeight = other._height;
        const rightCols = other._columns;

        for (let i = 0; i < rightHeight; i++) {
            const hash = getColumnHashAt(rightCols, i);
            if (hash === null) continue;
            let list = rightHash.get(hash);
            if (list === undefined) {
                list = [];
                rightHash.set(hash, list);
            }
            list.push(i);
        }

        const leftHeight = this._height;
        const leftCols = this._columns;

        const leftIndices: number[] = [];
        const rightIndices: (number | null)[] = [];

        const trackRight = how === "outer" || how === "right";
        const matchedRightIndices = trackRight ? new Set<number>() : null;

        for (let i = 0; i < leftHeight; i++) {
            const hash = getColumnHashAt(leftCols, i);
            const matches = hash === null ? undefined : rightHash.get(hash);

            if (matches === undefined) {
                if (how === "left" || how === "outer") {
                    leftIndices.push(i);
                    rightIndices.push(null);
                }
            } else {
                for (let m = 0; m < matches.length; m++) {
                    const rIdx = matches[m];
                    if (trackRight) {
                        matchedRightIndices!.add(rIdx);
                    }
                    leftIndices.push(i);
                    rightIndices.push(rIdx);
                }
            }
        }

        if (trackRight) {
            for (let j = 0; j < rightHeight; j++) {
                if (!matchedRightIndices!.has(j)) {
                    leftIndices.push(-1);
                    rightIndices.push(j);
                }
            }
        }

        const outHeight = leftIndices.length;
        const newColumns: ColumnDict = {};
        const outSchema: DataFrameSchema = {};

        for (let i = 0; i < leftLen; i++) {
            const k = leftKeys[i];
            const mappedName = (k in other._columns && !joinKeySet.has(k)) ? `${k}${leftSuffix}` : k;

            const leftCol = this._columns[k];
            const isJoinKey = joinKeySet.has(k);

            const outCol = new Array(outHeight);
            if (isJoinKey) {
                const rightCol = other._columns[k];
                for (let r = 0; r < outHeight; r++) {
                    const leftIdx = leftIndices[r];
                    if (leftIdx !== -1) {
                        outCol[r] = leftCol[leftIdx];
                    } else {
                        const rightIdx = rightIndices[r];
                        outCol[r] = rightIdx !== null ? rightCol[rightIdx] : null;
                    }
                }
            } else {
                for (let r = 0; r < outHeight; r++) {
                    const leftIdx = leftIndices[r];
                    outCol[r] = leftIdx !== -1 ? leftCol[leftIdx] : null;
                }
            }
            newColumns[mappedName] = outCol;
            if (this._schema[k]) {
                outSchema[mappedName] = this._schema[k];
            }
        }

        for (let i = 0; i < rightLen; i++) {
            const k = rightKeys[i];
            if (!joinKeySet.has(k)) {
                const mappedName = k in this._columns ? `${k}${rightSuffix}` : k;
                const rightCol = other._columns[k];

                const outCol = new Array(outHeight);
                for (let r = 0; r < outHeight; r++) {
                    const rightIdx = rightIndices[r];
                    outCol[r] = rightIdx !== null ? rightCol[rightIdx] : null;
                }
                newColumns[mappedName] = outCol;
                if (other._schema[k]) {
                    outSchema[mappedName] = other._schema[k];
                }
            }
        }

        return new DataFrame<R>(newColumns, outSchema, outHeight);
    }

    limit(n: number, { offset = 0, from = "start" }: LimitOptions = {}): DataFrame<T> {
        const len = this._height;
        const safeN = clamp(Math.floor(n), 0, len);
        const safeOffset = clamp(Math.floor(offset), 0, len);

        let actualStart = safeOffset;
        let actualEnd = Math.min(safeOffset + safeN, len);

        if (from === "end") {
            actualEnd = len - safeOffset;
            actualStart = Math.max(actualEnd - safeN, 0);
        }

        const newHeight = actualEnd - actualStart;
        const newColumns: ColumnDict = {};

        const keys = Object.keys(this._columns);
        const keysLen = keys.length;
        for (let i = 0; i < keysLen; i++) {
            const key = keys[i];
            newColumns[key] = (this._columns[key] as any).slice(actualStart, actualEnd);
        }

        return new DataFrame<T>(newColumns, this._schema, newHeight);
    }

    pivot<U extends RowRecord = any>(config: PivotOptions<T>): DataFrame<U> {
        if (this._height === 0) return new DataFrame<any>({}, {}, 0);

        const { index, columns, values } = config;
        const indexStr = toValidStringArray(index);
        const indexLen = indexStr.length;
        for (let j = 0; j < indexLen; j++) {
            assertColumnExists(indexStr[j], this._columns, "Pivot index key");
        }
        const colKey = String(columns);
        const valKey = String(values);
        assertColumnExists(colKey, this._columns, "Pivot column key");
        assertColumnExists(valKey, this._columns, "Pivot values key");

        const groups = new Map<string, number>();
        const firstRowIdxs: number[] = [];
        const colNames = new Set<string>();

        const height = this._height;
        const pivotCol = this._columns[colKey];
        const valCol = this._columns[valKey];

        for (let i = 0; i < height; i++) {
            const rowKey = computeRowHash(this._columns, indexStr, i);
            colNames.add(String(pivotCol[i]));

            if (groups.get(rowKey) === undefined) {
                groups.set(rowKey, groups.size);
                firstRowIdxs.push(i);
            }
        }

        const outHeight = groups.size;

        const indexColsDict: ColumnDict = {};
        const outSchema: DataFrameSchema = {};
        for (let j = 0; j < indexLen; j++) {
            const idxKey = indexStr[j];
            indexColsDict[idxKey] = this._columns[idxKey];
            if (this._schema[idxKey]) {
                outSchema[idxKey] = this._schema[idxKey];
            }
        }
        const newColumns = gatherColumnsByIndices(indexColsDict, firstRowIdxs) as Record<string, any[]>;

        const allCols = Array.from(colNames);
        const valType = this._schema[valKey] || DataTypeRegistry.Utf8;
        for (let j = 0; j < allCols.length; j++) {
            const colName = allCols[j];
            newColumns[colName] = new Array(outHeight).fill(null);
            outSchema[colName] = valType;
        }

        for (let i = 0; i < height; i++) {
            const rowKey = computeRowHash(this._columns, indexStr, i);
            const groupIdx = groups.get(rowKey)!;
            const pivotColName = String(pivotCol[i]);
            newColumns[pivotColName][groupIdx] = valCol[i];
        }

        return new DataFrame<U>(newColumns, outSchema, outHeight);
    }

    rename(mapping?: Partial<Record<keyof T, string>>): DataFrame<any> {
        const renameMapping = mapping || {};
        const newColumns: ColumnDict = {};
        const outSchema: DataFrameSchema = {};

        const originalKeys = Object.keys(this._columns);
        for (const key of originalKeys) {
            const newKey = (renameMapping as any)[key] || key;
            newColumns[newKey] = this._columns[key];
            outSchema[newKey] = this._schema[key];
        }

        const finalKeys = Object.keys(newColumns);
        if (finalKeys.length < originalKeys.length) {
            throw new DataFrameError("Rename collision: Multiple columns mapped to the same output name.");
        }

        return new DataFrame(newColumns, outSchema, this._height);
    }

    reverse(): DataFrame<T> {
        if (this._height === 0) return this;

        const newColumns: ColumnDict = {};
        const keys = Object.keys(this._columns);
        const len = keys.length;

        for (let i = 0; i < len; i++) {
            const key = keys[i];
            newColumns[key] = (this._columns[key] as any).slice().reverse();
        }

        return new DataFrame<T>(newColumns, this._schema, this._height);
    }

    get schema(): DataFrameSchema {
        return this._schema;
    }

    select<U extends RowRecord = any>(
        ...args: (string | IExpr | Record<string, any> | (string | IExpr | Record<string, any>)[])[]
    ): DataFrame<U> {
        const exprs = this._normalizeArgs(args);
        const allKeys = Object.keys(this._columns);
        const expandedExprs = resolveColumnSelectors(exprs, allKeys);

        const newColumns: ColumnDict = {};
        const outSchema: DataFrameSchema = {};

        for (const expr of expandedExprs) {
            const targetKey = expr.outputName || expr.colName || ALL_COLUMNS_MARKER;

            if (targetKey in newColumns) {
                throw new DataFrameError(`Duplicate column selection: "${targetKey}" is selected multiple times.`);
            }

            newColumns[targetKey] = expr.isWindow
                ? resolveWindowExpr(expr, this._columns, this._height)
                : expr.evaluate(this._columns, this._height);

            const originalKey = expr.colName || targetKey;
            const isPureColSelector = expr instanceof ColumnExpr && expr.ops.length === 0 && !expr.isWindow && !expr.aggFn;
            outSchema[targetKey] = (isPureColSelector && this._schema[originalKey])
                ? this._schema[originalKey]
                : inferColumnType(newColumns[targetKey]);
        }

        return new DataFrame<U>(newColumns, outSchema, this._height);
    }

    get shape(): [number, number] {
        return [this.height, this.width];
    }

    gather(
        indices: number | number[] | { every: number; offset?: number },
        options: { null_on_oob?: boolean } = {}
    ): DataFrame<T> {
        const nullOnOob = options?.null_on_oob ?? false;
        const total = this._height;
        let idxs: number[];

        if (isObj(indices) && "every" in indices) {
            const { every, offset = 0 } = indices as { every: number; offset?: number };
            if (every <= 0) {
                throw new DataFrameError("Step size every must be positive");
            }
            idxs = [];
            if (offset < 0) {
                const actualOffset = total + offset;
                for (let i = actualOffset; i >= 0; i -= every) {
                    idxs.push(i);
                }
            } else {
                for (let i = offset; i < total; i += every) {
                    idxs.push(i);
                }
            }
        } else {
            idxs = Array.isArray(indices) ? indices : [indices as any];
        }

        const numIndices = idxs.length;
        const mappedIndices = new Array(numIndices);
        for (let i = 0; i < numIndices; i++) {
            const index = idxs[i];
            let actualIdx = index < 0 ? total + index : index;
            if (actualIdx < 0 || actualIdx >= total) {
                if (!nullOnOob) {
                    throw new DataFrameError(`Index ${index} is out of bounds for DataFrame of height ${total}`);
                }
                actualIdx = -1;
            }
            mappedIndices[i] = actualIdx;
        }

        const keys = Object.keys(this._columns);
        const numKeys = keys.length;
        const newColumns: ColumnDict = {};

        for (let j = 0; j < numKeys; j++) {
            const k = keys[j];
            const oldCol = this._columns[k];
            let hasOob = false;
            for (let i = 0; i < numIndices; i++) {
                if (mappedIndices[i] === -1) {
                    hasOob = true;
                    break;
                }
            }

            const newCol = (isTypedArray(oldCol) && !hasOob)
                ? new (oldCol.constructor as any)(numIndices)
                : new Array(numIndices);

            for (let idx = 0; idx < numIndices; idx++) {
                const srcIdx = mappedIndices[idx];
                if (srcIdx === -1) {
                    newCol[idx] = null;
                } else {
                    newCol[idx] = oldCol[srcIdx];
                }
            }
            newColumns[k] = newCol;
        }

        return new DataFrame<T>(newColumns, this._schema, numIndices);
    }

    gather_every(n: number, offset: number = 0): DataFrame<T> {
        return this.gather({ every: n, offset });
    }

    slice(start: number, end?: number): DataFrame<T> {
        const total = this._height;

        const actualStart = start < 0 ? Math.max(total + start, 0) : Math.min(start, total);
        const actualEnd = end === undefined
            ? total
            : (end < 0 ? Math.max(total + end, 0) : Math.min(end, total));

        const n = Math.max(actualEnd - actualStart, 0);

        return this.limit(n, { offset: actualStart });
    }

    sort(config?: SortOptions<T>): DataFrame<T> {
        if (!config || !config.by || this._height === 0) return this;

        const { by, descending = false, nullsLast = true, custom } = config;
        const sortKeys = toValidArray(by);

        for (let i = 0; i < sortKeys.length; i++) {
            const keyOrExpr = sortKeys[i];
            if (typeof keyOrExpr === "string") {
                assertColumnExists(keyOrExpr, this._columns, "Sort key");
            }
        }

        const descArray = Array.isArray(descending)
            ? descending
            : new Array(sortKeys.length).fill(descending);

        const sortKeysLen = sortKeys.length;
        const plan = new Array(sortKeysLen);
        for (let i = 0; i < sortKeysLen; i++) {
            const keyOrExpr = sortKeys[i];
            const isDesc = descArray[i] ? -1 : 1;
            const customComp = (custom && typeof keyOrExpr === "string") ? custom[keyOrExpr as keyof T] : null;
            const values = isColExpr(keyOrExpr)
                ? keyOrExpr.evaluate(this._columns, this._height)
                : (this._columns[keyOrExpr as string] || new Array(this._height).fill(null));

            plan[i] = {
                values,
                isDesc,
                customComp
            };
        }

        const planLen = plan.length;
        const nullMultiplier = nullsLast ? 1 : -1;

        const indices = new Array(this._height);
        for (let i = 0; i < this._height; i++) {
            indices[i] = i;
        }

        indices.sort((idxA, idxB) => {
            for (let i = 0; i < planLen; i++) {
                const { values, isDesc, customComp } = plan[i];
                const vA = values[idxA];
                const vB = values[idxB];

                if (customComp) {
                    const res = customComp(vA, vB);
                    if (res !== 0) return res * isDesc;
                    continue;
                }

                if (vA == null || vB == null) {
                    if (vA === vB) continue;
                    return (vA == null ? 1 : -1) * nullMultiplier;
                }

                if (vA === vB) continue;

                const res = vA < vB ? -1 : 1;
                return res * isDesc;
            }
            return 0;
        });

        const newColumns = gatherColumnsByIndices(this._columns, indices) as DataFrameColumns<T>;

        return new DataFrame<T>(newColumns, this._schema, this._height);
    }

    tail(n: number = 10): DataFrame<T> {
        return this.limit(n, { offset: 0, from: 'end' })
    }

    to_list<K extends keyof T>(nameOrExpr: K | IExpr): any[] {
        if (this._height === 0) return [];

        const isExpression = isColExpr(nameOrExpr);

        let colData: ColumnData;
        if (isExpression) {
            const expr = nameOrExpr as IExpr;
            colData = expr.evaluate(this._columns, this._height);
        } else {
            const key = nameOrExpr as string;
            if (key == null) {
                return new Array(this._height).fill(null);
            }
            assertColumnExists(key, this._columns, "Column");
            colData = this._columns[key];
        }
        return Array.isArray(colData) ? colData : Array.from(colData);
    }

    unique<K extends keyof T>(columns?: K | K[]): DataFrame<T> {
        if (this._height === 0) return new DataFrame<T>({}, this._schema, 0);

        const colsArr = toValidArray(columns);
        const colsStr = colsArr.length === 0
            ? Object.keys(this._columns)
            : colsArr.map(String);

        for (const colKey of colsStr) {
            assertColumnExists(colKey, this._columns, "Unique column key");
        }

        const seen = new Set<string>();
        const matchingIndices: number[] = [];
        const height = this._height;

        for (let i = 0; i < height; i++) {
            const hash = computeRowHash(this._columns, colsStr, i);

            if (!seen.has(hash)) {
                seen.add(hash);
                matchingIndices.push(i);
            }
        }

        const newColumns = gatherColumnsByIndices(this._columns, matchingIndices) as DataFrameColumns<T>;
        const newHeight = matchingIndices.length;

        return new DataFrame<T>(newColumns, this._schema, newHeight);
    }

    unpivot<U extends RowRecord = any>(config: UnpivotOptions<T>): DataFrame<U> {
        const { idVars, valueVars, varName = "variable", valueName = "value" } = config;
        const idVarsStr = toValidStringArray(idVars);
        const valueVarsStr = toValidStringArray(valueVars);
        const idVarsLen = idVarsStr.length;
        const valueVarsLen = valueVarsStr.length;

        for (const idKey of idVarsStr) {
            assertColumnExists(idKey, this._columns, "Unpivot id variable key");
        }
        for (const vKey of valueVarsStr) {
            assertColumnExists(vKey, this._columns, "Unpivot value variable key");
        }

        const newHeight = this._height * valueVarsLen;

        const newColumns: Record<string, any[]> = {};
        for (let k = 0; k < idVarsLen; k++) {
            newColumns[idVarsStr[k]] = new Array(newHeight);
        }
        newColumns[varName] = new Array(newHeight);
        newColumns[valueName] = new Array(newHeight);

        let outIdx = 0;
        for (let i = 0; i < this._height; i++) {
            for (let j = 0; j < valueVarsLen; j++) {
                const vVar = valueVarsStr[j];

                for (let k = 0; k < idVarsLen; k++) {
                    const idKey = idVarsStr[k];
                    newColumns[idKey][outIdx] = this._columns[idKey][i];
                }

                newColumns[varName][outIdx] = vVar;
                newColumns[valueName][outIdx] = this._columns[vVar][i];
                outIdx++;
            }
        }

        const outSchema: DataFrameSchema = {};
        for (const key of idVarsStr) {
            outSchema[key] = this._schema[key];
        }
        outSchema[varName] = DataTypeRegistry.Utf8;
        outSchema[valueName] = inferColumnType(newColumns[valueName]);

        return new DataFrame<U>(newColumns as any, outSchema, newHeight);
    }

    vstack<U extends RowRecord = any>(
        other: ConcatItem | ConcatItem[]
    ): DataFrame<U> {
        return this.concat<U>(other, { how: "vertical" });
    }

    get width(): number {
        return Object.keys(this._columns).length;
    }

    private _normalizeArgs(args: any[]): IExpr[] {
        const flatArgs = args.flat();
        const exprs: IExpr[] = [];
        for (const arg of flatArgs) {
            if (typeof arg === "string") {
                exprs.push(new ColumnExpr(arg));
            } else if (isColExpr(arg)) {
                exprs.push(arg as unknown as IExpr);
            } else if (isObj(arg)) {
                for (const [key, val] of Object.entries(arg)) {
                    if (isColExpr(val)) {
                        exprs.push((val as unknown as IExpr).alias(key));
                    } else {
                        const staticExpr = new ColumnExpr(key);
                        staticExpr.evaluate = (_cols: ColumnDict, h: number) => new Array(h).fill(val) as any;
                        exprs.push(staticExpr);
                    }
                }
            }
        }
        return exprs;
    }

    with_columns(
        ...args: (string | IExpr | Record<string, any> | (string | IExpr | Record<string, any>)[])[]
    ): DataFrame<any> {
        const exprs = this._normalizeArgs(args);

        const allKeys = Object.keys(this._columns);
        const expandedExprs = resolveColumnSelectors(exprs, allKeys);
        const numEntries = expandedExprs.length;

        const newColumns: ColumnDict = { ...this._columns };
        const outSchema = { ...this._schema };

        for (let j = 0; j < numEntries; j++) {
            const expr = expandedExprs[j];
            const name = expr.outputName || expr.colName || ALL_COLUMNS_MARKER;

            if (expr.isWindow) {
                newColumns[name] = resolveWindowExpr(expr, this._columns, this._height);
            } else {
                newColumns[name] = expr.evaluate(this._columns, this._height);
            }

            const originalKey = expr.colName || name;
            const isPureColSelector = expr instanceof ColumnExpr && expr.ops.length === 0 && !expr.isWindow && !expr.aggFn;
            if (isPureColSelector && this._schema[originalKey]) {
                outSchema[name] = this._schema[originalKey];
            } else {
                outSchema[name] = inferColumnType(newColumns[name]);
            }
        }

        return new DataFrame(newColumns, outSchema, this._height);
    }
}
