import { ColumnExpr, resolveColumnSelectors } from "../columnExpressions"
import { GroupedData } from "./grouped/grouped"
import type { IExpr, ColumnData, ColumnDict, DataFrameColumns, ConcatOptions, ConcatItem, HorizontalConcatOptions } from "../types"
import type { JoinType, LimitPosition, GroupMap } from "./types"
import { DataType, DataTypeRegistry } from "../datatypes"
import { isArrayOrTypedArray, isTypedArray, toValidArray, isObj, isArrayOfType } from "../utils"
import { concat } from "../functions/concat"
import { KEY_SEPARATOR } from "./constants"
import {
    resolveWindowExpr,
    getRowJoinKeys,
    rowsToColumns,
    columnsToRows,
    inferColumnType
} from "./utils"

export class DataFrame<T extends Record<string, any> = any> {
    public _columns: DataFrameColumns<T>
    private _height: number
    private _schema: Record<string, DataType> = {}

    constructor(data: T[] | ColumnDict, schema?: Record<string, DataType>, height?: number) {
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
                    throw new Error(`Column height mismatch: Column "${key}" has length ${colLen}, but previous columns have length ${firstLength}`);
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
        const schema: Record<string, DataType> = {};
        const keys = Object.keys(this._columns);
        for (const key of keys) {
            schema[key] = inferColumnType(this._columns[key]);
        }
        this._schema = schema;
    }

