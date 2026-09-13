import { ColumnExpr, resolveColumnSelectors, ALL_COLUMNS_MARKER, seqRange, all, exclude, evaluateExpression, resolveExprOutputType, isColExpr, toColExpr } from "../columnExpressions"
import { GroupedData } from "./grouped"
import { NEWLINE, MS_PER_DAY, DAY_OF_WEEK_MAP } from "../constants"
import { createSafeJsonReplacer } from "../utils/json"
import type { IExpr, ColumnData, ColumnDict, DataFrameColumns, ConcatOptions, ConcatItem, RowRecord, DataFrameSchema, RegisteredDataType, ExplodeOptions, IntoExpr, FillNullOptions, SortArrayOptions, CastOptions } from "../types"
import type { EqualsOptions, LimitOptions, SortOptions, PivotOptions, JoinOptions, JoinMaintainOrder, JoinAsofOptions, JoinWhereOptions, GroupByDynamicOptions, UnpivotOptions, TransposeOptions, UnstackOptions, WriteJSONOptions, WriteCSVOptions } from "./types"
import { DataTypeRegistry, DataType } from "../datatypes"
import { isArrayOrTypedArray, toValidArray, toArrayOfType, isObj, isArrayOfType, isRegExp, clamp, stringifyCSV, compareScalarValues, filterByMask, toDuration, toValidDate, toValidNumber, isValidNumber, binarySearch, addCalendarDuration, parseDurationInterval, createUTCDate } from "../utils"
import { assertColumnExists, assertHeight, DataFrameError, ShapeError, ColumnNotFoundError, InvalidArgumentError, IOStreamError } from "../exceptions"
import { concat } from "../functions/concat"
import {
    rowsToColumns,
    columnsToRows,
    getRowFromColumns,
    inferColumnType,
    gatherColumnsByIndices,
    gatherColumnByIndices,
    computeRowHash,
    buildGroupMap,
    coerceColumn,
    alignKeyIndices,
    alignAsofIndices,
    alignWhereIndices,
    materializeJoinedDataFrame,
    writeStringToFileOrStream
} from "./utils"

