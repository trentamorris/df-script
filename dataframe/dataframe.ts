import { ColumnExpr, AllColumnsExpr, resolveColumnSelectors } from "../columnExpressions"
import { GroupedData } from "./grouped/grouped"
import type { IExpr } from "../types"
import type { JoinType, LimitPosition, ConcatOptions, GroupMap } from "./types"
import { DataType, DataTypeRegistry } from "../datatypes"
import { isArray } from "../utils"
import {
    resolveWindowExpr,
    ensureArray,
    hashRowKeys,
    getRowJoinKeys,
    rowsToColumns,
    columnsToRows,
    getRowFromColumns,
    inferColumnType
} from "./utils"

export class DataFrame<T> {
    public columns: Record<string, any[]>
    public height: number
    public schema: Record<string, DataType> = {}

    constructor(data: T[] | Record<string, any[]>, schema?: Record<string, DataType>, height?: number) {
        if (Array.isArray(data)) {
            const { columns, height: h } = rowsToColumns(data);
            this.columns = columns;
            this.height = h;
        } else if (data && typeof data === "object") {
            this.columns = data;
            if (height !== undefined) {
                this.height = height;
            } else {
                const firstCol = Object.values(data)[0];
                this.height = isArray(firstCol) ? (firstCol as any).length : 0;
            }
        } else {
            this.columns = {};
            this.height = 0;
        }

        if (schema) {
            this.applySchema(schema);
        } else {
            this.inferSchema();
        }
    }

    private inferSchema() {
        const schema: Record<string, DataType> = {};
        const keys = Object.keys(this.columns);
        for (const key of keys) {
            schema[key] = inferColumnType(this.columns[key]);
        }
        this.schema = schema;
    }

    private applySchema(schema: Record<string, DataType>) {
        this.schema = schema;
        const keys = Object.keys(schema);
        for (const key of keys) {
            const type = schema[key];
            if (this.columns[key] === undefined) {
                this.columns[key] = new Array(this.height).fill(null);
            }
            const col = this.columns[key];
            for (let i = 0; i < this.height; i++) {
                col[i] = type.coerce(col[i]);
            }
        }
    }

    getSchema(): Record<string, DataType> {
        return this.schema;
    }

    collect(): T[] {
        return columnsToRows(this.columns, this.height);
    }

