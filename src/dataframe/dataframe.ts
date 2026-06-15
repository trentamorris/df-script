import { ColumnExpr, resolveColumnSelectors, ALL_COLUMNS_MARKER, seq_range, all, evaluateExpression } from "../columnExpressions"
import { GroupedData } from "./grouped/grouped"
import { NEWLINE } from "./constants"
import { createSafeJsonReplacer } from "../utils/json"
import type { IExpr, ColumnData, ColumnDict, DataFrameColumns, ConcatOptions, ConcatItem, HorizontalConcatOptions, RowRecord, DataFrameSchema, RegisteredDataType, ExplodeOptions, IntoExpr, FillNullOptions } from "../types"
import type { GroupMap, LimitOptions, SortOptions, PivotOptions, JoinOptions, UnpivotOptions, TransposeOptions, WriteJSONOptions, WriteCSVOptions } from "./types"
import { DataTypeRegistry } from "../datatypes"
import { isArrayOrTypedArray, toValidArray, toValidStringArray, isObj, isArrayOfType, clamp, isTypedArray, stringifyCSV } from "../utils"
import { assertColumnExists, assertHeight, DataFrameError, ShapeError, ColumnNotFoundError } from "../exceptions"
import { concat } from "../functions/concat"
import {
    rowsToColumns,
    columnsToRows,
    inferColumnType,
    gatherColumnsByIndices,
    computeRowHash,
    coerceColumn,
    writeStringToFileOrStream
} from "./utils"

export class DataFrame<T extends RowRecord = any> {
    public _columns: DataFrameColumns<T>
    private _height: number
    private _schema: DataFrameSchema = {}

    static _createDirect<U extends RowRecord = any>(
        columns: ColumnDict,
        schema: DataFrameSchema,
        height: number
    ): DataFrame<U> {
        assertHeight(columns, height);

        const df = Object.create(DataFrame.prototype);
        df._columns = columns;
        df._schema = schema;
        df._height = height;
        return df;
    }