    private applySchema(schema: Record<string, DataType>) {
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

    getSchema(): Record<string, DataType> {
        return this._schema;
    }

    collect(): T[] {
        return columnsToRows(this._columns, this._height);
    }

    get columns(): string[] {
        return Object.keys(this._columns);
    }

    concat<U extends Record<string, any> = any>(
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
        const outSchema: Record<string, DataType> = {};
        for (const key of Object.keys(this._columns)) {
            if (!columnsToDrop.has(key)) {
                newColumns[key] = this._columns[key];
                outSchema[key] = this._schema[key];
            }
        }

        return new DataFrame<Omit<T, K>>(newColumns, outSchema, this._height);
    }

    get dtypes(): DataType[] {
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

        const newHeight = matchingIndices.length;
        const newColumns: Record<string, any[]> = {};
        for (let j = 0; j < numKeys; j++) {
            const k = keys[j];
            const oldCol = this._columns[k];
            const newCol = new Array(newHeight);
            for (let idx = 0; idx < newHeight; idx++) {
                newCol[idx] = oldCol[matchingIndices[idx]];
            }
            newColumns[k] = newCol;
        }

        return new DataFrame<T>(newColumns, this._schema, newHeight);
    }

    groupby<K extends keyof T>(keys: K | K[]): GroupedData<T, K> {
        const keysArr = toValidArray(keys);
        const groups: GroupMap = new Map();
        const len = this._height;
        const keysLen = keysArr.length;
        const keysStr = new Array(keysLen);
        for (let i = 0; i < keysLen; i++) {
            keysStr[i] = String(keysArr[i]);
        }

        for (let j = 0; j < keysStr.length; j++) {
            if (!(keysStr[j] in this._columns)) {
                throw new Error(`Grouping key "${keysStr[j]}" does not exist in the DataFrame.`);
            }
        }

        for (let i = 0; i < len; i++) {
            const vals = new Array(keysStr.length);
            for (let j = 0; j < keysStr.length; j++) {
                const val = this._columns[keysStr[j]][i];
                vals[j] = val == null ? "" : String(val);
            }
            const hash = vals.join(KEY_SEPARATOR);

            let group = groups.get(hash);
            if (group === undefined) {
                group = [];
                groups.set(hash, group);
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

    hstack<U extends Record<string, any> = any>(
        other: ConcatItem | ConcatItem[],
        options: HorizontalConcatOptions = {}
    ): DataFrame<U> {
        return this.concat<U>(other, { how: "horizontal", horizontal: options });
    }

    join<U extends Record<string, any> = any, R extends Record<string, any> = any>(config: {
        other: DataFrame<U>;
        on: (keyof T & keyof U) | (keyof T & keyof U)[];
        how?: JoinType;
        suffixes?: [string, string];
    }): DataFrame<R> {
        const { other, on, how = "inner", suffixes = ["", "_right"] } = config;
        const joinKeys = toValidArray(on);
        for (const key of joinKeys) {
            const keyStr = String(key);
            if (!(keyStr in this._columns)) {
                throw new Error(`Join key "${keyStr}" does not exist in the left DataFrame.`);
            }
            if (!(keyStr in other._columns)) {
                throw new Error(`Join key "${keyStr}" does not exist in the right DataFrame.`);
            }
        }

        const leftData = columnsToRows(this._columns, this._height);
        const rightData = other.collect();
        const [leftSuffix, rightSuffix] = suffixes;

        const leftKeys = Object.keys(this._columns);
        const rightKeys = Object.keys(other._columns);
        const rightKeySet = new Set(rightKeys);
        const leftKeySet = new Set(leftKeys);
        const joinKeySet = new Set(joinKeys as string[]);

        const leftLen = leftKeys.length;
        const leftMap: [string, string][] = new Array(leftLen);
        for (let i = 0; i < leftLen; i++) {
            const k = leftKeys[i];
            const mappedName = (rightKeySet.has(k) && !joinKeySet.has(k)) ? `${k}${leftSuffix}` : k;
            leftMap[i] = [k, mappedName];
        }

        const rightMap: [string, string][] = [];
        const rightLen = rightKeys.length;
        for (let i = 0; i < rightLen; i++) {
            const k = rightKeys[i];
            if (!joinKeySet.has(k)) {
                const mappedName = leftKeySet.has(k) ? `${k}${rightSuffix}` : k;
                rightMap.push([k, mappedName]);
            }
        }

        const rightHash = new Map<string, U[]>();
        let uniqueNullId = 0;
        for (let i = 0; i < rightData.length; i++) {
            const rRow = rightData[i] as any;
            const { hash, hasNull } = getRowJoinKeys(rRow, joinKeys);
            const finalHash = hasNull ? `__null_key_${uniqueNullId++}__` : hash;

            let group = rightHash.get(finalHash);
            if (!group) { group = []; rightHash.set(finalHash, group); }
            group.push(rRow);
        }

        const result: any[] = [];
        const consumedRightKeys = new Set<string>();

        for (let i = 0; i < leftData.length; i++) {
            const lRow = leftData[i] as any;
            const { hash, hasNull } = getRowJoinKeys(lRow, joinKeys);
            const matches = hasNull ? undefined : rightHash.get(hash);

            if (!matches) {
                if (how === "left" || how === "outer") {
                    const merged: any = {};
                    for (let k = 0; k < leftMap.length; k++) merged[leftMap[k][1]] = lRow[leftMap[k][0]];
                    for (let k = 0; k < rightMap.length; k++) merged[rightMap[k][1]] = null;
                    result.push(merged);
                }
                continue;
            }

            if (how === "outer" || how === "right") consumedRightKeys.add(hash);
            for (let m = 0; m < matches.length; m++) {
                const rRow = matches[m] as any;
                const merged: any = {};

                for (let k = 0; k < leftMap.length; k++) merged[leftMap[k][1]] = lRow[leftMap[k][0]];
                for (let k = 0; k < rightMap.length; k++) merged[rightMap[k][1]] = rRow[rightMap[k][0]];
                result.push(merged);
            }
        }

        if (how === "outer" || how === "right") {
            for (const [hash, matches] of rightHash.entries()) {
                if (!consumedRightKeys.has(hash)) {
                    for (let m = 0; m < matches.length; m++) {
                        const rRow = matches[m] as any;
                        const merged: any = {};
                        for (let k = 0; k < leftMap.length; k++) {
                            const originalKey = leftMap[k][0];
                            merged[leftMap[k][1]] = joinKeySet.has(originalKey) ? rRow[originalKey] : null;
                        }
                        for (let k = 0; k < rightMap.length; k++) merged[rightMap[k][1]] = rRow[rightMap[k][0]];
                        result.push(merged);
                    }
                }
            }
        }

        return new DataFrame<R>(result as any);
    }

    limit(n: number, options: { offset?: number, from?: LimitPosition } = {}): DataFrame<T> {
        const { offset = 0, from = "start" } = options;
        const len = this._height;

        const safeN = isNaN(n) ? 0 : Math.max(Math.floor(n), 0);
        const safeOffset = isNaN(offset) ? 0 : Math.max(Math.floor(offset), 0);

        if (safeN === 0 || len === 0 || safeOffset >= len) {
            const newColumns: Record<string, any[]> = {};
            const outSchema: Record<string, DataType> = {};
            for (const key of Object.keys(this._columns)) {
                newColumns[key] = [];
                outSchema[key] = this._schema[key];
            }
            return new DataFrame<T>(newColumns, outSchema, 0);
        }

        let actualStart = 0;
        let actualEnd = 0;

        if (from === "end") {
            actualEnd = Math.max(len - safeOffset, 0);
            actualStart = Math.max(actualEnd - safeN, 0);
        } else {
            actualEnd = Math.min(safeOffset + safeN, len);
            actualStart = safeOffset;
        }

        const newHeight = Math.max(actualEnd - actualStart, 0);
        const newColumns: ColumnDict = {};
        for (const key of Object.keys(this._columns)) {
            newColumns[key] = (this._columns[key] as any).slice(actualStart, actualEnd);
        }

        return new DataFrame<T>(newColumns, this._schema, newHeight);
    }

    pivot<U extends Record<string, any> = any>(config: {
        index: (keyof T) | (keyof T)[];
        columns: keyof T;
        values: keyof T;
    }): DataFrame<U> {
        if (this._height === 0) return new DataFrame<any>({}, {}, 0);

        const { index, columns, values } = config;
        const indexArr = toValidArray(index);
        const indexLen = indexArr.length;
        const indexStr = new Array(indexLen);
        for (let i = 0; i < indexLen; i++) {
            indexStr[i] = String(indexArr[i]);
        }
        const colKey = String(columns);
        const valKey = String(values);

        for (const idxKey of indexStr) {
            if (!(idxKey in this._columns)) {
                throw new Error(`Pivot index key "${idxKey}" does not exist in the DataFrame.`);
            }
        }
        if (!(colKey in this._columns)) {
            throw new Error(`Pivot column key "${colKey}" does not exist in the DataFrame.`);
        }
        if (!(valKey in this._columns)) {
            throw new Error(`Pivot values key "${valKey}" does not exist in the DataFrame.`);
        }

        const groups = new Map<string, any>();
        const colNames = new Set<string>();

        for (let i = 0; i < this._height; i++) {
            const vals = new Array(indexStr.length);
            for (let j = 0; j < indexStr.length; j++) {
                const val = this._columns[indexStr[j]][i];
                vals[j] = val == null ? "" : String(val);
            }
            const rowKey = vals.join(KEY_SEPARATOR);

            const pivotColName = String(this._columns[colKey][i]);
            colNames.add(pivotColName);

            let groupedRow = groups.get(rowKey);
            if (groupedRow === undefined) {
                groupedRow = {};
                for (let j = 0; j < indexLen; j++) {
                    const k = indexStr[j];
                    groupedRow[k] = this._columns[k][i];
                }
                groups.set(rowKey, groupedRow);
            }

            groupedRow[pivotColName] = this._columns[valKey][i];
        }

        const result = Array.from(groups.values());
        const allCols = Array.from(colNames);

        for (const row of result) {
            for (const col of allCols) {
                if (row[col] === undefined) row[col] = null;
            }
        }

        return new DataFrame<U>(result as any);
    }

    rename(mapping?: Partial<Record<keyof T, string>>): DataFrame<any> {
        const renameMapping = mapping || {};
        const newColumns: ColumnDict = {};
        const outSchema: Record<string, DataType> = {};

        const originalKeys = Object.keys(this._columns);
        for (const key of originalKeys) {
            const newKey = (renameMapping as any)[key] || key;
            newColumns[newKey] = this._columns[key];
            outSchema[newKey] = this._schema[key];
        }

        const finalKeys = Object.keys(newColumns);
        if (finalKeys.length < originalKeys.length) {
            throw new Error("Rename collision: Multiple columns mapped to the same output name.");
        }

        return new DataFrame(newColumns, outSchema, this._height);
    }

    get schema(): Record<string, DataType> {
        return this._schema;
    }

    select<U extends Record<string, any> = any>(
        ...args: (string | IExpr | Record<string, any> | (string | IExpr | Record<string, any>)[])[]
    ): DataFrame<U> {
        const exprs = this._normalizeArgs(args);
        const allKeys = Object.keys(this._columns);
        const expandedExprs = resolveColumnSelectors(exprs, allKeys);

        const seenNames = new Set<string>();
        for (const expr of expandedExprs) {
            const targetKey = expr.outputName || (expr as any).colName || "*";
            if (seenNames.has(targetKey)) {
                throw new Error(`Duplicate column selection: "${targetKey}" is selected multiple times.`);
            }
            seenNames.add(targetKey);
        }

        const newColumns: ColumnDict = {};
        for (const expr of expandedExprs) {
            const targetKey = expr.outputName || (expr as any).colName || "*";
            if (expr.isWindow) {
                newColumns[targetKey] = resolveWindowExpr(expr, this._columns, this._height);
            } else {
                newColumns[targetKey] = expr.evaluate(this._columns, this._height);
            }
        }

        const outSchema: Record<string, DataType> = {};
        for (const expr of expandedExprs) {
            const targetKey = expr.outputName || (expr as any).colName || "*";
            const originalKey = (expr as any).colName || targetKey;
            const isPureColSelector = expr instanceof ColumnExpr && expr.ops.length === 0;
            if (isPureColSelector && this._schema[originalKey]) {
                outSchema[targetKey] = this._schema[originalKey];
            } else {
                outSchema[targetKey] = inferColumnType(newColumns[targetKey]);
            }
        }

        return new DataFrame<U>(newColumns, outSchema, this._height);
    }

    get shape(): [number, number] {
        return [this.height, this.width];
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

    sort(config?: {
        by: keyof T | (keyof T)[] | IExpr | IExpr[]
        descending?: boolean | boolean[]
        nullsLast?: boolean
        custom?: Partial<Record<keyof T, (a: any, b: any) => number>>
    }): DataFrame<T> {
        if (!config || !config.by) return this;
        if (this._height === 0) return new DataFrame<T>({}, this._schema, 0);

        const { by, descending = false, nullsLast = true, custom } = config;
        const sortKeys = toValidArray(by);

        for (let i = 0; i < sortKeys.length; i++) {
            const keyOrExpr = sortKeys[i];
            if (typeof keyOrExpr === "string" && !(keyOrExpr in this._columns)) {
                throw new Error(`Sort key "${keyOrExpr}" does not exist in the DataFrame.`);
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
            const values = (keyOrExpr as any)?.evaluate
                ? (keyOrExpr as any).evaluate(this._columns, this._height)
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

        const newColumns: Record<string, any[]> = {};
        for (const key of Object.keys(this._columns)) {
            const oldCol = this._columns[key];
            const newCol = new Array(this._height);
            for (let i = 0; i < this._height; i++) {
                newCol[i] = oldCol[indices[i]];
            }
            newColumns[key] = newCol;
        }

        return new DataFrame<T>(newColumns, this._schema, this._height);
    }

    tail(n: number = 10): DataFrame<T> {
        return this.limit(n, { offset: 0, from: 'end' })
    }

    to_list<K extends keyof T>(nameOrExpr: K | IExpr): any[] {
        if (this._height === 0) return [];

        const isExpr = nameOrExpr && typeof nameOrExpr !== "string" && "evaluate" in (nameOrExpr as any);

        let colData: ColumnData;
        if (isExpr) {
            const expr = nameOrExpr as IExpr;
            colData = expr.evaluate(this._columns, this._height);
        } else {
            const key = nameOrExpr as string;
            if (key == null) {
                return new Array(this._height).fill(null);
            }
            const col = this._columns[key];
            if (!col) {
                throw new Error(`Column "${key}" does not exist in the DataFrame.`);
            }
            colData = col;
        }
        return Array.isArray(colData) ? colData : Array.from(colData);
    }

    unique<K extends keyof T>(columns?: K | K[]): DataFrame<T> {
        if (this._height === 0) return new DataFrame<T>({}, this._schema, 0);

        const colsArr = toValidArray(columns);

        if (colsArr.length === 0) {
            const seen = new Set<string>();
            const matchingIndices: number[] = [];
            const colKeys = Object.keys(this._columns);
            const numCols = colKeys.length;
            const height = this._height;

            for (let i = 0; i < height; i++) {
                const vals = new Array(numCols);
                for (let j = 0; j < numCols; j++) {
                    const val = this._columns[colKeys[j]][i];
                    vals[j] = val == null ? "" : String(val);
                }
                const hash = vals.join(KEY_SEPARATOR);
                if (!seen.has(hash)) {
                    seen.add(hash);
                    matchingIndices.push(i);
                }
            }

            const newHeight = matchingIndices.length;
            const newColumns: Record<string, any[]> = {};
            for (const key of Object.keys(this._columns)) {
                const oldCol = this._columns[key];
                const newCol = new Array(newHeight);
                for (let i = 0; i < newHeight; i++) {
                    newCol[i] = oldCol[matchingIndices[i]];
                }
                newColumns[key] = newCol;
            }
            return new DataFrame<T>(newColumns, this._schema, newHeight);
        }

        const seen = new Set<string>();
        const matchingIndices: number[] = [];
        const colsLen = colsArr.length;
        const colsStr = new Array(colsLen);
        for (let i = 0; i < colsLen; i++) {
            colsStr[i] = String(colsArr[i]);
        }

        for (const colKey of colsStr) {
            if (!(colKey in this._columns)) {
                throw new Error(`Unique column key "${colKey}" does not exist in the DataFrame.`);
            }
        }

        for (let i = 0; i < this._height; i++) {
            const vals = new Array(colsStr.length);
            for (let j = 0; j < colsStr.length; j++) {
                const val = this._columns[colsStr[j]][i];
                vals[j] = val == null ? "" : String(val);
            }
            const hash = vals.join(KEY_SEPARATOR);

            if (!seen.has(hash)) {
                seen.add(hash);
                matchingIndices.push(i);
            }
        }

        const newHeight = matchingIndices.length;
        const newColumns: Record<string, any[]> = {};
        for (const key of Object.keys(this._columns)) {
            const oldCol = this._columns[key];
            const newCol = new Array(newHeight);
            for (let i = 0; i < newHeight; i++) {
                newCol[i] = oldCol[matchingIndices[i]];
            }
            newColumns[key] = newCol;
        }

        return new DataFrame<T>(newColumns, this._schema, newHeight);
    }

    unpivot<U extends Record<string, any> = any>(config: {
        idVars: (keyof T) | (keyof T)[];
        valueVars: (keyof T) | (keyof T)[];
        varName?: string;
        valueName?: string;
    }): DataFrame<U> {
        const { idVars, valueVars, varName = "variable", valueName = "value" } = config;
        const idVarsArr = toValidArray(idVars);
        const valueVarsArr = toValidArray(valueVars);
        const idVarsLen = idVarsArr.length;
        const idVarsStr = new Array(idVarsLen);
        for (let i = 0; i < idVarsLen; i++) {
            idVarsStr[i] = String(idVarsArr[i]);
        }
        const valueVarsLen = valueVarsArr.length;
        const valueVarsStr = new Array(valueVarsLen);
        for (let i = 0; i < valueVarsLen; i++) {
            valueVarsStr[i] = String(valueVarsArr[i]);
        }
        const vVarLen = valueVarsArr.length;
        const idVarLen = idVarsArr.length;

        for (const idKey of idVarsStr) {
            if (!(idKey in this._columns)) {
                throw new Error(`Unpivot id variable key "${idKey}" does not exist in the DataFrame.`);
            }
        }
        for (const vKey of valueVarsStr) {
            if (!(vKey in this._columns)) {
                throw new Error(`Unpivot value variable key "${vKey}" does not exist in the DataFrame.`);
            }
        }

        const newHeight = this._height * vVarLen;

        const newColumns: Record<string, any[]> = {};
        for (let k = 0; k < idVarLen; k++) {
            newColumns[idVarsStr[k]] = new Array(newHeight);
        }
        newColumns[varName] = new Array(newHeight);
        newColumns[valueName] = new Array(newHeight);

        let outIdx = 0;
        for (let i = 0; i < this._height; i++) {
            for (let j = 0; j < vVarLen; j++) {
                const vVar = valueVarsStr[j];

                for (let k = 0; k < idVarLen; k++) {
                    const idKey = idVarsStr[k];
                    newColumns[idKey][outIdx] = this._columns[idKey][i];
                }

                newColumns[varName][outIdx] = vVar;
                newColumns[valueName][outIdx] = this._columns[vVar][i];
                outIdx++;
            }
        }

        const outSchema: Record<string, DataType> = {};
        for (const key of idVarsStr) {
            outSchema[key] = this._schema[key];
        }
        outSchema[varName] = DataTypeRegistry.Utf8;
        outSchema[valueName] = inferColumnType(newColumns[valueName]);

        return new DataFrame<U>(newColumns as any, outSchema, newHeight);
    }

    vstack<U extends Record<string, any> = any>(
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
            } else if (isObj(arg) && 'evaluate' in arg) {
                exprs.push(arg as unknown as IExpr);
            } else if (isObj(arg)) {
                for (const [key, val] of Object.entries(arg)) {
                    if (isObj(val) && 'evaluate' in val) {
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
            const name = expr.outputName || (expr as any).colName || "*";

            if (expr.isWindow) {
                newColumns[name] = resolveWindowExpr(expr, this._columns, this._height);
            } else {
                newColumns[name] = expr.evaluate(this._columns, this._height);
            }

            const originalKey = (expr as any).colName || name;
            const isPureColSelector = expr instanceof ColumnExpr && expr.ops.length === 0;
            if (isPureColSelector && this._schema[originalKey]) {
                outSchema[name] = this._schema[originalKey];
            } else {
                outSchema[name] = inferColumnType(newColumns[name]);
            }
        }

        return new DataFrame(newColumns, outSchema, this._height);
    }
}