    concat<U = any>(
        items: DataFrame<any>[],
        options: ConcatOptions = {}
    ): DataFrame<U> {
        const { how = 'vertical' } = options;

        if (items.length === 0) return new DataFrame<U>({}, {}, 0);
        if (items.length === 1 && how !== 'horizontal') return items[0] as unknown as DataFrame<U>;

        switch (how) {
            case 'vertical': {
                const validItems = items.filter(df => df.height > 0);
                if (validItems.length === 0) return new DataFrame<U>({}, {}, 0);

                const firstDF = validItems[0];
                const firstKeys = Object.keys(firstDF.columns);

                for (let i = 0; i < items.length; i++) {
                    const currentDF = items[i];
                    if (currentDF.height === 0) continue;

                    const currentKeys = Object.keys(currentDF.columns);

                    if (firstKeys.length !== currentKeys.length) {
                        throw new Error(`[Strict Vertical] Column count mismatch at index ${i}.`);
                    }
                    for (let j = 0; j < firstKeys.length; j++) {
                        if (firstKeys[j] !== currentKeys[j]) {
                            throw new Error(
                                `[Strict Vertical] Schema mismatch at position ${j} in DF ${i}. ` +
                                `Expected column "${firstKeys[j]}", but found "${currentKeys[j]}".`
                            );
                        }
                    }
                }

                const newColumns: Record<string, any[]> = {};
                let newHeight = 0;
                for (const key of firstKeys) {
                    newColumns[key] = [];
                }
                for (const item of items) {
                    newHeight += item.height;
                    for (const key of firstKeys) {
                        const colArr = item.columns[key] || [];
                        newColumns[key].push(...colArr);
                    }
                }
                const outSchema = items.find(df => df.height > 0)?.schema || items[0]?.schema || {};
                return new DataFrame<U>(newColumns, outSchema, newHeight);
            }

            case 'horizontal': {
                const firstLen = items[0].height;
                const allColNames = new Set<string>();

                for (let idx = 0; idx < items.length; idx++) {
                    const df = items[idx];
                    if (df.height !== firstLen) {
                        throw new Error(`[Horizontal] Row count mismatch at index ${idx}. Expected ${firstLen}, got ${df.height}.`);
                    }

                    if (df.height > 0) {
                        for (const key of Object.keys(df.columns)) {
                            if (allColNames.has(key)) {
                                throw new Error(`[Horizontal] Duplicate column name "${key}" detected. Horizontal concat requires unique names.`);
                            }
                            allColNames.add(key);
                        }
                    }
                }

                const newColumns: Record<string, any[]> = {};
                for (const df of items) {
                    Object.assign(newColumns, df.columns);
                }
                const outSchema = Object.assign({}, ...items.map(df => df.schema));
                return new DataFrame<U>(newColumns, outSchema, firstLen);
            }

            case 'diagonal': {
                const allColumnsSet = new Set<string>();
                for (const df of items) {
                    for (const key of Object.keys(df.columns)) {
                        allColumnsSet.add(key);
                    }
                }

                const allColumns = Array.from(allColumnsSet);
                const newColumns: Record<string, any[]> = {};
                for (const key of allColumns) {
                    newColumns[key] = [];
                }

                let newHeight = 0;
                for (const df of items) {
                    const h = df.height;
                    newHeight += h;
                    for (const col of allColumns) {
                        if (df.columns[col] !== undefined) {
                            newColumns[col].push(...df.columns[col]);
                        } else {
                            newColumns[col].push(...new Array(h).fill(null));
                        }
                    }
                }

                const outSchema: Record<string, DataType> = {};
                for (const df of items) {
                    Object.assign(outSchema, df.schema);
                }
                return new DataFrame<U>(newColumns, outSchema, newHeight);
            }
        }
    }

    drop<K extends keyof T>(...args: (K | K[])[]): DataFrame<Omit<T, K>> {
        if (this.height === 0) return new DataFrame<Omit<T, K>>({}, {}, 0);

        const columnsToDrop = new Set(args.flat() as string[]);
        const newColumns: Record<string, any[]> = {};
        const outSchema: Record<string, DataType> = {};
        for (const key of Object.keys(this.columns)) {
            if (!columnsToDrop.has(key)) {
                newColumns[key] = this.columns[key];
                outSchema[key] = this.schema[key];
            }
        }

        return new DataFrame<Omit<T, K>>(newColumns, outSchema, this.height);
    }

    filter(...exprs: (IExpr | ((row: T) => any))[]): DataFrame<T> {
        if (this.height === 0) return new DataFrame({}, this.schema, 0);

        const predicates = exprs.map(expr =>
            typeof expr === "function" ? expr : (row: T) => expr.evaluate(row)
        );
        const predLen = predicates.length;

        const matchingIndices: number[] = [];
        const keys = Object.keys(this.columns);
        const numKeys = keys.length;

        for (let i = 0; i < this.height; i++) {
            const row: any = {};
            for (let j = 0; j < numKeys; j++) {
                const k = keys[j];
                const val = this.columns[k][i];
                row[k] = val === undefined ? null : val;
            }

            let keep = true;
            for (let j = 0; j < predLen; j++) {
                if (!predicates[j](row)) {
                    keep = false;
                    break;
                }
            }

            if (keep) {
                matchingIndices.push(i);
            }
        }

        const newHeight = matchingIndices.length;
        const newColumns: Record<string, any[]> = {};
        for (let j = 0; j < numKeys; j++) {
            const k = keys[j];
            const oldCol = this.columns[k];
            const newCol = new Array(newHeight);
            for (let idx = 0; idx < newHeight; idx++) {
                newCol[idx] = oldCol[matchingIndices[idx]];
            }
            newColumns[k] = newCol;
        }

        return new DataFrame<T>(newColumns, this.schema, newHeight);
    }