    constructor(data: T[] | ColumnDict, schema?: DataFrameSchema, height?: number) {
        if (Array.isArray(data)) {
            const { columns, height: h } = rowsToColumns(data);
            this._columns = columns as DataFrameColumns<T>;
            this._height = h;
            schema ? this.applySchema(schema) : this.inferSchema();
            return;
        }

        if (isObj(data)) {
            this._columns = data as DataFrameColumns<T>;
            this._height = assertHeight(data, height);
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
        const numKeys = keys.length;
        for (let i = 0; i < numKeys; i++) {
            const key = keys[i];
            schema[key] = inferColumnType(this._columns[key]);
        }
        this.applySchema(schema);
    }

    private applySchema(schema: DataFrameSchema) {
        this._schema = schema;
        const keys = Object.keys(schema);
        const newColumns: ColumnDict = {};
        for (const key of keys) {
            const type = schema[key];
            const oldCol = this._columns[key];
            newColumns[key] = oldCol
                ? coerceColumn(oldCol, type, this._height)
                : coerceColumn(new Array(this._height).fill(null), type, this._height);
        }
        this._columns = newColumns as DataFrameColumns<T>;
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

        return DataFrame._createDirect<Omit<T, K>>(newColumns, outSchema, this._height);
    }

    drop_nulls(subset?: string | string[]): DataFrame<T> {
        if (this._height === 0) return this;
        return this.filter(subset ? new ColumnExpr(subset).is_not_null() : all().is_not_null());
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

    explode(
        columns: IntoExpr | IntoExpr[],
        options?: ExplodeOptions
    ): DataFrame<any> {
        const expr = ColumnExpr.toColExpr(columns);
        const colNames = expr.colNames || [expr.colName || expr.outputName];
        const colsToExplode = new Set<string>();
        const numCols = colNames.length;
        for (let i = 0; i < numCols; i++) {
            const name = colNames[i];
            if (!name) {
                throw new DataFrameError("Expression passed to explode must have a column name.");
            }
            assertColumnExists(name, this._columns, "Explode column");
            colsToExplode.add(name);
        }
        const keys = Object.keys(this._columns);
        const selectList: IExpr[] = [];
        const numKeys = keys.length;
        for (let i = 0; i < numKeys; i++) {
            const key = keys[i];
            selectList.push(
                colsToExplode.has(key)
                    ? new ColumnExpr(key).list.explode(options)
                    : new ColumnExpr(key)
            );
        }

        return this.select(...selectList);
    }

    fill_null(options: FillNullOptions = {}): DataFrame<T> {
        if (this._height === 0) return this;
        return this.with_columns(all().fill_null(options));
    }

    filter(...exprs: (IExpr | ((row: T) => any))[]): DataFrame<T> {
        if (this._height === 0) return DataFrame._createDirect({}, this._schema, 0);

        const height = this._height;
        const keys = Object.keys(this._columns);
        const numKeys = keys.length;

        const evaluatedExprs: ColumnData[] = [];
        const funcPredicates: ((row: T) => any)[] = [];

        const exprSelectors: IExpr[] = [];
        const numExprs = exprs.length;
        for (let i = 0; i < numExprs; i++) {
            const expr = exprs[i];
            if (typeof expr === "function") {
                funcPredicates.push(expr);
            } else {
                exprSelectors.push(expr);
            }
        }

        const expandedExprs = resolveColumnSelectors(exprSelectors, keys, undefined, this._schema, this._columns);
        const numExpanded = expandedExprs.length;
        for (let i = 0; i < numExpanded; i++) {
            evaluatedExprs.push(expandedExprs[i].evaluate(this._columns, height));
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

        return DataFrame._createDirect<T>(newColumns, this._schema, newHeight);
    }

    get_schema(): DataFrameSchema {
        return this._schema;
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

    insert_column(index: number, name: string, expr: IntoExpr): DataFrame<any> {
        const colExpr = ColumnExpr.toColExpr(expr).alias(name);
        const keys = Object.keys(this._columns);
        const keysLen = keys.length;

        const selectList: any[] = [];
        for (let i = 0; i < keysLen; i++) {
            const k = keys[i];
            if (k !== name) {
                selectList.push(k);
            }
        }

        const targetIndex = Math.max(0, Math.min(index, selectList.length));
        selectList.splice(targetIndex, 0, colExpr);

        return this.select<any>(...selectList);
    }

    item(row?: number, column?: number | string): any {
        const height = this._height;
        const keys = Object.keys(this._columns);
        const width = keys.length;

        if (row === undefined && column === undefined) {
            if (height !== 1 || width !== 1) {
                throw new DataFrameError("DataFrame.item() can only be called without arguments if the shape is (1, 1).");
            }
            return this._columns[keys[0]][0];
        }

        if (row === undefined || column === undefined) {
            throw new DataFrameError("DataFrame.item() requires both row and column to be specified if not empty.");
        }

        if (row < 0 || row >= height) {
            throw new ShapeError(`Row index ${row} is out of bounds for DataFrame height ${height}.`);
        }

        let colName: string;
        if (typeof column === "number") {
            if (column < 0 || column >= width) {
                throw new ShapeError(`Column index ${column} is out of bounds for DataFrame width ${width}.`);
            }
            colName = keys[column];
        } else {
            colName = column;
            if (this._columns[colName] === undefined) {
                throw new ColumnNotFoundError(colName);
            }
        }

        return this._columns[colName][row];
    }

    *iter_columns(): Generator<ColumnData> {
        const keys = Object.keys(this._columns);
        const keysLen = keys.length;
        const columns = this._columns;
        for (let j = 0; j < keysLen; j++) {
            yield columns[keys[j]];
        }
    }

    *iter_rows({ named = false }: { named?: boolean } = {}): Generator<any[] | Record<string, any>> {
        const keys = Object.keys(this._columns);
        const keysLen = keys.length;
        const columns = this._columns;
        const height = this._height;

        const colArrays = new Array(keysLen);
        for (let j = 0; j < keysLen; j++) {
            colArrays[j] = columns[keys[j]];
        }

        if (named) {
            for (let i = 0; i < height; i++) {
                const row: Record<string, any> = {};
                for (let j = 0; j < keysLen; j++) {
                    row[keys[j]] = colArrays[j][i];
                }
                yield row;
            }
        } else {
            for (let i = 0; i < height; i++) {
                const row = new Array(keysLen);
                for (let j = 0; j < keysLen; j++) {
                    row[j] = colArrays[j][i];
                }
                yield row;
            }
        }
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

        return DataFrame._createDirect<R>(newColumns, outSchema, outHeight);
    }

    limit(n: number, { offset = 0, from = "start" }: LimitOptions = {}): DataFrame<T> {
        const len = this._height;
        const safeN = clamp(Math.floor(n), { min: 0, max: len });
        const safeOffset = clamp(Math.floor(offset), { min: 0, max: len });

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

        return DataFrame._createDirect<T>(newColumns, this._schema, newHeight);
    }

    pivot<U extends RowRecord = any>(config: PivotOptions<T>): DataFrame<U> {
        if (this._height === 0) return DataFrame._createDirect<any>({}, {}, 0);

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

        return DataFrame._createDirect<U>(newColumns, outSchema, outHeight);
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

        return DataFrame._createDirect(newColumns, outSchema, this._height);
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

        return DataFrame._createDirect<T>(newColumns, this._schema, this._height);
    }

    get schema(): DataFrameSchema {
        return this._schema;
    }

    select<U extends RowRecord = any>(
        ...args: (string | IExpr | Record<string, any> | (string | IExpr | Record<string, any>)[])[]
    ): DataFrame<U> {
        const exprs = this._normalizeArgs(args);
        const allKeys = Object.keys(this._columns);
        const expandedExprs = resolveColumnSelectors(exprs, allKeys, undefined, this._schema, this._columns);

        const numExprs = expandedExprs.length;
        if (numExprs === 0) {
            return DataFrame._createDirect<U>({}, {}, this._height);
        }

        const newColumns: ColumnDict = {};
        const outSchema: DataFrameSchema = {};

        const evaluatedCols = new Array(numExprs);
        const targetKeys = new Array(numExprs);
        const selectedKeys = new Set<string>();
        let activeRowMap: Int32Array | null = null;

        for (let i = 0; i < numExprs; i++) {
            const expr = expandedExprs[i];
            const targetKey = expr.outputName || expr.colName || ALL_COLUMNS_MARKER;

            if (selectedKeys.has(targetKey)) {
                throw new DataFrameError(`Duplicate column selection: "${targetKey}" is selected multiple times.`);
            }
            selectedKeys.add(targetKey);

            const col = evaluateExpression(expr, this._columns, this._height);

            evaluatedCols[i] = col;
            targetKeys[i] = targetKey;

            const rowMap = col && (col as any).rowMap;
            if (rowMap) {
                if (activeRowMap) {
                    const len = rowMap.length;
                    if (len !== activeRowMap.length) {
                        throw new ShapeError(
                            `Mismatched explode heights: Column "${targetKey}" has length ${len}, but another exploded column has length ${activeRowMap.length}`
                        );
                    }
                    for (let j = 0; j < len; j++) {
                        if (rowMap[j] !== activeRowMap[j]) {
                            throw new ShapeError(
                                `Mismatched explode heights: Column "${targetKey}" has mismatched row lengths compared to another exploded column.`
                            );
                        }
                    }
                } else {
                    activeRowMap = rowMap;
                }
            }
        }

        let targetHeight = activeRowMap ? activeRowMap.length : this._height;

        let shouldCollapse = numExprs > 0;
        for (let i = 0; i < numExprs; i++) {
            const expr = expandedExprs[i];
            const isGlobalAgg = expr.aggFn != null && (expr.partitionBy == null || expr.partitionBy.length === 0);
            const isLit = !!expr.isLiteral;
            if (!isGlobalAgg && !isLit) {
                shouldCollapse = false;
                break;
            }
        }

        for (let i = 0; i < numExprs; i++) {
            const targetKey = targetKeys[i];
            let col = evaluatedCols[i];
            const colObj = col as any;
            const hasRowMap = colObj && colObj.rowMap;

            const len = isArrayOrTypedArray(col) ? col.length : 0;
            const expectedLen = (activeRowMap && !hasRowMap) ? this._height : targetHeight;
            if (len !== expectedLen) {
                throw new ShapeError(
                    `Column height mismatch: Column "${targetKey}" has length ${len}, but expected ${expectedLen}`
                );
            }

            if (activeRowMap && !hasRowMap) {
                const mapLen = activeRowMap.length;
                if (isTypedArray(col)) {
                    const newCol = new colObj.constructor(mapLen);
                    for (let j = 0; j < mapLen; j++) {
                        newCol[j] = colObj[activeRowMap[j]];
                    }
                    col = newCol;
                } else {
                    const newCol = new Array(mapLen);
                    for (let j = 0; j < mapLen; j++) {
                        newCol[j] = colObj[activeRowMap[j]];
                    }
                    col = newCol;
                }
            }

            evaluatedCols[i] = col;
        }

        if (shouldCollapse) {
            targetHeight = 1;
        }

        for (let i = 0; i < numExprs; i++) {
            const expr = expandedExprs[i];
            const targetKey = targetKeys[i];
            const col = evaluatedCols[i];
            const originalKey = expr.colName || targetKey;
            const isPureCol = expr instanceof ColumnExpr && expr.ops.length === 0 && !expr.isWindow && !expr.aggFn;
            const type = (isPureCol && this._schema[originalKey]) || inferColumnType(col);

            outSchema[targetKey] = type;
            newColumns[targetKey] = coerceColumn(col, type, targetHeight);
        }

        return DataFrame._createDirect<U>(newColumns, outSchema, targetHeight);
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

    sort(config?: SortOptions<T>): DataFrame<T> {
        if (!config || !config.by || this._height === 0) return this;

        const { by, descending = false, nullsLast = true, custom } = config;
        const sortKeys = toValidArray(by);

        for (let i = 0; i < sortKeys.length; i++) {
            const expr = ColumnExpr.toColExpr(sortKeys[i] as any);
            if (expr.colName) {
                assertColumnExists(expr.colName, this._columns, "Sort key");
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
            const values = ColumnExpr.toColExpr(keyOrExpr as any).evaluate(this._columns, this._height);

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

        return DataFrame._createDirect<T>(newColumns, this._schema, this._height);
    }

    tail(n: number = 10): DataFrame<T> {
        return this.limit(n, { offset: 0, from: 'end' })
    }

    to_dict(): DataFrameColumns<T> {
        return { ...this._columns };
    }

    to_dicts(): T[] {
        return columnsToRows(this._columns, this._height);
    }

    to_list<K extends keyof T>(nameOrExpr: K | IExpr): any[] {
        if (this._height === 0) return [];
        if (nameOrExpr == null) {
            return new Array(this._height).fill(null);
        }

        const expr = ColumnExpr.toColExpr(nameOrExpr as any);
        const colData = expr.evaluate(this._columns, this._height);
        return Array.isArray(colData) ? colData : Array.from(colData);
    }

    transpose({
        include_header: includeHeader = false,
        header_name: headerName = "column",
        column_names: colNamesOpt
    }: TransposeOptions = {}): DataFrame<any> {
        if (this._height === 0) {
            const cols: ColumnDict = {};
            const schema: DataFrameSchema = {};
            if (includeHeader) {
                cols[headerName] = coerceColumn([], DataTypeRegistry.Utf8, 0);
                schema[headerName] = DataTypeRegistry.Utf8;
            }
            return DataFrame._createDirect(cols, schema, 0);
        }

        let dataColumns = this.columns;

        if (typeof colNamesOpt === "string") {
            assertColumnExists(colNamesOpt, this._columns, "column_names");
            dataColumns = dataColumns.filter(c => c !== colNamesOpt);
        }

        let newColNames: string[] = [];
        if (typeof colNamesOpt === "string") {
            const keyCol = this._columns[colNamesOpt];
            newColNames = new Array(this._height);
            for (let i = 0; i < this._height; i++) {
                const val = keyCol[i];
                if (val == null) {
                    throw new DataFrameError(`Transpose column_names column "${colNamesOpt}" contains null/undefined at index ${i}`);
                }
                newColNames[i] = String(val);
            }
        } else if (colNamesOpt != null && typeof colNamesOpt !== "string" && Symbol.iterator in Object(colNamesOpt)) {
            const colNamesArr = Array.from(colNamesOpt as Iterable<any>);
            if (colNamesArr.length !== this._height) {
                throw new DataFrameError(`column_names length (${colNamesArr.length}) must match the height of the DataFrame (${this._height})`);
            }
            newColNames = new Array(this._height);
            for (let i = 0; i < this._height; i++) {
                newColNames[i] = String(colNamesArr[i]);
            }
        } else {
            newColNames = new Array(this._height);
            for (let i = 0; i < this._height; i++) {
                newColNames[i] = `column_${i}`;
            }
        }

        const uniqueNames = new Set<string>();
        if (includeHeader) {
            uniqueNames.add(headerName);
        }
        for (let i = 0; i < newColNames.length; i++) {
            const name = newColNames[i];
            if (uniqueNames.has(name)) {
                throw new DataFrameError(`Duplicate column name in transposed DataFrame: "${name}"`);
            }
            uniqueNames.add(name);
        }

        const numDataCols = dataColumns.length;
        const newCols: ColumnDict = {};
        const newSchema: DataFrameSchema = {};

        if (includeHeader) {
            newCols[headerName] = coerceColumn(dataColumns, DataTypeRegistry.Utf8, numDataCols);
            newSchema[headerName] = DataTypeRegistry.Utf8;
        }

        for (let i = 0; i < this._height; i++) {
            const colName = newColNames[i];
            const rawVals = new Array(numDataCols);
            for (let j = 0; j < numDataCols; j++) {
                rawVals[j] = this._columns[dataColumns[j]][i];
            }
            const type = inferColumnType(rawVals);
            newCols[colName] = coerceColumn(rawVals, type, numDataCols);
            newSchema[colName] = type;
        }

        return DataFrame._createDirect(newCols, newSchema, numDataCols);
    }

    unique<K extends keyof T>(columns?: K | K[]): DataFrame<T> {
        if (this._height === 0) return DataFrame._createDirect<T>({}, this._schema, 0);

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

        return DataFrame._createDirect<T>(newColumns, this._schema, newHeight);
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

        return DataFrame._createDirect<U>(newColumns as any, outSchema, newHeight);
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
            } else if (ColumnExpr.isColExpr(arg)) {
                exprs.push(arg);
            } else if (isObj(arg)) {
                const keys = Object.keys(arg);
                const numKeys = keys.length;
                for (let i = 0; i < numKeys; i++) {
                    const key = keys[i];
                    const val = arg[key];
                    if (ColumnExpr.isColExpr(val)) {
                        exprs.push(val.alias(key));
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
        if (args.length === 0) return this;

        const exprs = this._normalizeArgs(args);
        const allKeys = Object.keys(this._columns);
        const expandedExprs = resolveColumnSelectors(exprs, allKeys, undefined, this._schema, this._columns);
        const numEntries = expandedExprs.length;
        if (numEntries === 0) return this;

        const overrides = new Map<string, IExpr>();
        for (let j = 0; j < numEntries; j++) {
            const expr = expandedExprs[j];
            const name = expr.outputName || expr.colName || ALL_COLUMNS_MARKER;
            overrides.set(name, expr);
        }

        const selectList: IExpr[] = [];
        const numKeys = allKeys.length;
        for (let i = 0; i < numKeys; i++) {
            const key = allKeys[i];
            selectList.push(overrides.get(key) || new ColumnExpr(key));
            overrides.delete(key);
        }

        for (const expr of overrides.values()) {
            selectList.push(expr);
        }

        return this.select(...selectList);
    }

    with_row_index(name: string = "index", offset: number = 0): DataFrame<any> {
        const expr = seq_range(offset, {
            mode: "independent",
            dtype: DataTypeRegistry.UInt32,
            step: 1
        });

        const df = this.insert_column(0, name, expr);
        df._schema[name] = DataTypeRegistry.UInt32;
        return df;
    }

    write_json(
        file?: string | { write: (str: string) => void },
        { format = "json", replacerOptions }: WriteJSONOptions = {}
    ): string {
        if (format !== "json" && format !== "ndjson") {
            throw new TypeError(`Unsupported JSON format: "${format}". Expected "json" or "ndjson".`);
        }

        const safeReplacer = replacerOptions?.replacer === null
            ? undefined
            : createSafeJsonReplacer(replacerOptions);

        let jsonStr: string;
        if (format === "ndjson") {
            const dicts = this.to_dicts();
            const len = dicts.length;
            const lines = new Array(len);
            for (let i = 0; i < len; i++) {
                lines[i] = JSON.stringify(dicts[i], safeReplacer as any);
            }
            jsonStr = lines.join(NEWLINE);
        } else {
            jsonStr = JSON.stringify(this.to_dicts(), safeReplacer as any);
        }

        writeStringToFileOrStream(file, jsonStr);
        return jsonStr;
    }

    write_csv(
        file?: string | { write: (str: string) => void },
        options: WriteCSVOptions = {}
    ): string {
        if (file) {
            if (typeof file === "string") {
                if (typeof require !== "function") {
                    throw new Error("File writing is not supported in this environment (missing require('fs')).");
                }
                const fs = require("fs");
                const fd = fs.openSync(file, "w");
                try {
                    stringifyCSV(this._columns, this._height, {
                        ...options,
                        onRow: (str) => {
                            fs.writeSync(fd, str, null, "utf8");
                        }
                    });
                } finally {
                    fs.closeSync(fd);
                }
            } else if (typeof file === "object" && typeof (file as any).write === "function") {
                stringifyCSV(this._columns, this._height, {
                    ...options,
                    onRow: (str) => {
                        (file as any).write(str);
                    }
                });
            } else {
                throw new TypeError("Invalid file argument. Expected a file path string or a writable stream/object with a write method.");
            }
            return "";
        }

        return stringifyCSV(this._columns, this._height, options);
    }
}