/**
 * Two-dimensional columnar tabular data structure supporting expression execution and reshaping.
 */
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

    /**
     * Initializes a new DataFrame from row objects or a column dictionary.
     * @param data Array of row objects or column data dictionary.
     * @param schema Optional explicit DataFrame schema mapping.
     * @param height Optional explicit height (row count).
     * @namespace df
     * @category DataFrame
     * @syntax df.{symbol}(...)
     * @example
     * >>> const df = $df.data([{ a: 1, b: "x" }, { a: 2, b: "y" }])
     * >>> df
     * shape: (2, 2)
     * ┌─────┬─────┐
     * │ a   │ b   │
     * ├─────┼─────┤
     * │ 1   │ x   │
     * │ 2   │ y   │
     * └─────┴─────┘
     */
    constructor(data: T[] | ColumnDict, schema?: DataFrameSchema, height?: number) {
        if (Array.isArray(data)) {
            const { columns, height: h } = rowsToColumns(data);
            this._columns = columns as DataFrameColumns<T>;
            this._height = h;
        } else if (isObj(data)) {
            this._columns = data as DataFrameColumns<T>;
            this._height = assertHeight(data, height);
        } else {
            this._columns = {} as DataFrameColumns<T>;
            this._height = 0;
        }

        schema ? this._applySchema(schema) : (this._height > 0 || Object.keys(this._columns).length > 0 ? this._inferSchema() : (this._schema = {}));
    }

    private _applySchema(schema: DataFrameSchema) {
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

    private _inferSchema() {
        const schema: DataFrameSchema = {};
        const keys = Object.keys(this._columns);
        const numKeys = keys.length;
        for (let i = 0; i < numKeys; i++) {
            const key = keys[i];
            schema[key] = inferColumnType(this._columns[key]);
        }
        this._applySchema(schema);
    }

    private _normalizeArgs(args: any[]): IExpr[] {
        const flatArgs = args.flat(Infinity);
        const exprs: IExpr[] = [];
        const len = flatArgs.length;
        for (let i = 0; i < len; i++) {
            const arg = flatArgs[i];
            if (typeof arg === "string") {
                exprs.push(new ColumnExpr(arg));
            } else if (isColExpr(arg)) {
                exprs.push(arg);
            } else if (arg instanceof DataType || typeof arg === "function" || isRegExp(arg)) {
                exprs.push(new ColumnExpr(arg));
            } else if (isObj(arg)) {
                const keys = Object.keys(arg);
                const numKeys = keys.length;
                for (let j = 0; j < numKeys; j++) {
                    const key = keys[j];
                    const val = (arg as Record<string, any>)[key];
                    if (isColExpr(val)) {
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

    private _resolveTargetColumns(
        columns: IntoExpr | IntoExpr[],
        contextName: string = "Target column"
    ): string[] {
        const rawArgs = Array.isArray(columns) ? columns : [columns];
        const exprArgs = this._normalizeArgs(rawArgs);
        const expandedExprs = resolveColumnSelectors(
            exprArgs,
            Object.keys(this._columns),
            undefined,
            this._schema,
            this._columns
        );

        const targetCols: string[] = [];
        const seen = new Set<string>();
        const len = expandedExprs.length;
        for (let i = 0; i < len; i++) {
            const expr = expandedExprs[i];
            const colName = expr._outputName || expr._colName;
            if (!colName || colName === ALL_COLUMNS_MARKER) {
                throw new DataFrameError(`Expression passed to ${contextName} must have a column name.`);
            }
            if (!seen.has(colName)) {
                assertColumnExists(colName, this._columns, contextName);
                seen.add(colName);
                targetCols.push(colName);
            }
        }
        return targetCols;
    }

    /**
     * Casts columns in the DataFrame to the specified data type(s).
     *
     * @param {RegisteredDataType | Record<string, RegisteredDataType>} dtypes Target data type for all columns, or mapping of column names to target data types.
     * @param {CastOptions} [options] Casting options (e.g. strict).
     * @returns {DataFrame}
     *
     * @example
     * <!-- doc:base_2x2 -->
     * >>> df.cast($df.Float64)
     * >>> df.cast({ a: $df.Float64, b: $df.Utf8 })
     * >>> df.cast({ num_str: $df.Int64 }, { strict: false })
     */
    cast(
        dtypes: RegisteredDataType | Record<string, RegisteredDataType>,
        options: CastOptions = {}
    ): DataFrame<any> {
        if (this._height === 0) return this;
        if (dtypes instanceof DataType) {
            return this.withColumns(all().cast(dtypes, options));
        }

        if (isObj(dtypes)) {
            const keys = Object.keys(dtypes);
            const numKeys = keys.length;
            const exprs: IExpr[] = new Array(numKeys);
            for (let i = 0; i < numKeys; i++) {
                const k = keys[i];
                exprs[i] = new ColumnExpr(k).cast(dtypes[k], options);
            }
            return this.withColumns(...exprs);
        }

        throw new InvalidArgumentError("Invalid cast target");
    }

    /**
     * Creates a deep copy of the current DataFrame instance, duplicating all underlying column data arrays and schema metadata.
     * Modifying columns or values in the cloned DataFrame will not mutate the original.
     * @returns {DataFrame<T>}
     * @example
     * <!-- doc:base_2x2 -->
     * >>> const cloned = df.clone()
     * >>> cloned
     * shape: (2, 2)
     * ┌───┬───┐
     * │ a │ b │
     * ├───┼───┤
     * │ 1 │ x │
     * │ 2 │ y │
     * └───┴───┘
     */
    clone(): DataFrame<T> {
        return this.select<T>(all());
    }

    /**
     * Gets array of column names in the DataFrame.
     * @returns Array of column name strings.
     * @example
     * <!-- doc:base_2x2 -->
     * >>> df.columns
     * ["a", "b"]
     */
    get columns(): string[] {
        return Object.keys(this._columns);
    }

    /**
     * Concatenates items vertically, horizontally, or diagonally.
     * 
     * @param {ConcatItem | ConcatItem[]} items Single DataFrame or array of DataFrames/rows to concatenate.
     * @param {ConcatOptions} [options] Configuration options for concatenation layout and strictness.
     * @param {ConcatHow} [options.how] Layout strategy: `"vertical"` (default, appends rows top-to-bottom), `"horizontal"` (joins unique columns side-by-side), or `"diagonal"` (concatenates mismatched columns with null padding).
     * @param {boolean} [options.horizontal.strict] When `true` (default), throws an error if row counts mismatch in horizontal concatenation. Set `false` to pad shorter DataFrames with `null`.
     * @returns {DataFrame}
     * 
     * @example
     * // 1. Vertical Concatenation (default):
     * <!-- doc:base_concat_pair -->
     * >>> df1.concat(df2, { how: "vertical" })
     * shape: (4, 1)
     * ┌──────┐
     * │ a    │
     * ├──────┤
     * │ 1    │
     * │ 2    │
     * │ null │
     * │ null │
     * └──────┘
     * 
     * @example
     * // 2. Horizontal Concatenation:
     * <!-- doc:base_concat_pair -->
     * >>> df1.concat(df2, { how: "horizontal" })
     * shape: (2, 2)
     * ┌───┬────┐
     * │ a │ b  │
     * ├───┼────┤
     * │ 1 │ 10 │
     * │ 2 │ 20 │
     * └───┴────┘
     * 
     * @example
     * // 3. Diagonal Concatenation (mismatched columns):
     * <!-- doc:base_concat_pair -->
     * >>> df1.concat(df2, { how: "diagonal" })
     * shape: (4, 2)
     * ┌──────┬──────┐
     * │ a    │ b    │
     * ├──────┼──────┤
     * │ 1    │ null │
     * │ 2    │ null │
     * │ null │ 10   │
     * │ null │ 20   │
     * └──────┴──────┘
     */
    concat<U extends RowRecord = any>(
        items: ConcatItem | ConcatItem[],
        options: ConcatOptions = {}
    ): DataFrame<U> {
        const arrayItems = isArrayOfType(items, DataFrame, { mode: "every", allowEmpty: false })
            ? (items as DataFrame[])
            : [items];
        return concat([this, ...arrayItems], options);
    }

    /**
     * Drops specified columns from the DataFrame.
     * @param {(K | K[])[]} args Column names or arrays of column names to remove.
     * @returns {DataFrame}
     * @example
     * <!-- doc:base_2x2 -->
     * >>> df.drop("b")
     * shape: (2, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 1 │
     * │ 2 │
     * └───┘
     */
    drop<K extends keyof T>(...args: (K | K[])[]): DataFrame<Omit<T, K>> {
        return this.select<Omit<T, K>>(exclude(args.flat() as any));
    }

    /**
     * Drops rows with null or undefined values.
     * @param {string | string[]} [subset] Column name or array of column names to check for nulls.
     * @returns {DataFrame}
     * @example
     * <!-- doc:base_nulls_3x2 -->
     * >>> df.dropNulls()
     * shape: (2, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 1 │
     * │ 3 │
     * └───┘
     */
    dropNulls(subset?: string | string[]): DataFrame<T> {
        return this.filter(subset ? new ColumnExpr(subset).isNotNull() : all().isNotNull());
    }

    /**
     * Gets array of registered column DataTypes matching current schema order.
     * @returns Array of RegisteredDataType definitions.
     * @example
     * <!-- doc:base_2x2 -->
     * >>> df.dtypes
     * [Float64, Utf8]
     */
    get dtypes(): RegisteredDataType[] {
        const keys = Object.keys(this._columns);
        const len = keys.length;
        const result = new Array(len);
        for (let i = 0; i < len; i++) {
            result[i] = this._schema[keys[i]];
        }
        return result;
    }

    /**
     * Compares this DataFrame with another for equality.
     * Checks shape, column names, column order, schemas, and row values.
     * @param {DataFrame} other The other DataFrame to compare with.
     * @param {EqualsOptions} [options] Comparison configuration options.
     * @param {boolean} [options.nullsEqual] Whether nulls / NaNs compare as equal. Default: `true`.
     * @returns {boolean} `true` if both DataFrames are equal, `false` otherwise.
     * @example
     * <!-- doc:base_2x2 -->
     * >>> const df2 = df.clone()
     * >>> df.equals(df2)
     * true
     */
    equals<U extends RowRecord = any>(other: DataFrame<U>, { nullsEqual = true }: EqualsOptions = {}): boolean {
        if ((this as unknown) === other) return true;
        if (!(other instanceof DataFrame)) return false;

        if (this._height !== other._height) return false;

        const thisCols = this._columns;
        const otherCols = other._columns;
        const keys = Object.keys(thisCols);
        const otherKeys = Object.keys(otherCols);
        const numCols = keys.length;
        if (numCols !== otherKeys.length) return false;

        const thisSchema = this._schema;
        const otherSchema = other._schema;
        const h = this._height;

        for (let i = 0; i < numCols; i++) {
            const k = keys[i];
            if (k !== otherKeys[i]) return false;

            const typeA = thisSchema[k];
            const typeB = otherSchema[k];
            if (typeA && typeB && !typeA.equals(typeB)) return false;

            const colA = thisCols[k];
            const colB = otherCols[k];
            for (let r = 0; r < h; r++) {
                const valA = colA[r];
                const valB = colB[r];

                if (!nullsEqual && (valA == null || Number.isNaN(valA))) {
                    return false;
                }

                if (!Object.is(valA, valB)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Explodes an array column into multiple rows, replicating non-target row attributes.
     * @param {IntoExpr | IntoExpr[]} columns Target column expression or array column name to explode.
     * @param {ExplodeOptions} [options] Configuration options for empty array and null handling.
     * @param {boolean} [options.emptyAsNull] When `true`, converts empty arrays to `null` rows.
     * @param {boolean} [options.keepNulls] When `true`, retains `null` array values during explosion.
     * @returns {DataFrame}
     * @example
     * <!-- doc:base_array_nested_2rows -->
     * >>> df.explode("values")
     * shape: (2, 2)
     * ┌───────┬────────┐
     * │ group │ values │
     * ├───────┼────────┤
     * │ A     │ 1      │
     * │ A     │ 2      │
     * └───────┴────────┘
     */
    explode(
        columns: IntoExpr | IntoExpr[],
        options?: ExplodeOptions
    ): DataFrame<any> {
        const targetCols = this._resolveTargetColumns(columns, "Explode column");
        const colsToExplode = new Set<string>(targetCols);
        const keys = Object.keys(this._columns);
        const selectList: IExpr[] = [];
        const numKeys = keys.length;
        for (let i = 0; i < numKeys; i++) {
            const key = keys[i];
            selectList.push(
                colsToExplode.has(key)
                    ? new ColumnExpr(key).arr.explode(options)
                    : new ColumnExpr(key)
            );
        }

        return this.select(...selectList);
    }

    /**
     * Fills null values across columns using scalar values or statistical strategies.
     * @param {FillNullOptions} [options] Configuration options for null replacement.
     * @param {any} [options.value] Scalar replacement value or dict mapping column names to values.
     * @param {FillNullStrategy} [options.strategy] Statistical filling strategy (`"zero"`, `"mean"`, `"min"`, `"max"`, `"forward"`, `"backward"`).
     * @param {number} [options.limit] Maximum consecutive nulls to fill when using propagation strategies.
     * @returns {DataFrame}
     * @example
     * <!-- doc:base_nulls_3x2 -->
     * >>> df.fillNull({ value: 0 })
     * shape: (3, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 1 │
     * │ 0 │
     * │ 3 │
     * └───┘
     */
    fillNull(options: FillNullOptions = {}): DataFrame<T> {
        if (this._height === 0) return this;
        return this.withColumns(all().fillNull(options));
    }

    /**
     * Filters rows matching boolean column expressions or predicate callbacks.
     * @param {(IExpr | ((row: T) => any))[]} exprs Expressions or predicate functions evaluated per row.
     * @returns {DataFrame}
     * @example
     * <!-- doc:base_numbers_3x2 -->
     * >>> df.filter($df.col("a").gt(1))
     * shape: (2, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 2 │
     * │ 3 │
     * └───┘
     */
    filter(...exprs: (IExpr | ((row: T) => any))[]): DataFrame<T> {
        const height = this._height;
        if (height === 0) return this;

        const keys = Object.keys(this._columns);
        const exprSelectors: IExpr[] = [];
        const funcPredicates: ((row: T) => any)[] = [];

        for (let i = 0; i < exprs.length; i++) {
            const expr = exprs[i];
            if (typeof expr === "function") funcPredicates.push(expr);
            else exprSelectors.push(expr);
        }

        const expandedExprs = resolveColumnSelectors(exprSelectors, keys, undefined, this._schema, this._columns);
        const numExprs = expandedExprs.length;
        const numFuncs = funcPredicates.length;

        const evaluatedExprs: ColumnData[] = new Array(numExprs);
        for (let i = 0; i < numExprs; i++) {
            evaluatedExprs[i] = expandedExprs[i].evaluate(this._columns, height);
        }

        let currentIndex = 0;
        let rowObj: T | null = null;
        if (numFuncs > 0) {
            const columns = this._columns;
            rowObj = {} as unknown as T;
            for (let k = 0; k < keys.length; k++) {
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

        const mask = new Array<boolean>(height);
        let matchCount = 0;
        rowLoop: for (let i = 0; i < height; i++) {
            for (let j = 0; j < numExprs; j++) {
                if (!evaluatedExprs[j][i]) {
                    mask[i] = false;
                    continue rowLoop;
                }
            }
            if (rowObj) {
                currentIndex = i;
                for (let j = 0; j < numFuncs; j++) {
                    if (!funcPredicates[j](rowObj)) {
                        mask[i] = false;
                        continue rowLoop;
                    }
                }
            }
            mask[i] = true;
            matchCount++;
        }

        const newColumns = {} as DataFrameColumns<T>;
        for (let k = 0; k < keys.length; k++) {
            const key = keys[k];
            (newColumns as any)[key] = filterByMask(this._columns[key], mask);
        }
        return DataFrame._createDirect<T>(newColumns, this._schema, matchCount);
    }

    /**
     * Groups rows by key columns to prepare for aggregations.
     * @param {K | K[]} keys Column name or array of key column names.
     * @returns {GroupedData}
     * @example
     * <!-- doc:base_grouped_3x2 -->
     * >>> df.groupBy("group").agg($df.col("val").sum().alias("sum"))
     * shape: (2, 2)
     * ┌─────┬─────┐
     * │ cat │ sum │
     * ├─────┼─────┤
     * │ A   │ 30  │
     * │ B   │ 30  │
     * └─────┴─────┘
     */
    groupBy<K extends keyof T>(keys: K | K[]): GroupedData<T, K> {
        const keysArr = toValidArray(keys);
        const keysStr = toArrayOfType<string>(keys, "string");

        for (let j = 0; j < keysStr.length; j++) {
            assertColumnExists(keysStr[j], this._columns, "Grouping key");
        }

        const groups = buildGroupMap(this._columns, keysStr, this._height);
        const allKeys = Object.keys(this._columns) as (keyof T)[];
        return new GroupedData(groups, keysArr, allKeys, this._columns, this._height, this._schema);
    }

    /**
     * Groups dynamically based on a time or integer index column over sliding / stepping windows.
     *
     * @param indexColumn The time/integer column or column expression to group on.
     * @param options Dynamic grouping configuration options (`every`, `period`, `offset`, `truncate`, `includeBoundaries`, `closed`, `label`, `by`, `startBy`, `checkSorted`).
     * @returns GroupedData
     * @example
     * <!-- doc:base_dataframe_dynamic -->
     * >>> df.groupByDynamic("time", { every: "1d", period: "1d" }).agg($df.col("val").sum().alias("daily_sum"))
     * shape: (2, 2)
     * ┌──────────────────────────┬───────────┐
     * │ time                     │ daily_sum │
     * ├──────────────────────────┼───────────┤
     * │ 2024-01-01T00:00:00.000Z │ 30        │
     * │ 2024-01-02T00:00:00.000Z │ 30        │
     * └──────────────────────────┴───────────┘
     */
    groupByDynamic<K extends keyof T & string>(
        indexColumn: K | IntoExpr,
        options: GroupByDynamicOptions<T>
    ): GroupedData<T, K> {
        if (!options || options.every == null) throw new InvalidArgumentError('groupByDynamic requires "every" option');

        const {
            every: rawEvery,
            period: rawPeriod,
            offset: rawOffset = 0,
            truncate = true,
            closed = "left",
            label = "left",
            startBy = "window",
            includeBoundaries = false,
            checkSorted = true,
            by,
            groupBy
        } = options;

        const indexColName = typeof indexColumn === "string"
            ? indexColumn
            : isColExpr(indexColumn)
                ? (indexColumn as any)._colName ?? String(indexColumn)
                : String(indexColumn);
        assertColumnExists(indexColName, this._columns, "Index column");

        if (closed !== "left" && closed !== "right" && closed !== "both" && closed !== "none") {
            throw new InvalidArgumentError(`Invalid "closed" option: "${closed}"`);
        }
        if (label !== "left" && label !== "right" && label !== "datapoint") {
            throw new InvalidArgumentError(`Invalid "label" option: "${label}"`);
        }

        const startByNorm = typeof startBy === "string" ? startBy.toLowerCase() : "";
        const isDayOfWeek = startByNorm in DAY_OF_WEEK_MAP;
        if (startByNorm !== "window" && startByNorm !== "datapoint" && !isDayOfWeek) {
            throw new InvalidArgumentError(`Invalid "startBy" option: "${startBy}"`);
        }

        const offset = toDuration(rawOffset, { fallback: 0 });
        if (!isValidNumber(offset)) throw new InvalidArgumentError(`Invalid "offset" option: ${rawOffset}`);

        const isLowerClosed = closed === "left" || closed === "both";
        const isUpperClosed = closed === "right" || closed === "both";
        const startSide = isLowerClosed ? "left" : "right";
        const endSide = isUpperClosed ? "right" : "left";

        const LOWER_BOUNDARY_COL = "_lower_boundary";
        const UPPER_BOUNDARY_COL = "_upper_boundary";

        const everyInterval = typeof rawEvery === "string" ? parseDurationInterval(rawEvery) : null;
        const periodInterval = typeof rawPeriod === "string" ? parseDurationInterval(rawPeriod) : null;

        const secondaryBy = groupBy ?? by;
        const rawByKeys = secondaryBy ? toArrayOfType<string>(toValidArray(secondaryBy), "string") : [];
        const byKeys = Array.from(new Set(rawByKeys));
        for (let j = 0; j < byKeys.length; j++) {
            if (byKeys[j] === indexColName) throw new InvalidArgumentError(`Cannot group by index column "${indexColName}" in secondary grouping keys`);
            assertColumnExists(byKeys[j], this._columns, "Secondary grouping key");
        }

        const height = this._height;
        const indexCol = this._columns[indexColName];
        const numVals = new Float64Array(height);
        let isDateType = this._schema[indexColName]?.name === "Datetime";

        for (let i = 0; i < height; i++) {
            const val = indexCol[i];
            const num = toValidNumber(val);
            const d = num === null ? toValidDate(val) : null;
            if (d) isDateType = true;
            numVals[i] = num ?? d?.getTime() ?? NaN;
        }

        const isCalendarDynamic = isDateType && Boolean(everyInterval?.months || periodInterval?.months);
        let every = 0;
        let period = 0;
        if (!isCalendarDynamic) {
            every = toDuration(rawEvery);
            period = toDuration(rawPeriod, { fallback: every });
            if (!isValidNumber(every) || every <= Number.EPSILON) throw new InvalidArgumentError(`"every" must be positive, got ${rawEvery}`);
            if (!isValidNumber(period) || period <= Number.EPSILON) throw new InvalidArgumentError(`"period" must be positive, got ${rawPeriod}`);
        }

        const partitions = byKeys.length > 0 && height > 0
            ? buildGroupMap(this._columns, byKeys, height)
            : new Map([["", Array.from({ length: height }, (_, i) => i)]]);

        const outKeys = [
            ...byKeys,
            indexColName,
            ...(includeBoundaries ? [LOWER_BOUNDARY_COL, UPPER_BOUNDARY_COL] : [])
        ];
        const dynGroups = new Map<string, number[]>();
        const synCols: Record<string, any[]> = {};
        for (let i = 0; i < outKeys.length; i++) synCols[outKeys[i]] = [];

        const effPeriodInterval = periodInterval ?? everyInterval;
        let groupCounter = 0;
        for (const rawIndices of partitions.values()) {
            const indices: number[] = [];
            let lastVal = -Infinity;
            let needsSort = false;
            for (let i = 0; i < rawIndices.length; i++) {
                const rIdx = rawIndices[i];
                const val = numVals[rIdx];
                if (!isValidNumber(val)) continue;
                if (val < lastVal && checkSorted) {
                    throw new DataFrameError(`Index column "${indexColName}" is not sorted in ascending order`);
                }
                if (val < lastVal) needsSort = true;
                indices.push(rIdx);
                lastVal = val;
            }

            const idxCount = indices.length;
            if (idxCount === 0) continue;
            if (needsSort) indices.sort((a, b) => numVals[a] - numVals[b]);

            const minVal = numVals[indices[0]];
            const maxVal = numVals[indices[idxCount - 1]];

            let w0Date: Date | null = null;
            let w0 = 0;

            if (isCalendarDynamic) {
                const minDate = new Date(minVal);
                const month = everyInterval!.months % 12 === 0 ? 0 : minDate.getUTCMonth();
                w0Date = startByNorm === "datapoint" ? minDate : createUTCDate(minDate.getUTCFullYear(), month, 1);
            } else {
                let wAnchor: number;
                if (startByNorm === "datapoint") {
                    wAnchor = minVal + offset;
                } else if (isDayOfWeek && isDateType) {
                    const daysBack = (new Date(minVal).getUTCDay() - DAY_OF_WEEK_MAP[startByNorm] + 7) % 7;
                    wAnchor = Math.floor(minVal / MS_PER_DAY) * MS_PER_DAY - daysBack * MS_PER_DAY + offset;
                } else {
                    wAnchor = Math.floor((minVal - offset) / every) * every + offset;
                }
                w0 = !isLowerClosed && minVal - wAnchor <= 1e-9 ? wAnchor - every : wAnchor;
            }

            let step = 0;
            while (true) {
                const wStart = isCalendarDynamic
                    ? addCalendarDuration(w0Date!, everyInterval!, step).getTime()
                    : w0 + step * every;

                if (isLowerClosed ? wStart > maxVal : wStart >= maxVal) break;

                const wEnd = isCalendarDynamic
                    ? addCalendarDuration(new Date(wStart), effPeriodInterval!).getTime()
                    : wStart + period;

                step++;

                const startPos = binarySearch(indices, wStart, { side: startSide, getValue: (_, rIdx) => numVals[rIdx] });
                const endPos = binarySearch(indices, wEnd, { side: endSide, getValue: (_, rIdx) => numVals[rIdx] });

                if (startPos >= endPos) {
                    const nextVal = !isCalendarDynamic && startPos < idxCount ? numVals[indices[startPos]] : NaN;
                    const canSkip = isValidNumber(nextVal) && nextVal >= wEnd;
                    const target = isUpperClosed ? nextVal - period : nextVal - period + 1e-9;
                    if (canSkip) step = Math.max(step, Math.floor((target - w0) / every));
                    continue;
                }

                const matchingIndices = indices.slice(startPos, endPos);
                const firstIdx = matchingIndices[0];
                const s = isDateType ? new Date(wStart) : wStart;
                const e = isDateType ? new Date(wEnd) : wEnd;

                synCols[indexColName].push(!truncate || label === "datapoint" ? indexCol[firstIdx] : label === "right" ? e : s);
                if (includeBoundaries) {
                    synCols[LOWER_BOUNDARY_COL].push(s);
                    synCols[UPPER_BOUNDARY_COL].push(e);
                }
                for (let j = 0; j < byKeys.length; j++) {
                    synCols[byKeys[j]].push(this._columns[byKeys[j]][firstIdx]);
                }
                dynGroups.set(`__dyn_${groupCounter++}__`, matchingIndices);
            }
        }

        const bType = includeBoundaries ? (this._schema[indexColName] || (isDateType ? DataTypeRegistry.Datetime : DataTypeRegistry.Float64)) : null;
        const outSchema: DataFrameSchema = bType ? { ...this._schema, [LOWER_BOUNDARY_COL]: bType, [UPPER_BOUNDARY_COL]: bType } : this._schema;

        return new GroupedData(
            dynGroups,
            outKeys as any,
            Object.keys(this._columns) as (keyof T)[],
            this._columns,
            this._height,
            outSchema,
            synCols
        );
    }


    /**
     * Returns the first N rows as a new DataFrame.
     * @param n Number of leading rows to slice (default 10).
     * @returns DataFrame
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.head(2)
     * shape: (2, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 1 │
     * │ 2 │
     * └───┘
     */
    head(n: number = 10): DataFrame<T> {
        return this.limit(n, { offset: 0, from: "start" })
    }

    /**
     * Gets height (total row count) of the DataFrame.
     * @returns Number of rows.
     * @example
     * <!-- doc:base_2x2 -->
     * >>> df.height
     * 3
     */
    get height(): number {
        return this._height;
    }

    /**
     * Inserts a new column at a specific ordinal index position.
     * @param {number} index Target column index position.
     * @param {string} name Name of the inserted column.
     * @param {IntoExpr} expr Value expression or column definition.
     * @returns {DataFrame}
     * @example
     * <!-- doc:base_2x2 -->
     * >>> df.insertColumn(1, "c", [10, 20])
     * shape: (2, 3)
     * ┌───┬────┬───┐
     * │ a │ c  │ b │
     * ├───┼────┼───┤
     * │ 1 │ 10 │ x │
     * │ 2 │ 20 │ y │
     * └───┴────┴───┘
     */
    insertColumn(index: number, name: string, expr: IntoExpr): DataFrame<any> {
        const colExpr = (toColExpr(expr, ColumnExpr) as ColumnExpr<any>).alias(name);
        const keys = Object.keys(this._columns);
        const keysLen = keys.length;

        const selectList: any[] = [];
        for (let i = 0; i < keysLen; i++) {
            const k = keys[i];
            if (k !== name) {
                selectList.push(k);
            }
        }

        const targetIndex = clamp(index, { min: 0, max: selectList.length });
        selectList.splice(targetIndex, 0, colExpr);

        return this.select<any>(...selectList);
    }

    /**
     * Retrieves a single scalar cell value by row and column position or name.
     * @param {number} [row] Row index position.
     * @param {number | string} [column] Column index or column name string.
     * @returns {any} Cell scalar value.
     * @throws {DataFrameError} If shape is not (1, 1) when called without arguments.
     * @throws {ShapeError} If row or column index is out of bounds.
     * @example
     * <!-- doc:base_2x2 -->
     * >>> df.item(0, "val")
     * 42
     */
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

        const colKey = typeof column === "number" ? keys[column] : column;
        if (colKey === undefined || this._columns[colKey] === undefined) {
            if (typeof column === "number") {
                throw new ShapeError(`Column index ${column} is out of bounds for DataFrame width ${width}.`);
            }
            throw new ColumnNotFoundError(column);
        }

        return this._columns[colKey][row];
    }

    /**
     * Yields a generator iterating over raw column arrays.
     * @returns Generator of ColumnData arrays.
     * @example
     * <!-- doc:base_2x2 -->
     * >>> Array.from(df.iterColumns())
     * [ Float64Array([1, 2]), ["x", "y"] ]
     */
    *iterColumns(): Generator<ColumnData> {
        const cols = Object.values(this._columns);
        const colsLen = cols.length;
        for (let j = 0; j < colsLen; j++) {
            yield cols[j];
        }
    }

    /**
     * Yields a generator iterating over rows as tuples or named objects.
     * @param [config] Iteration format configuration.
     * @param [config.named] When `true`, yields row objects with column keys (`{ col: val }`). When `false` (default), yields positional arrays (`[val1, val2]`).
     * @returns Generator of rows.
     * @example
     * <!-- doc:base_2x2 -->
     * >>> Array.from(df.iterRows({ named: true }))
     * [ { a: 1, b: "x" }, { a: 2, b: "y" } ]
     */
    *iterRows({ named = false }: { named?: boolean } = {}): Generator<any[] | Record<string, any>> {
        const height = this._height;
        if (height === 0) return;

        if (named) {
            const columns = this._columns;
            const keys = Object.keys(columns);
            for (let i = 0; i < height; i++) {
                yield getRowFromColumns(columns, i, keys);
            }
            return;
        }

        const colArrays = Object.values(this._columns);
        const colsLen = colArrays.length;
        for (let i = 0; i < height; i++) {
            const row = new Array(colsLen);
            for (let j = 0; j < colsLen; j++) {
                row[j] = colArrays[j][i];
            }
            yield row;
        }
    }

    /**
     * Joins two DataFrames on key columns using a specified join strategy.
     * @param {DataFrame} other Right DataFrame to join with.
     * @param {JoinOptions} [options={}] Join configuration object.
     * @param {string | string[]} [options.on] Join key column name or array of key column names that exist in both DataFrames.
     * @param {string | string[]} [options.leftOn] Join key column(s) in the left DataFrame when key names differ.
     * @param {string | string[]} [options.rightOn] Join key column(s) in the right DataFrame when key names differ.
     * @param {JoinType} [options.how] Join strategy. Default `"inner"`.
     *   - `"inner"` — Only rows with matching keys in both DataFrames.
     *   - `"left"` — All left rows; unmatched right values are `null`.
     *   - `"right"` — All right rows; unmatched left values are `null`.
     *   - `"outer"` — All rows from both sides; unmatched values are `null`.
     *   - `"semi"` — Left rows that have a match in the right DataFrame (only left columns retained).
     *   - `"anti"` — Left rows that have **no** match in the right DataFrame (only left columns retained).
     *   - `"cross"` — Cartesian product pairing every left row with every right row (keyless).
     * @param {[string, string]} [options.suffixes] Suffix tuple `[leftSuffix, rightSuffix]` appended to overlapping
     *   non-key column names (default `["", "_right"]`). Ignored for `"semi"` and `"anti"` joins.
     * @param {boolean} [options.joinNulls] If `true`, null key values are treated as equal and will match each other
     *   across DataFrames. Default `false` (SQL-standard: `NULL != NULL`).
     * @param {boolean} [options.coalesce] Coalescing behavior for join key columns. Default `true`. If `true`, coalesces join key values into left key columns and drops right key columns. If `false`, keeps join key columns separate.
     * @param {JoinMaintainOrder | boolean} [options.maintainOrder] Row order preservation strategy. Default `"none"`.
     *   - `"none"` (or `false`) — No specific ordering is desired.
     *   - `"left"` (or `true`) — Preserves the order of the left DataFrame.
     *   - `"right"` — Preserves the order of the right DataFrame.
     *   - `"left_right"` — Preserves the order of the left DataFrame first, then the right.
     *   - `"right_left"` — Preserves the order of the right DataFrame first, then the left.
     * @returns {DataFrame}
     * @example
     * <!-- doc:base_join_pair -->
     * >>> df1.join(df2, { on: "id" })
     * shape: (2, 3)
     * ┌────┬─────┬─────┐
     * │ id │ val │ num │
     * ├────┼─────┼─────┤
     * │ 1  │ a   │ 100 │
     * │ 2  │ b   │ 200 │
     * └────┴─────┴─────┘
     */
    join<U extends RowRecord = any, R extends RowRecord = any>(
        other: DataFrame<U>,
        options: JoinOptions<T, U> = {}
    ): DataFrame<R> {
        if (!other || !(other instanceof DataFrame)) {
            throw new InvalidArgumentError('join() requires a valid DataFrame in "other"');
        }

        const {
            on,
            leftOn,
            rightOn,
            how = "inner",
            suffixes = ["", "_right"],
            joinNulls = false,
            coalesce = true,
            maintainOrder = "none"
        } = options;

        const hasOn = on !== undefined;
        const hasLeftRight = leftOn !== undefined || rightOn !== undefined;

        if (how === "cross" && (hasOn || hasLeftRight)) {
            throw new InvalidArgumentError('Cannot specify "on", "leftOn", or "rightOn" when how is "cross"');
        }
        if (hasOn && hasLeftRight) {
            throw new InvalidArgumentError('Cannot specify both "on" and "leftOn"/"rightOn"');
        }
        if ((leftOn !== undefined) !== (rightOn !== undefined)) {
            throw new InvalidArgumentError('join() requires both "leftOn" and "rightOn"');
        }
        if (how !== "cross" && !hasOn && !hasLeftRight) {
            throw new InvalidArgumentError('join() requires "on" or "leftOn"/"rightOn"');
        }

        let leftKeysStr: string[] = [];
        let rightKeysStr: string[] = [];

        if (leftOn !== undefined && rightOn !== undefined) {
            leftKeysStr = toArrayOfType<string>(leftOn, "string");
            rightKeysStr = toArrayOfType<string>(rightOn, "string");
            if (leftKeysStr.length === 0 || rightKeysStr.length === 0) {
                throw new InvalidArgumentError('join() requires non-empty key arrays');
            }
            if (leftKeysStr.length !== rightKeysStr.length) {
                throw new InvalidArgumentError(`join() "leftOn" length (${leftKeysStr.length}) must match "rightOn" length (${rightKeysStr.length})`);
            }
        } else if (on !== undefined) {
            leftKeysStr = toArrayOfType<string>(on, "string");
            rightKeysStr = leftKeysStr;
            if (leftKeysStr.length === 0) {
                throw new InvalidArgumentError('join() requires at least one key column in "on"');
            }
        }

        const numKeys = leftKeysStr.length;
        for (let i = 0; i < numKeys; i++) {
            assertColumnExists(leftKeysStr[i], this._columns, "Join key", " in the left DataFrame.");
            assertColumnExists(rightKeysStr[i], other._columns, "Join key", " in the right DataFrame.");
        }

        const normalizedMaintainOrder: JoinMaintainOrder = typeof maintainOrder === "boolean"
            ? (maintainOrder ? "left" : "none")
            : (maintainOrder ?? "none");

        const resolvedConfig: JoinOptions<T, U> = {
            ...options,
            how,
            suffixes,
            joinNulls,
            coalesce,
            maintainOrder: normalizedMaintainOrder
        };

        const { leftIndices, rightIndices } = alignKeyIndices(
            this._columns,
            other._columns,
            this._height,
            other._height,
            leftKeysStr,
            rightKeysStr,
            resolvedConfig
        );

        return materializeJoinedDataFrame<R>(
            this._columns,
            other._columns,
            this._schema,
            other._schema,
            leftIndices,
            rightIndices,
            leftKeysStr,
            rightKeysStr,
            { suffixes, coalesce, how }
        );
    }

    /**
     * Performs an asof (as-of) join for inexact matching on ordered numeric or temporal key columns.
     * 
     * Similar to a left join, but instead of exact key equality, matches the nearest key row from the right
     * DataFrame according to the selected `strategy` ("backward", "forward", or "nearest") and optional `tolerance`.
     * Both DataFrames must be sorted in ascending order on their respective `on` / `leftOn` / `rightOn` join keys.
     *
     * @param {DataFrame} other The right DataFrame to join with.
     * @param {JoinAsofOptions} options Asof join configuration options.
     * @param {string} [options.on] Column name to join on (must exist in both DataFrames and be sorted ascending).
     * @param {string} [options.leftOn] Left DataFrame join key column name.
     * @param {string} [options.rightOn] Right DataFrame join key column name.
     * @param {string | string[]} [options.by] Optional exact-match group column(s) present in both DataFrames.
     * @param {string | string[]} [options.leftBy] Group column(s) for exact key matching in left DataFrame.
     * @param {string | string[]} [options.rightBy] Group column(s) for exact key matching in right DataFrame.
     * @param {JoinAsofStrategy} [options.strategy] Match search strategy. Default `"backward"`.
     *   - `"backward"` — Matches the latest right row where `rightKey <= leftKey`.
     *   - `"forward"` — Matches the earliest right row where `rightKey >= leftKey`.
     *   - `"nearest"` — Matches the right row with the absolute nearest key value to `leftKey`.
     * @param {number | string} [options.tolerance] Maximum allowed distance between left key and right key.
     * @param {boolean} [options.allowExactMatches] Whether exact key matches are permitted. Default `true`.
     * @param {[string, string]} [options.suffixes] Column name suffixes `[leftSuffix, rightSuffix]` to resolve name collisions. Default `["", "_right"]`.
     * @param {boolean} [options.coalesce] Coalescing behavior for join key columns. Default `true`.
     * @param {boolean} [options.checkSorted] Whether to verify that join keys are sorted ascending prior to matching. Default `true`.
     * @returns A new DataFrame containing the joined results.
     * @example
     * <!-- doc:base_asof_pair -->
     * >>> trades.joinAsof(quotes, { on: "time", by: "ticker" })
     * shape: (3, 4)
     * ┌──────┬────────┬───────┬───────┐
     * │ time │ ticker │ price │ bid   │
     * ├──────┼────────┼───────┼───────┤
     * │ 1000 │ AAPL   │ 150.0 │ 149.9 │
     * │ 1005 │ AAPL   │ 150.5 │ 150.4 │
     * │ 1015 │ AAPL   │ 151.0 │ 150.8 │
     * └──────┴────────┴───────┴───────┘
     */
    joinAsof<U extends RowRecord = any, R extends RowRecord = any>(
        other: DataFrame<U>,
        options: JoinAsofOptions<T, U>
    ): DataFrame<R> {
        if (!other || !(other instanceof DataFrame)) {
            throw new InvalidArgumentError('joinAsof() requires a valid DataFrame in "other"');
        }

        const {
            on,
            leftOn,
            rightOn,
            by,
            leftBy,
            rightBy,
            strategy = "backward",
            tolerance,
            allowExactMatches = true,
            suffixes = ["", "_right"],
            coalesce = true,
            checkSorted = true
        } = options ?? {};

        const leftOnKey = String(leftOn ?? on ?? "");
        const rightOnKey = String(rightOn ?? on ?? "");

        if (!leftOnKey || !rightOnKey) {
            throw new InvalidArgumentError('joinAsof() requires "on" or "leftOn"/"rightOn"');
        }

        const leftByKeys = toArrayOfType<string>(leftBy ?? by, "string");
        const rightByKeys = toArrayOfType<string>(rightBy ?? by, "string");

        if (leftByKeys.length !== rightByKeys.length) {
            throw new InvalidArgumentError(`Partition key length mismatch: ${leftByKeys.length} vs ${rightByKeys.length}`);
        }

        const numByKeys = leftByKeys.length;
        for (let i = 0; i < numByKeys; i++) {
            assertColumnExists(leftByKeys[i], this._columns, "Partition key", " in the left DataFrame.");
            assertColumnExists(rightByKeys[i], other._columns, "Partition key", " in the right DataFrame.");
        }

        const resolvedOptions: JoinAsofOptions<T, U> = {
            ...options,
            strategy,
            tolerance,
            allowExactMatches,
            suffixes,
            coalesce,
            checkSorted
        };

        const { leftIndices, rightIndices } = alignAsofIndices(
            this._columns,
            other._columns,
            this._height,
            other._height,
            leftOnKey,
            rightOnKey,
            leftByKeys,
            rightByKeys,
            resolvedOptions
        );

        const leftKeysStr = [leftOnKey, ...leftByKeys];
        const rightKeysStr = [rightOnKey, ...rightByKeys];

        return materializeJoinedDataFrame<R>(
            this._columns,
            other._columns,
            this._schema,
            other._schema,
            leftIndices,
            rightIndices,
            leftKeysStr,
            rightKeysStr,
            { suffixes, coalesce, how: "left" }
        );
    }

    /**
     * Joins two DataFrames based on arbitrary expression predicates (non-equi joins).
     *
     * Evaluates one or more boolean expressions across combined rows from both DataFrames.
     * When column names collide between the two DataFrames, columns are suffixed according to
     * `options.suffixes` (default `["", "_right"]`).
     *
     * @param {DataFrame} other The right DataFrame to join with.
     * @param {...(IntoExpr | IntoExpr[] | JoinWhereOptions)} args Predicate expression(s), arrays of expressions,
     *   and an optional configuration options object (`{ how, suffixes }`).
     * @returns {DataFrame} A new DataFrame containing the joined results.
     * @example
     * <!-- doc:base_join_where_pair -->
     * >>> east.joinWhere(
     * ...     west,
     * ...     $df.col("dur").lt($df.col("time")),
     * ...     $df.col("rev").lt($df.col("cost"))
     * ... )
     * shape: (5, 8)
     * ┌─────┬─────┬─────┬───────┬──────┬──────┬──────┬─────────────┐
     * │ id  │ dur │ rev │ cores │ t_id │ time │ cost │ cores_right │
     * ├─────┼─────┼─────┼───────┼──────┼──────┼──────┼─────────────┤
     * │ 100 │ 120 │ 12  │ 2     │ 498  │ 130  │ 13   │ 2           │
     * │ 100 │ 120 │ 12  │ 2     │ 676  │ 150  │ 15   │ 1           │
     * │ 100 │ 120 │ 12  │ 2     │ 742  │ 170  │ 16   │ 4           │
     * │ 101 │ 140 │ 14  │ 8     │ 676  │ 150  │ 15   │ 1           │
     * │ 101 │ 140 │ 14  │ 8     │ 742  │ 170  │ 16   │ 4           │
     * └─────┴─────┴─────┴───────┴──────┴──────┴──────┴─────────────┘
     */
    joinWhere<U extends RowRecord = any, R extends RowRecord = any>(
        other: DataFrame<U>,
        ...args: (IntoExpr | IntoExpr[] | JoinWhereOptions)[]
    ): DataFrame<R> {
        if (!other || !(other instanceof DataFrame)) {
            throw new InvalidArgumentError('joinWhere() requires a valid DataFrame in "other"');
        }

        let options: JoinWhereOptions = {};
        const predicates: IExpr[] = [];

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            if (Array.isArray(arg)) {
                for (let j = 0; j < arg.length; j++) predicates.push(toColExpr(arg[j], ColumnExpr) as ColumnExpr<any>);
                continue;
            }

            if (isObj(arg) && !isColExpr(arg)) {
                options = { ...options, ...(arg as JoinWhereOptions) };
                continue;
            }

            predicates.push(toColExpr(arg as IntoExpr, ColumnExpr) as ColumnExpr<any>);
        }

        const { how = "inner", suffixes = ["", "_right"] } = options;

        if (how !== "inner" && how !== "left" && how !== "right") {
            throw new InvalidArgumentError(`joinWhere() "how" must be one of "inner", "left", "right", got "${how}"`);
        }

        const { leftIndices, rightIndices } = alignWhereIndices(
            this._columns,
            other._columns,
            this._height,
            other._height,
            predicates,
            { how, suffixes }
        );

        return materializeJoinedDataFrame<R>(
            this._columns,
            other._columns,
            this._schema,
            other._schema,
            leftIndices,
            rightIndices,
            [],
            [],
            { suffixes, coalesce: false, how }
        );
    }

    /**
     * Limits the output to N rows starting from offset.
     * @param {number} n Maximum number of rows to take.
     * @param {LimitOptions} [options] Offset and slice direction options.
     * @param {number} [options.offset] Number of rows to skip before taking `n` rows (default 0).
     * @param {LimitPosition} [options.from] Slice direction starting point (`"start"` or `"end"`). Default `"start"`.
     * @returns {DataFrame}
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.limit(2, { offset: 1 })
     * shape: (2, 1)
     * ┌────┐
     * │ a  │
     * ├────┤
     * │ 20 │
     * │ 30 │
     * └────┘
     */
    limit(n: number, { offset = 0, from = "start" }: LimitOptions = {}): DataFrame<T> {
        const len = this._height;
        const safeN = clamp(Math.floor(n), { min: 0, max: len });
        const safeOffset = clamp(Math.floor(offset), { min: 0, max: len });

        let actualStart = safeOffset;
        let actualEnd = clamp(safeOffset + safeN, { min: 0, max: len });

        if (from === "end") {
            actualEnd = clamp(len - safeOffset, { min: 0, max: len });
            actualStart = clamp(actualEnd - safeN, { min: 0, max: len });
        }

        const newHeight = clamp(actualEnd - actualStart, { min: 0 });
        const newColumns: ColumnDict = {};

        const keys = Object.keys(this._columns);
        const keysLen = keys.length;
        for (let i = 0; i < keysLen; i++) {
            const key = keys[i];
            newColumns[key] = (this._columns[key] as any).slice(actualStart, actualEnd);
        }

        return DataFrame._createDirect<T>(newColumns, this._schema, newHeight);
    }

    /**
     * Pivots columns from long format to a wide datagrid structure.
     * @param config Pivot table configuration options.
     * @param {string | string[]} config.index Key column(s) to use as new DataFrame rows.
     * @param {string} config.columns Column whose distinct values become new wide column headers.
     * @param {string} config.values Column whose cell values populate the pivoted grid cells.
     * @param {AggFn | string} [config.agg] Aggregation function to apply when multiple values exist for a cell.
     * @returns DataFrame
     * @example
     * <!-- doc:base_pivot_table -->
     * >>> df.pivot({ index: "year", columns: "month", values: "revenue" })
     * shape: (2, 3)
     * ┌──────┬─────┬─────┐
     * │ year │ Jan │ Feb │
     * ├──────┼─────┼─────┤
     * │ 2020 │ 100 │ 150 │
     * │ 2021 │ 120 │ 180 │
     * └──────┴─────┴─────┘
     */
    pivot<U extends RowRecord = any>(config: PivotOptions<T>): DataFrame<U> {
        if (this._height === 0) return DataFrame._createDirect<any>({}, {}, 0);

        const { index, columns, values } = config;
        const indexStr = toArrayOfType<string>(index, "string");
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

    /**
     * Renames columns based on a key-value mapping dictionary.
     * @param {Partial<Record<keyof T, string>>} [mapping] Dictionary mapping old column names to new names.
     * @returns {DataFrame}
     * @example
     * <!-- doc:base_2x2 -->
     * >>> df.rename({ a: "id", b: "label" })
     * shape: (2, 2)
     * ┌────┬───────┐
     * │ id │ label │
     * ├────┼───────┤
     * │ 1  │ x     │
     * │ 2  │ y     │
     * └────┴───────┘
     */
    rename(mapping: Partial<Record<keyof T, string>> = {}): DataFrame<any> {
        const keys = Object.keys(this._columns);
        const len = keys.length;
        const selectList: any[] = new Array(len);

        for (let i = 0; i < len; i++) {
            const k = keys[i];
            const newKey = (mapping as any)[k];
            selectList[i] = newKey ? new ColumnExpr(k).alias(newKey) : k;
        }

        return this.select(...selectList);
    }

    /**
     * Reverses the row ordering of the DataFrame.
     * @returns DataFrame
     * @example
     * <!-- doc:base_2x2 -->
     * >>> df.reverse()
     * shape: (2, 2)
     * ┌───┬───┐
     * │ a │ b │
     * ├───┼───┤
     * │ 2 │ y │
     * │ 1 │ x │
     * └───┴───┘
     */
    reverse(): DataFrame<T> {
        return this._height === 0 ? this : this.select<T>(all().reverse());
    }

    /**
     * Gets current DataFrameSchema dictionary mapping column names to DataType.
     * @returns DataFrameSchema mapping.
     * @example
     * <!-- doc:base_2x2 -->
     * >>> df.schema
     * { a: Float64, b: Utf8 }
     */
    get schema(): DataFrameSchema {
        return this._schema;
    }

    /**
     * Selects specific columns or evaluates column expressions.
     * @param {(string | IExpr | Record<string, any> | (string | IExpr | Record<string, any>)[])[]} args Column names, column expressions, or object maps to evaluate.
     * @returns {DataFrame}
     * @example
     * <!-- doc:base_2x2 -->
     * >>> df.select("a", $df.col("b").add(100).alias("b_plus"))
     * shape: (2, 2)
     * ┌───┬────────┐
     * │ a │ b_plus │
     * ├───┼────────┤
     * │ 1 │ 110    │
     * │ 2 │ 120    │
     * └───┴────────┘
     */
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
            const targetKey = expr._outputName || expr._colName || ALL_COLUMNS_MARKER;

            if (selectedKeys.has(targetKey)) {
                throw new DataFrameError(`Duplicate column selection: "${targetKey}"`);
            }
            selectedKeys.add(targetKey);

            const col = evaluateExpression(expr, this._columns, this._height);
            evaluatedCols[i] = col;
            targetKeys[i] = targetKey;

            const rowMap = col && (col as any).rowMap;
            if (!rowMap) continue;

            if (!activeRowMap) {
                activeRowMap = rowMap;
                continue;
            }

            const len = rowMap.length;
            if (len !== activeRowMap.length) {
                throw new ShapeError(`Mismatched explode heights for "${targetKey}": ${len} !== ${activeRowMap.length}`);
            }
            for (let j = 0; j < len; j++) {
                if (rowMap[j] !== activeRowMap[j]) {
                    throw new ShapeError(`Mismatched explode row map for "${targetKey}"`);
                }
            }
        }

        let targetHeight = activeRowMap ? activeRowMap.length : this._height;

        let shouldCollapse = numExprs > 0;
        for (let i = 0; i < numExprs; i++) {
            const expr = expandedExprs[i];
            const isGlobalAgg = expr._aggFn != null && (!expr._partitionBy || expr._partitionBy.length === 0);
            if (!isGlobalAgg && !expr._isLiteral) {
                shouldCollapse = false;
                break;
            }
        }

        for (let i = 0; i < numExprs; i++) {
            const targetKey = targetKeys[i];
            let col = evaluatedCols[i];
            const hasRowMap = col && (col as any).rowMap;

            const len = isArrayOrTypedArray(col) ? col.length : 0;
            const expectedLen = (activeRowMap && !hasRowMap) ? this._height : targetHeight;
            if (len !== expectedLen) {
                throw new ShapeError(`Column height mismatch for "${targetKey}": got ${len}, expected ${expectedLen}`);
            }

            if (activeRowMap && !hasRowMap) {
                col = gatherColumnByIndices(col, activeRowMap as any);
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
            const type = resolveExprOutputType(expr, this._schema, col) || inferColumnType(col);

            outSchema[targetKey] = type;
            newColumns[targetKey] = coerceColumn(col, type, targetHeight);
        }

        return DataFrame._createDirect<U>(newColumns, outSchema, targetHeight);
    }

    /**
     * Gets DataFrame dimensions as [height, width] tuple.
     * @returns Tuple [height, width].
     * @example
     * <!-- doc:base_2x2 -->
     * >>> df.shape
     * [2, 2]
     */
    get shape(): [number, number] {
        return [this.height, this.width];
    }

    /**
     * Slices a subset range of rows between start and end index.
     * @param {number} start Starting row index.
     * @param {number} [end] Optional ending row index (exclusive).
     * @returns {DataFrame}
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.slice(1, 3)
     * shape: (2, 1)
     * ┌────┐
     * │ a  │
     * ├────┤
     * │ 20 │
     * │ 30 │
     * └────┘
     */
    slice(start: number, end?: number): DataFrame<T> {
        const total = this._height;

        const actualStart = clamp(start < 0 ? total + start : start, { min: 0, max: total });
        const actualEnd = clamp(end === undefined ? total : (end < 0 ? total + end : end), { min: 0, max: total });

        const n = clamp(actualEnd - actualStart, { min: 0 });

        return this.limit(n, { offset: actualStart });
    }

    /**
     * Sorts DataFrame rows by one or more column expressions or custom sorters.
     * @param {SortOptions<T>} [config] Sort configuration options.
     * @param {keyof T | (keyof T)[] | IExpr | IExpr[]} config.by Column name(s) or expression(s) to sort by.
     * @param {boolean | boolean[]} [config.descending] Sort order boolean or array of booleans per key (default `false`).
     * @param {boolean} [config.nullsLast] When `true` (default), places nulls at the end of sorted output.
     * @param {Partial<Record<keyof T, (a: any, b: any) => number>>} [config.custom] Optional dictionary mapping column names to custom comparator functions.
     * @returns {DataFrame}
     * @example
     * <!-- doc:base_numbers_3x2 -->
     * >>> df.sort({ by: "a", descending: true })
     * shape: (3, 2)
     * ┌───┬────┐
     * │ a │ b  │
     * ├───┼────┤
     * │ 3 │ 30 │
     * │ 2 │ 20 │
     * │ 1 │ 10 │
     * └───┴────┘
     */
    sort(config?: SortOptions<T>): DataFrame<T> {
        if (!config?.by || this._height === 0) return this;

        const { by, descending = false, nullsLast = true, customComp } = config;
        const sortKeys = toValidArray(by);
        const evalCols = Object.values(this.select(...sortKeys as any)._columns);
        const height = this._height;
        if (height === 1) return this;
        const nCols = evalCols.length;

        const colOpts: SortArrayOptions[] = new Array(nCols);
        const isDescArr = Array.isArray(descending);
        const isCompFn = typeof customComp === "function";

        for (let i = 0; i < nCols; i++) {
            colOpts[i] = {
                descending: isDescArr ? Boolean(descending[i]) : Boolean(descending),
                nullsLast,
                customComp: isCompFn ? customComp : (customComp as any)?.[sortKeys[i]]
            };
        }

        const indices = new Array<number>(height);
        for (let i = 0; i < height; i++) indices[i] = i;

        indices.sort((a, b) => {
            for (let i = 0; i < nCols; i++) {
                const res = compareScalarValues(evalCols[i][a], evalCols[i][b], colOpts[i]);
                if (res !== 0) return res;
            }
            return 0;
        });

        return DataFrame._createDirect<T>(gatherColumnsByIndices(this._columns, indices) as any, this._schema, height);
    }

    /**
     * Returns the last N rows as a new DataFrame.
     * @param n Number of trailing rows to take (default 10).
     * @returns DataFrame
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.tail(2)
     * shape: (2, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 3 │
     * │ 4 │
     * └───┘
     */
    tail(n: number = 10): DataFrame<T> {
        return this.limit(n, { offset: 0, from: 'end' })
    }

    /**
     * Evaluates a column expression or retrieves column values as a raw JavaScript array.
     * @param {K | IExpr} nameOrExpr Target column name or column expression.
     * @returns {any[]} Array of column scalar values.
     * @example
     * <!-- doc:base_2x2 -->
     * >>> df.toArray("a")
     * [10, 20]
     */
    toArray<K extends keyof T>(nameOrExpr: K | IExpr): any[] {
        return toValidArray(Object.values(this.select(nameOrExpr as any)._columns)?.[0] ?? []);
    }

    /**
     * Converts columns into a JavaScript dictionary mapping column keys to raw arrays.
     * @returns Column dictionary map.
     * @example
     * <!-- doc:base_2x2 -->
     * >>> df.toDict()
     * { a: Float64Array([1, 2]), b: ["x", "y"] }
     */
    toDict(): DataFrameColumns<T> {
        return { ...this._columns };
    }

    /**
     * Converts rows into an array of JavaScript objects.
     * @returns Array of row record objects.
     * @example
     * <!-- doc:base_2x2 -->
     * >>> df.toDicts()
     * [{ a: 1, b: "x" }]
     */
    toDicts(): T[] {
        return columnsToRows(this._columns, this._height);
    }

    /**
     * Transposes rows into columns and columns into rows.
     * @param {TransposeOptions} [options] Transpose layout options.
     * @param {boolean} [options.includeHeader] When `true`, includes original column names as a new header column (default `false`).
     * @param {string} [options.headerName] Name of the header column when `includeHeader` is `true` (default `"column"`).
     * @param {string | Iterable<string>} [options.columnNames] Column name or iterable of strings to use as transposed column headers.
     * @returns {DataFrame}
     * @example
     * <!-- doc:base_pivot_table -->
     * >>> df.transpose({ includeHeader: true, headerName: "metric" })
     * shape: (2, 3)
     * ┌────────┬──────────┬──────────┐
     * │ metric │ column_0 │ column_1 │
     * ├────────┼──────────┼──────────┤
     * │ q1     │ 100      │ 500      │
     * │ q2     │ 120      │ 600      │
     * └────────┴──────────┴──────────┘
     */
    transpose({
        includeHeader = false,
        headerName = "column",
        columnNames: colNamesOpt
    }: TransposeOptions = {}): DataFrame<any> {
        if (this._height === 0) {
            const cols: ColumnDict = includeHeader ? { [headerName]: coerceColumn([], DataTypeRegistry.Utf8, 0) } : {};
            const schema: DataFrameSchema = includeHeader ? { [headerName]: DataTypeRegistry.Utf8 } : {};
            return DataFrame._createDirect(cols, schema, 0);
        }

        let dataCols = this.columns;
        let newColNames: (string | number)[];

        if (typeof colNamesOpt === "string") {
            assertColumnExists(colNamesOpt, this._columns, "columnNames");
            const allCols = dataCols;
            dataCols = [];
            for (let i = 0, len = allCols.length; i < len; i++) {
                const c = allCols[i];
                if (c !== colNamesOpt) dataCols.push(c);
            }
            const keyCol = this._columns[colNamesOpt];
            newColNames = new Array(this._height);
            for (let i = 0; i < this._height; i++) {
                const val = keyCol[i];
                if (val == null) throw new DataFrameError(`Transpose column "${colNamesOpt}" contains null/undefined at index ${i}`);
                newColNames[i] = String(val);
            }
        } else if (colNamesOpt != null) {
            newColNames = Array.from(colNamesOpt as Iterable<any>, String);
            if (newColNames.length !== this._height) {
                throw new DataFrameError(`columnNames length (${newColNames.length}) must match the height of the DataFrame (${this._height})`);
            }
        } else {
            newColNames = Array.from({ length: this._height }, (_, i) => `column_${i}`);
        }

        const numDataCols = dataCols.length;
        const newCols: ColumnDict = {};
        const newSchema: DataFrameSchema = {};
        const cols = this._columns;

        if (includeHeader) {
            newCols[headerName] = coerceColumn(dataCols, newSchema[headerName] = DataTypeRegistry.Utf8, numDataCols);
        }

        for (let i = 0; i < this._height; i++) {
            const name = String(newColNames[i]);
            if (newCols[name] !== undefined) throw new DataFrameError(`Duplicate column name in transposed DataFrame: "${name}"`);
            const rawVals = new Array(numDataCols);
            for (let j = 0; j < numDataCols; j++) rawVals[j] = cols[dataCols[j]][i];
            const type = newSchema[name] = inferColumnType(rawVals);
            newCols[name] = coerceColumn(rawVals, type, numDataCols);
        }

        return DataFrame._createDirect(newCols, newSchema, numDataCols);
    }

    /**
     * Filters distinct unique rows matching target key columns.
     * @param {K | K[]} [columns] Target column or array of column names to evaluate uniqueness.
     * @returns {DataFrame}
     * @example
     * <!-- doc:base_2x2 -->
     * >>> df.unique()
     * shape: (2, 2)
     * ┌───┬───┐
     * │ a │ b │
     * ├───┼───┤
     * │ 1 │ x │
     * │ 2 │ y │
     * └───┴───┘
     */
    unique<K extends keyof T>(columns?: K | K[]): DataFrame<T> {
        const keys = columns !== undefined ? toValidArray(columns) : (Object.keys(this._columns) as any);
        return this.groupBy(keys).agg(exclude(keys).first());
    }

    /**
     * Unpivots a wide DataFrame into a long format structure.
     * @param {UnpivotOptions<T>} config Unpivot configuration options.
     * @param {keyof T | (keyof T)[]} config.idVars Key column(s) to retain as identifier variables.
     * @param {keyof T | (keyof T)[]} config.valueVars Column(s) to unpivot into variable-value pairs.
     * @param {string} [config.varName] Name for the new variable column holding old column headers (default `"variable"`).
     * @param {string} [config.valueName] Name for the new value column holding cell values (default `"value"`).
     * @returns {DataFrame}
     * @example
     * <!-- doc:base_pivot_table -->
     * >>> df.unpivot({ idVars: "metric", valueVars: ["q1", "q2"], varName: "quarter", valueName: "val" })
     * shape: (4, 3)
     * ┌────────┬─────────┬─────┐
     * │ metric │ quarter │ val │
     * ├────────┼─────────┼─────┤
     * │ sales  │ q1      │ 100 │
     * │ sales  │ q2      │ 120 │
     * │ clicks │ q1      │ 500 │
     * │ clicks │ q2      │ 600 │
     * └────────┴─────────┴─────┘
     */
    unpivot<U extends RowRecord = any>(config: UnpivotOptions<T>): DataFrame<U> {
        const { idVars, valueVars, varName = "variable", valueName = "value" } = config;
        const idVarsStr = toArrayOfType<string>(idVars, "string");
        const valueVarsStr = toArrayOfType<string>(valueVars, "string");
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

    /**
     * Unstacks selected columns into multiple wide columns of size `step`.
     * Reshapes data from long to wide format without aggregation.
     *
     * @param columns Column name(s) or selector(s) to unstack.
     * @param options Unstack configuration options (`step`, `how`, `fillValues`).
     * @returns {DataFrame} A new wide DataFrame with unstacked columns.
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.unstack("a", { step: 2, how: "horizontal" })
     * shape: (2, 2)
     * ┌─────┬──────┐
     * │ a_0 │ a_1  │
     * ├─────┼──────┤
     * │ 1   │ 2    │
     * │ 3   │ null │
     * └─────┴──────┘
     */
    unstack(
        columns: IntoExpr | IntoExpr[],
        options: UnstackOptions
    ): DataFrame<any> {
        if (!isValidNumber(options?.step) || options.step < 1) {
            throw new InvalidArgumentError("unstack() requires a positive integer 'step' >= 1");
        }
        if (options.how !== undefined && options.how !== "vertical" && options.how !== "horizontal") {
            throw new InvalidArgumentError("unstack() 'how' must be either 'vertical' or 'horizontal'");
        }

        const { how = "vertical", fillValues: fillValue = null } = options;
        const step = Math.trunc(options.step);

        if (this._height === 0) {
            return DataFrame._createDirect<any>({}, {}, 0);
        }

        const targetCols = this._resolveTargetColumns(columns, "unstack target column");
        if (targetCols.length === 0) {
            return DataFrame._createDirect<any>({}, {}, 0);
        }

        const origHeight = this._height;
        const newHeight = Math.ceil(origHeight / step);
        const newColumns: Record<string, any[]> = {};
        const newSchema: DataFrameSchema = {};

        const numTargets = targetCols.length;
        for (let t = 0; t < numTargets; t++) {
            const colName = targetCols[t];
            const src = this._columns[colName];
            const srcSchema = this._schema[colName];

            for (let s = 0; s < step; s++) {
                const subColName = `${colName}_${s}`;
                const arr = new Array(newHeight).fill(fillValue);

                if (how === "vertical") {
                    const start = s * newHeight;
                    const end = Math.min(start + newHeight, origHeight);
                    for (let i = start; i < end; i++) {
                        arr[i - start] = src[i];
                    }
                } else {
                    for (let r = 0, i = s; i < origHeight; r++, i += step) {
                        arr[r] = src[i];
                    }
                }

                newColumns[subColName] = arr;
                if (srcSchema) newSchema[subColName] = srcSchema;
            }
        }

        return DataFrame._createDirect<any>(newColumns, newSchema, newHeight);
    }

    /**
     * Gets width (total column count) of the DataFrame.
     * @returns Number of columns.
     * @example
     * <!-- doc:base_2x2 -->
     * >>> df.width
     * 2
     */
    get width(): number {
        return Object.keys(this._columns).length;
    }

    /**
     * Adds new columns or updates existing ones using column expressions.
     * @param {(string | IExpr | Record<string, any> | (string | IExpr | Record<string, any>)[])[]} args Expressions or field objects defining column calculations.
     * @returns {DataFrame}
     * @example
     * <!-- doc:base_2x2 -->
     * >>> df.withColumns($df.col("a").mul(10).alias("a_x10"))
     * shape: (2, 3)
     * ┌───┬───┬───────┐
     * │ a │ b │ a_x10 │
     * ├───┼───┼───────┤
     * │ 1 │ x │ 10    │
     * │ 2 │ y │ 20    │
     * └───┴───┴───────┘
     */
    withColumns(
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
            const name = expr._outputName || expr._colName || ALL_COLUMNS_MARKER;
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

    /**
     * Appends an incremental index column.
     * @param {string} [name] Name of index column (default "index").
     * @param {number} [offset] Starting numeric index offset (default 0).
     * @returns {DataFrame}
     * @example
     * <!-- doc:base_2x2 -->
     * >>> df.withRowIndex("idx")
     * shape: (2, 3)
     * ┌─────┬───┬───┐
     * │ idx │ a │ b │
     * ├─────┼───┼───┤
     * │ 0   │ 1 │ x │
     * │ 1   │ 2 │ y │
     * └─────┴───┴───┘
     */
    withRowIndex(name: string = "index", offset: number = 0): DataFrame<any> {
        const expr = seqRange(offset, {
            mode: "independent",
            dtype: DataTypeRegistry.UInt32,
            step: 1
        });

        const df = this.insertColumn(0, name, expr);
        df._schema[name] = DataTypeRegistry.UInt32;
        return df;
    }

    /**
     * Writes DataFrame to CSV format string or file/stream target.
     * @note [Environment]: When `file` is provided as a string file path, execution requires a Node.js-compatible
     * environment with `fs` access. In browser environments, omit `file` to receive a string or supply a custom writable stream object.
     * @param {string | { write: (str: string) => void }} [file] Target file path or writable stream target (optional).
     * @param {WriteCSVOptions} [options] CSV formatting options.
     * @param {string} [options.delimiter] Column delimiter character (default `","`).
     * @param {boolean} [options.header] When `true` (default), includes column header row.
     * @param {string} [options.quoteChar] Character used to enclose fields containing special characters (default `'"'`).
     * @returns {string} CSV string output.
     * @example
     * <!-- doc:base_2x2 -->
     * >>> df.writeCsv()
     * "a,b\n1,x"
     */
    writeCsv(
        file?: string | { write: (str: string) => void },
        options: WriteCSVOptions = {}
    ): string {
        if (file) {
            if (typeof file === "string") {
                if (typeof require !== "function") {
                    throw new IOStreamError("File writing is not supported in this environment (missing require('fs')).");
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
            } else if (isObj(file) && typeof (file as any).write === "function") {
                stringifyCSV(this._columns, this._height, {
                    ...options,
                    onRow: (str) => {
                        (file as any).write(str);
                    }
                });
            } else {
                throw new InvalidArgumentError("Invalid file argument: expected path string or writable stream");
            }
            return "";
        }

        return stringifyCSV(this._columns, this._height, options);
    }

    /**
     * Writes DataFrame rows to JSON format string or file/stream target.
     * @note [Environment]: When `file` is provided as a string file path, execution requires a Node.js-compatible
     * environment with `fs` access. In browser environments, omit `file` to receive a string or supply a custom writable stream object.
     * @param {string | { write: (str: string) => void }} [file] Target file path or writable stream target (optional).
     * @param {WriteJSONOptions} [options] JSON formatting and replacer options.
     * @param {JSONFormat} [options.format] JSON output format structure (`"json"` or `"ndjson"`). Default `"json"`.
     * @param {SafeJsonReplacerOptions} [options.replacerOptions] Serialization options for custom type handling.
     * @param {(v: Date) => string} [options.replacerOptions.formatDate] Custom formatter function for Date objects. Ignored if `onDate` is specified.
     * @param {"string" | "number"} [options.replacerOptions.bigintStrategy] Convert BigInts to numeric strings or numbers if safe. Default `"string"`.
     * @param {(v: bigint) => any} [options.replacerOptions.onBigInt] Custom serialization override for BigInt values.
     * @param {(v: any) => any} [options.replacerOptions.onTypedArray] Custom serialization override for TypedArray values.
     * @param {(v: Set<any>) => any} [options.replacerOptions.onSet] Custom serialization override for Set objects.
     * @param {(v: Map<any, any>) => any} [options.replacerOptions.onMap] Custom serialization override for Map objects.
     * @param {(v: RegExp) => any} [options.replacerOptions.onRegExp] Custom serialization override for RegExp objects.
     * @param {(v: Date) => any} [options.replacerOptions.onDate] Custom serialization override for Date objects. Takes precedence over `formatDate`.
     * @param {(v: Error) => any} [options.replacerOptions.onError] Custom serialization override for Error objects. Prevents empty `{}` output.
     * @param {(v: URLSearchParams) => any} [options.replacerOptions.onURLSearchParams] Custom serialization override for URLSearchParams objects.
     * @param {(this: any, k: string, v: any) => any} [options.replacerOptions.onCustom] Catch-all serialization override for custom types. Runs after native type checks.
     * @param {boolean} [options.replacerOptions.handleCircular] If `true`, handles circular references by replacing them instead of throwing.
     * @param {(this: any, k: string, v: any) => any} [options.replacerOptions.onCircular] Custom fallback when a circular reference is found. Default `"[Circular]"`.
     * @param {boolean} [options.replacerOptions.voidBigIntReplacement] If `true`, disables the default safe serialization for BigInt values.
     * @param {boolean} [options.replacerOptions.voidTypedArrayReplacement] If `true`, disables the default safe serialization for TypedArray values.
     * @param {boolean} [options.replacerOptions.voidSetReplacement] If `true`, disables the default safe serialization for Set objects.
     * @param {boolean} [options.replacerOptions.voidMapReplacement] If `true`, disables the default safe serialization for Map objects.
     * @param {boolean} [options.replacerOptions.voidRegExpReplacement] If `true`, disables the default safe serialization for RegExp objects.
     * @param {boolean} [options.replacerOptions.voidDateReplacement] If `true`, disables the default safe serialization for Date objects.
     * @param {((this: any, k: string, v: any) => any) | (string | number)[] | null} [options.replacerOptions.replacer] Custom replacer function or array whitelist that runs first for pre-processing.
     * @returns {string} JSON string representation.
     * @example
     * <!-- doc:base_2x2 -->
     * >>> df.writeJson()
     * '[{"a":1,"b":"x"}]'
     */
    writeJson(
        file?: string | { write: (str: string) => void },
        { format = "json", replacerOptions }: WriteJSONOptions = {}
    ): string {
        if (format !== "json" && format !== "ndjson") {
            throw new InvalidArgumentError(`Unsupported JSON format: "${format}"`);
        }

        const safeReplacer = replacerOptions?.replacer === null
            ? undefined
            : createSafeJsonReplacer(replacerOptions);

        let jsonStr: string;
        if (format === "ndjson") {
            const dicts = this.toDicts();
            const len = dicts.length;
            const lines = new Array(len);
            for (let i = 0; i < len; i++) {
                lines[i] = JSON.stringify(dicts[i], safeReplacer as any);
            }
            jsonStr = lines.join(NEWLINE);
        } else {
            jsonStr = JSON.stringify(this.toDicts(), safeReplacer as any);
        }

        writeStringToFileOrStream(file, jsonStr);
        return jsonStr;
    }
}