    groupby<K extends keyof T>(keys: K | K[]): GroupedData<T, K> {
        const keysArr = ensureArray(keys);
        const groups: GroupMap = new Map();
        const len = this.height;
        const keysStr = keysArr.map(String);

        for (let i = 0; i < len; i++) {
            const vals = new Array(keysStr.length);
            for (let j = 0; j < keysStr.length; j++) {
                const val = this.columns[keysStr[j]][i];
                vals[j] = val === undefined ? null : val;
            }
            const hash = JSON.stringify(vals);

            let group = groups.get(hash);
            if (group === undefined) {
                group = [];
                groups.set(hash, group);
            }
            group.push(i);
        }

        const allKeys = Object.keys(this.columns) as (keyof T)[];
        return new GroupedData(groups, keysArr, allKeys, this.columns, this.height, this.schema);
    }

    head(n: number = 10): DataFrame<T> {
        return this.limit(n, { offset: 0, from: "start" })
    }

    join<U>(
        other: DataFrame<U>,
        on: (keyof T & keyof U) | (keyof T & keyof U)[],
        how: JoinType = "inner",
        suffixes: [string, string] = ["", "_right"]
    ): DataFrame<any> {
        const leftData = columnsToRows(this.columns, this.height);
        const rightData = other.collect();
        const joinKeys = ensureArray(on);
        const [leftSuffix, rightSuffix] = suffixes;

        const leftKeys = Object.keys(this.columns);
        const rightKeys = rightData[0] ? Object.keys(rightData[0]) : [];
        const rightKeySet = new Set(rightKeys);
        const leftKeySet = new Set(leftKeys);
        const joinKeySet = new Set(joinKeys as string[]);

        const leftMap: [string, string][] = leftKeys.map(k =>
            [k, (rightKeySet.has(k) && !joinKeySet.has(k)) ? `${k}${leftSuffix}` : k]
        );
        const rightMap: [string, string][] = rightKeys.filter(k => !joinKeySet.has(k)).map(k =>
            [k, (leftKeySet.has(k)) ? `${k}${rightSuffix}` : k]
        );

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

            if (matches) {
                if (how === "outer" || how === "right") consumedRightKeys.add(hash);
                for (let m = 0; m < matches.length; m++) {
                    const rRow = matches[m] as any;
                    const merged: any = {};

                    for (let k = 0; k < leftMap.length; k++) merged[leftMap[k][1]] = lRow[leftMap[k][0]];
                    for (let k = 0; k < rightMap.length; k++) merged[rightMap[k][1]] = rRow[rightMap[k][0]];
                    result.push(merged);
                }
            } else if (how === "left" || how === "outer") {
                const merged: any = {};

                for (let k = 0; k < leftMap.length; k++) merged[leftMap[k][1]] = lRow[leftMap[k][0]];
                for (let k = 0; k < rightMap.length; k++) merged[rightMap[k][1]] = null;
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

        return new DataFrame(result);
    }

    limit(n: number, options: { offset?: number, from?: LimitPosition } = {}): DataFrame<T> {
        const { offset = 0, from = "start" } = options;
        const len = this.height;

        const safeN = Math.max(Math.floor(n), 0);
        const safeOffset = Math.max(Math.floor(offset), 0);

        if (safeN === 0 || len === 0 || safeOffset >= len) {
            const newColumns: Record<string, any[]> = {};
            const outSchema: Record<string, DataType> = {};
            for (const key of Object.keys(this.columns)) {
                newColumns[key] = [];
                outSchema[key] = this.schema[key];
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
        const newColumns: Record<string, any[]> = {};
        for (const key of Object.keys(this.columns)) {
            newColumns[key] = this.columns[key].slice(actualStart, actualEnd);
        }

        return new DataFrame<T>(newColumns, this.schema, newHeight);
    }

    pivot(
        index: (keyof T) | (keyof T)[],
        columns: keyof T,
        values: keyof T
    ): DataFrame<any> {
        if (this.height === 0) return new DataFrame<any>({}, {}, 0);

        const indexArr = ensureArray(index);
        const groups = new Map<string, any>();
        const colNames = new Set<string>();
        const indexLen = indexArr.length;
        const indexStr = indexArr.map(String);
        const colKey = String(columns);
        const valKey = String(values);

        for (let i = 0; i < this.height; i++) {
            const vals = new Array(indexStr.length);
            for (let j = 0; j < indexStr.length; j++) {
                const val = this.columns[indexStr[j]][i];
                vals[j] = val === undefined ? null : val;
            }
            const rowKey = JSON.stringify(vals);

            const pivotColName = String(this.columns[colKey][i]);
            colNames.add(pivotColName);

            let groupedRow = groups.get(rowKey);
            if (groupedRow === undefined) {
                groupedRow = {};
                for (let j = 0; j < indexLen; j++) {
                    const k = indexStr[j];
                    groupedRow[k] = this.columns[k][i];
                }
                groups.set(rowKey, groupedRow);
            }

            groupedRow[pivotColName] = this.columns[valKey][i];
        }

        const result = Array.from(groups.values());
        const allCols = Array.from(colNames);

        for (const row of result) {
            for (const col of allCols) {
                if (row[col] === undefined) row[col] = null;
            }
        }

        return new DataFrame(result);
    }

    rename(mapping?: Partial<Record<keyof T, string>>): DataFrame<any> {
        if (this.height === 0) return new DataFrame<T>({}, {}, 0);

        const renameMapping = mapping || {};
        const newColumns: Record<string, any[]> = {};
        const outSchema: Record<string, DataType> = {};

        for (const key of Object.keys(this.columns)) {
            const newKey = (renameMapping as any)[key] || key;
            newColumns[newKey] = this.columns[key];
            outSchema[newKey] = this.schema[key];
        }

        return new DataFrame(newColumns, outSchema, this.height);
    }

    select<U extends Record<string, any> = any>(
        ...args: (string | IExpr | (string | IExpr)[])[]
    ): DataFrame<U> {
        const exprs = args.flat();
        if (this.height === 0) return new DataFrame<U>({}, {}, 0);

        const allKeys = Object.keys(this.columns);
        const expandedExprs = resolveColumnSelectors(exprs, allKeys);

        const dataRows = columnsToRows(this.columns, this.height);

        const windowResultsMap = new Map<IExpr, any[]>();
        for (const expr of expandedExprs) {
            if (expr.isWindow) {
                windowResultsMap.set(expr, resolveWindowExpr(expr, dataRows));
            }
        }

        const newColumns: Record<string, any[]> = {};
        for (const expr of expandedExprs) {
            const targetKey = expr.outputName || (expr as any).colName || "*";
            newColumns[targetKey] = new Array(this.height);
        }

        for (let i = 0; i < this.height; i++) {
            const row = dataRows[i];
            for (const expr of expandedExprs) {
                const targetKey = expr.outputName || (expr as any).colName || "*";
                const wResults = windowResultsMap.get(expr);
                if (wResults !== undefined) {
                    newColumns[targetKey][i] = wResults[i];
                } else {
                    newColumns[targetKey][i] = expr.evaluate(row);
                }
            }
        }

        const outSchema: Record<string, DataType> = {};
        for (const expr of expandedExprs) {
            const targetKey = expr.outputName || (expr as any).colName || "*";
            const originalKey = (expr as any).colName || targetKey;
            const isPureColSelector = expr instanceof ColumnExpr && expr.ops.length === 0;
            if (isPureColSelector && this.schema[originalKey]) {
                outSchema[targetKey] = this.schema[originalKey];
            } else {
                outSchema[targetKey] = inferColumnType(newColumns[targetKey]);
            }
        }

        return new DataFrame<U>(newColumns, outSchema, this.height);
    }

    slice(start: number, end?: number): DataFrame<T> {
        const total = this.height;

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
        if (this.height === 0) return new DataFrame<T>({}, this.schema, 0);

        const { by, descending = false, nullsLast = true, custom } = config;
        const sortKeys = ensureArray(by);
        const descArray = Array.isArray(descending)
            ? descending
            : new Array(sortKeys.length).fill(descending);

        const dataRows = columnsToRows(this.columns, this.height);

        const plan = sortKeys.map((keyOrExpr, i) => {
            const isDesc = descArray[i] ? -1 : 1;
            const customComp = (custom && typeof keyOrExpr === "string") ? custom[keyOrExpr as keyof T] : null;

            return {
                getValue: (row: T) => (keyOrExpr as any)?.evaluate
                    ? (keyOrExpr as any).evaluate(row)
                    : (row as any)[keyOrExpr as string],
                isDesc,
                customComp
            };
        });

        const planLen = plan.length;
        const nullMultiplier = nullsLast ? 1 : -1;

        const indices = new Array(this.height);
        for (let i = 0; i < this.height; i++) {
            indices[i] = i;
        }

        indices.sort((idxA, idxB) => {
            const a = dataRows[idxA];
            const b = dataRows[idxB];

            for (let i = 0; i < planLen; i++) {
                const { getValue, isDesc, customComp } = plan[i];
                const vA = getValue(a);
                const vB = getValue(b);

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
        for (const key of Object.keys(this.columns)) {
            const oldCol = this.columns[key];
            const newCol = new Array(this.height);
            for (let i = 0; i < this.height; i++) {
                newCol[i] = oldCol[indices[i]];
            }
            newColumns[key] = newCol;
        }

        return new DataFrame<T>(newColumns, this.schema, this.height);
    }

    tail(n: number = 10): DataFrame<T> {
        return this.limit(n, { offset: 0, from: 'end' })
    }

    to_list<K extends keyof T>(nameOrExpr: K | IExpr): any[] {
        if (this.height === 0) return [];

        const isExpr = nameOrExpr && typeof nameOrExpr !== "string" && "evaluate" in (nameOrExpr as any);

        if (isExpr) {
            const expr = nameOrExpr as IExpr;
            const dataRows = columnsToRows(this.columns, this.height);
            const list = new Array(this.height);
            for (let i = 0; i < this.height; i++) {
                list[i] = expr.evaluate(dataRows[i]);
            }
            return list;
        } else {
            const key = nameOrExpr as string;
            const col = this.columns[key];
            if (!col) {
                return new Array(this.height).fill(null);
            }
            const list = new Array(this.height);
            for (let i = 0; i < this.height; i++) {
                const val = col[i];
                list[i] = val !== undefined ? val : null;
            }
            return list;
        }
    }

    unique<K extends keyof T>(columns?: K | K[]): DataFrame<T> {
        if (this.height === 0) return new DataFrame<T>({}, this.schema, 0);

        const colsArr = ensureArray(columns);

        if (colsArr.length === 0) {
            const dataRows = columnsToRows(this.columns, this.height);
            const seen = new Set<string>();
            const matchingIndices: number[] = [];

            for (let i = 0; i < this.height; i++) {
                const hash = JSON.stringify(dataRows[i]);
                if (!seen.has(hash)) {
                    seen.add(hash);
                    matchingIndices.push(i);
                }
            }

            const newHeight = matchingIndices.length;
            const newColumns: Record<string, any[]> = {};
            for (const key of Object.keys(this.columns)) {
                const oldCol = this.columns[key];
                const newCol = new Array(newHeight);
                for (let i = 0; i < newHeight; i++) {
                    newCol[i] = oldCol[matchingIndices[i]];
                }
                newColumns[key] = newCol;
            }
            return new DataFrame<T>(newColumns, this.schema, newHeight);
        }

        const seen = new Set<string>();
        const matchingIndices: number[] = [];
        const colsStr = colsArr.map(String);

        for (let i = 0; i < this.height; i++) {
            const vals = new Array(colsStr.length);
            for (let j = 0; j < colsStr.length; j++) {
                const val = this.columns[colsStr[j]][i];
                vals[j] = val === undefined ? null : val;
            }
            const hash = JSON.stringify(vals);

            if (!seen.has(hash)) {
                seen.add(hash);
                matchingIndices.push(i);
            }
        }

        const newHeight = matchingIndices.length;
        const newColumns: Record<string, any[]> = {};
        for (const key of Object.keys(this.columns)) {
            const oldCol = this.columns[key];
            const newCol = new Array(newHeight);
            for (let i = 0; i < newHeight; i++) {
                newCol[i] = oldCol[matchingIndices[i]];
            }
            newColumns[key] = newCol;
        }

        return new DataFrame<T>(newColumns, this.schema, newHeight);
    }

    unpivot(
        idVars: (keyof T) | (keyof T)[],
        valueVars: (keyof T) | (keyof T)[],
        varName: string = "variable",
        valueName: string = "value"
    ): DataFrame<any> {
        if (this.height === 0) return new DataFrame<any>({}, {}, 0);

        const idVarsArr = ensureArray(idVars);
        const valueVarsArr = ensureArray(valueVars);
        const idVarsStr = idVarsArr.map(String);
        const valueVarsStr = valueVarsArr.map(String);
        const vVarLen = valueVarsArr.length;
        const idVarLen = idVarsArr.length;

        const newHeight = this.height * vVarLen;

        const newColumns: Record<string, any[]> = {};
        for (let k = 0; k < idVarLen; k++) {
            newColumns[idVarsStr[k]] = new Array(newHeight);
        }
        newColumns[varName] = new Array(newHeight);
        newColumns[valueName] = new Array(newHeight);

        let outIdx = 0;
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < vVarLen; j++) {
                const vVar = valueVarsStr[j];

                for (let k = 0; k < idVarLen; k++) {
                    const idKey = idVarsStr[k];
                    newColumns[idKey][outIdx] = this.columns[idKey][i];
                }

                newColumns[varName][outIdx] = vVar;
                newColumns[valueName][outIdx] = this.columns[vVar][i];
                outIdx++;
            }
        }

        const outSchema: Record<string, DataType> = {};
        for (const key of idVarsStr) {
            outSchema[key] = this.schema[key];
        }
        outSchema[varName] = DataTypeRegistry.Utf8;
        outSchema[valueName] = inferColumnType(newColumns[valueName]);

        return new DataFrame(newColumns, outSchema, newHeight);
    }

    with_columns(
        ...args: (string | IExpr | Record<string, any> | (string | IExpr | Record<string, any>)[])[]
    ): DataFrame<any> {
        const flatArgs = args.flat();
        if (this.height === 0) return new DataFrame<any>({});

        const exprs: IExpr[] = [];
        for (const arg of flatArgs) {
            if (typeof arg === "string") {
                exprs.push(new ColumnExpr(arg));
            } else if (arg && typeof arg === "object" && 'evaluate' in arg) {
                exprs.push(arg as IExpr);
            } else if (arg && typeof arg === "object") {
                for (const [key, val] of Object.entries(arg)) {
                    if (val && typeof val === "object" && 'evaluate' in val) {
                        exprs.push((val as IExpr).alias(key));
                    } else {
                        const staticExpr = new ColumnExpr(key);
                        staticExpr.evaluate = () => val;
                        exprs.push(staticExpr);
                    }
                }
            }
        }

        const allKeys = Object.keys(this.columns);
        const expandedExprs = resolveColumnSelectors(exprs, allKeys);
        const numEntries = expandedExprs.length;

        const dataRows = columnsToRows(this.columns, this.height);

        const plan = expandedExprs.map(expr => {
            const isWindow = expr.isWindow;
            const windowResults = isWindow ? resolveWindowExpr(expr, dataRows) : undefined;
            return {
                name: expr.outputName || (expr as any).colName || "*",
                expr,
                windowResults
            };
        });

        const newColumns: Record<string, any[]> = { ...this.columns };

        for (let j = 0; j < numEntries; j++) {
            const step = plan[j];
            newColumns[step.name] = new Array(this.height);
        }

        for (let i = 0; i < this.height; i++) {
            const row = dataRows[i];
            for (let j = 0; j < numEntries; j++) {
                const step = plan[j];
                if (step.windowResults !== undefined) {
                    newColumns[step.name][i] = step.windowResults[i];
                } else {
                    newColumns[step.name][i] = step.expr.evaluate(row);
                }
            }
        }

        const outSchema = { ...this.schema };
        for (let j = 0; j < numEntries; j++) {
            const step = plan[j];
            const originalKey = (step.expr as any).colName || step.name;
            const isPureColSelector = step.expr instanceof ColumnExpr && step.expr.ops.length === 0;
            if (isPureColSelector && this.schema[originalKey]) {
                outSchema[step.name] = this.schema[originalKey];
            } else {
                outSchema[step.name] = inferColumnType(newColumns[step.name]);
            }
        }

        return new DataFrame(newColumns, outSchema, this.height);
    }
}
