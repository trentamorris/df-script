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
     * @since v1.5.0
     */
    constructor(data: T[] | ColumnDict, schema?: DataFrameSchema, height?: number) {
        if (Array.isArray(data)) {
            const { columns, height: h } = rowsToColumns(data);
            this._columns = columns as DataFrameColumns<T>;
            this._height = h;
            schema ? this._applySchema(schema) : this._inferSchema();
            return;
        }

        if (isObj(data)) {
            this._columns = data as DataFrameColumns<T>;
            this._height = assertHeight(data, height);
            schema ? this._applySchema(schema) : this._inferSchema();
            return;
        }

        this._columns = {} as DataFrameColumns<T>;
        this._height = 0;
        schema ? this._applySchema(schema) : (this._schema = {});
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

    /**
     * Gets array of column names in the DataFrame.
     * @returns Array of column name strings.
     * @example
     * >>> const df = $df.data({ a: [1], b: [2] })
     * >>> df
     * shape: (1, 2)
     * ┌───┬───┐
     * │ a │ b │
     * ├───┼───┤
     * │ 1 │ 2 │
     * └───┴───┘
     * >>> df.columns
     * ["a", "b"]
     * @since v1.5.0
     */
    get columns(): string[] {
        return Object.keys(this._columns);
    }

    /**
     * Concatenates items vertically or horizontally to the current DataFrame.
     * @param items Single DataFrame or array of DataFrames to concatenate.
     * @param options Concatenation strategy and join settings.
     * @returns DataFrame
     * @example
     * >>> const df1 = $df.data({ a: [1] })
     * >>> df1
     * shape: (1, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 1 │
     * └───┘
     * >>> const df2 = $df.data({ a: [2] })
     * >>> df1.concat(df2)
     * shape: (2, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 1 │
     * │ 2 │
     * └───┘
     * @since v1.5.0
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
     * @param args Column names or arrays of column names to remove.
     * @returns DataFrame
     * @example
     * >>> const df = $df.data({ a: [1], b: [2] })
     * >>> df
     * shape: (1, 2)
     * ┌───┬───┐
     * │ a │ b │
     * ├───┼───┤
     * │ 1 │ 2 │
     * └───┴───┘
     * >>> df.drop("b")
     * shape: (1, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 1 │
     * └───┘
     * @since v1.5.0
     */
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

    /**
     * Drops rows containing null or undefined values in specified subset columns.
     * @param subset Column name or array of column names to check for nulls.
     * @returns DataFrame
     * @example
     * >>> const df = $df.data({ a: [1, null, 3] })
     * >>> df
     * shape: (3, 1)
     * ┌──────┐
     * │ a    │
     * ├──────┤
     * │ 1    │
     * │ null │
     * │ 3    │
     * └──────┘
     * >>> df.drop_nulls()
     * shape: (2, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 1 │
     * │ 3 │
     * └───┘
     * @since v1.6.0
     */
    drop_nulls(subset?: string | string[]): DataFrame<T> {
        if (this._height === 0) return this;
        return this.filter(subset ? new ColumnExpr(subset).is_not_null() : all().is_not_null());
    }

    /**
     * Gets array of registered column DataTypes matching current schema order.
     * @returns Array of RegisteredDataType definitions.
     * @example
     * >>> const df = $df.data({ a: [1], b: ["text"] })
     * >>> df
     * shape: (1, 2)
     * ┌───┬──────┐
     * │ a │ b    │
     * ├───┼──────┤
     * │ 1 │ text │
     * └───┴──────┘
     * >>> df.dtypes
     * [Float64, Utf8]
     * @since v1.5.0
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
     * Explodes an array column into multiple rows, replicating non-target row attributes.
     * @param columns Target column expression or array column name to explode.
     * @param options Config options for empty array behavior.
     * @returns DataFrame
     * @example
     * >>> const df = $df.data({ group: ["A"], values: [[1, 2]] })
     * >>> df
     * shape: (1, 2)
     * ┌───────┬────────┐
     * │ group │ values │
     * ├───────┼────────┤
     * │ A     │ [1, 2] │
     * └───────┴────────┘
     * >>> df.explode("values")
     * shape: (2, 2)
     * ┌───────┬────────┐
     * │ group │ values │
     * ├───────┼────────┤
     * │ A     │ 1      │
     * │ A     │ 2      │
     * └───────┴────────┘
     * @since v1.7.0
     */
    explode(
        columns: IntoExpr | IntoExpr[],
        options?: ExplodeOptions
    ): DataFrame<any> {
        const expr = ColumnExpr.toColExpr(columns);
        const colNames = expr._colNames || [expr._colName || expr._outputName];
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
                    ? new ColumnExpr(key).arr.explode(options)
                    : new ColumnExpr(key)
            );
        }

        return this.select(...selectList);
    }

    /**
     * Fills null values across columns using scalar values or statistical strategies.
     * @param options Configuration options including value, strategy ("zero", "forward", etc.), and limit.
     * @returns DataFrame
     * @example
     * >>> const df = $df.data({ a: [1, null, 3] })
     * >>> df
     * shape: (3, 1)
     * ┌──────┐
     * │ a    │
     * ├──────┤
     * │ 1    │
     * │ null │
     * │ 3    │
     * └──────┘
     * >>> df.fill_null({ value: 0 })
     * shape: (3, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 1 │
     * │ 0 │
     * │ 3 │
     * └───┘
     * @since v1.6.0
     */
    fill_null(options: FillNullOptions = {}): DataFrame<T> {
        if (this._height === 0) return this;
        return this.with_columns(all().fill_null(options));
    }

    /**
     * Filters rows matching boolean column expressions or predicate callbacks.
     * @param exprs Expressions or predicate functions evaluated per row.
     * @returns DataFrame
     * @example
     * >>> const df = $df.data({ a: [1, 2, 3] })
     * >>> df
     * shape: (3, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 1 │
     * │ 2 │
     * │ 3 │
     * └───┘
     * >>> df.filter($df.col("a").gt(1))
     * shape: (2, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 2 │
     * │ 3 │
     * └───┘
     * @since v1.5.0
     */
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

    /**
     * Returns the mapping dictionary of column names to DataType.
     * @returns DataFrameSchema
     * @example
     * >>> const df = $df.data({ a: [1], b: ["text"] })
     * >>> df
     * shape: (1, 2)
     * ┌───┬──────┐
     * │ a │ b    │
     * ├───┼──────┤
     * │ 1 │ text │
     * └───┴──────┘
     * >>> df.get_schema()
     * { a: Float64, b: Utf8 }
     * @since v1.5.0
     */
    get_schema(): DataFrameSchema {
        return this._schema;
    }

    /**
     * Groups rows by key columns to prepare for aggregations.
     * @param keys Column name or array of key column names.
     * @returns GroupedData
     * @example
     * >>> const df = $df.data({ cat: ["A", "A", "B"], val: [10, 20, 30] })
     * >>> df
     * shape: (3, 2)
     * ┌─────┬─────┐
     * │ cat │ val │
     * ├─────┼─────┤
     * │ A   │ 10  │
     * │ A   │ 20  │
     * │ B   │ 30  │
     * └─────┴─────┘
     * >>> df.groupby("cat").agg($df.col("val").sum().alias("sum"))
     * shape: (2, 2)
     * ┌─────┬─────┐
     * │ cat │ sum │
     * ├─────┼─────┤
     * │ A   │ 30  │
     * │ B   │ 30  │
     * └─────┴─────┘
     * @since v1.5.0
     */
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

    /**
     * Returns the first N rows as a new DataFrame.
     * @param n Number of leading rows to slice (default 10).
     * @returns DataFrame
     * @example
     * >>> const df = $df.data({ a: [1, 2, 3, 4] })
     * >>> df
     * shape: (4, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 1 │
     * │ 2 │
     * │ 3 │
     * │ 4 │
     * └───┘
     * >>> df.head(2)
     * shape: (2, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 1 │
     * │ 2 │
     * └───┘
     * @since v1.5.0
     */
    head(n: number = 10): DataFrame<T> {
        return this.limit(n, { offset: 0, from: "start" })
    }

    /**
     * Gets height (total row count) of the DataFrame.
     * @returns Number of rows.
     * @example
     * >>> const df = $df.data({ a: [10, 20, 30] })
     * >>> df
     * shape: (3, 1)
     * ┌────┐
     * │ a  │
     * ├────┤
     * │ 10 │
     * │ 20 │
     * │ 30 │
     * └────┘
     * >>> df.height
     * 3
     * @since v1.5.0
     */
    get height(): number {
        return this._height;
    }

    /**
     * Concatenates columns horizontally to the current DataFrame.
     * @param other DataFrame or array of DataFrames to append side-by-side.
     * @param options Horizontal concat options.
     * @returns DataFrame
     * @example
     * >>> const df1 = $df.data({ a: [1, 2] })
     * >>> df1
     * shape: (2, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 1 │
     * │ 2 │
     * └───┘
     * >>> const df2 = $df.data({ b: [10, 20] })
     * >>> df1.hstack(df2)
     * shape: (2, 2)
     * ┌───┬────┐
     * │ a │ b  │
     * ├───┼────┤
     * │ 1 │ 10 │
     * │ 2 │ 20 │
     * └───┴────┘
     * @since v1.6.0
     */
    hstack<U extends RowRecord = any>(
        other: ConcatItem | ConcatItem[],
        options: HorizontalConcatOptions = {}
    ): DataFrame<U> {
        return this.concat<U>(other, { how: "horizontal", horizontal: options });
    }

    /**
     * Inserts a new column at a specific ordinal index position.
     * @param index Target column index position.
     * @param name Name of the inserted column.
     * @param expr Value expression or column definition.
     * @returns DataFrame
     * @example
     * >>> const df = $df.data({ a: [1], c: [3] })
     * >>> df
     * shape: (1, 2)
     * ┌───┬───┐
     * │ a │ c │
     * ├───┼───┤
     * │ 1 │ 3 │
     * └───┴───┘
     * >>> df.insert_column(1, "b", 2)
     * shape: (1, 3)
     * ┌───┬───┬───┐
     * │ a │ b │ c │
     * ├───┼───┼───┤
     * │ 1 │ 2 │ 3 │
     * └───┴───┴───┘
     * @since v1.6.0
     */
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

    /**
     * Retrieves a single scalar cell value by row and column position or name.
     * @param row Row index position.
     * @param column Column index or column name string.
     * @returns Cell scalar value.
     * @throws {DataFrameError} If shape is not (1, 1) when called without arguments.
     * @throws {ShapeError} If row or column index is out of bounds.
     * @example
     * >>> const df = $df.data({ val: [42] })
     * >>> df
     * shape: (1, 1)
     * ┌─────┐
     * │ val │
     * ├─────┤
     * │ 42  │
     * └─────┘
     * >>> df.item(0, "val")
     * 42
     * @since v1.5.0
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

    /**
     * Yields a generator iterating over raw column arrays.
     * @returns Generator of ColumnData arrays.
     * @example
     * >>> const df = $df.data({ a: [1, 2], b: [3, 4] })
     * >>> df
     * shape: (2, 2)
     * ┌───┬───┐
     * │ a │ b │
     * ├───┼───┤
     * │ 1 │ 3 │
     * │ 2 │ 4 │
     * └───┴───┘
     * >>> for (const col of df.iter_columns()) { console.log(col); }
     * Float64Array([1, 2])
     * Float64Array([3, 4])
     * @since v1.6.0
     */
    *iter_columns(): Generator<ColumnData> {
        const keys = Object.keys(this._columns);
        const keysLen = keys.length;
        const columns = this._columns;
        for (let j = 0; j < keysLen; j++) {
            yield columns[keys[j]];
        }
    }

    /**
     * Yields a generator iterating over rows as tuples or named objects.
     * @param options Dict options (`named: true` for objects, `false` for positional arrays).
     * @returns Generator of rows.
     * @example
     * >>> const df = $df.data({ a: [1, 2], b: ["x", "y"] })
     * >>> df
     * shape: (2, 2)
     * ┌───┬───┐
     * │ a │ b │
     * ├───┼───┤
     * │ 1 │ x │
     * │ 2 │ y │
     * └───┴───┘
     * >>> for (const row of df.iter_rows({ named: true })) { console.log(row); }
     * { a: 1, b: "x" }
     * { a: 2, b: "y" }
     * @since v1.6.0
     */
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

    /**
     * Joins two DataFrames on key columns using inner, left, right, or outer join strategy.
     * @param config Join configuration containing right DataFrame, on keys, strategy, and suffixes.
     * @returns DataFrame
     * @example
     * >>> const df1 = $df.data({ id: [1, 2], val: ["a", "b"] })
     * >>> df1
     * shape: (2, 2)
     * ┌────┬─────┐
     * │ id │ val │
     * ├────┼─────┤
     * │ 1  │ a   │
     * │ 2  │ b   │
     * └────┴─────┘
     * >>> const df2 = $df.data({ id: [1, 2], num: [100, 200] })
     * >>> df1.join({ other: df2, on: "id" })
     * shape: (2, 3)
     * ┌────┬─────┬─────┐
     * │ id │ val │ num │
     * ├────┼─────┼─────┤
     * │ 1  │ a   │ 100 │
     * │ 2  │ b   │ 200 │
     * └────┴─────┴─────┘
     * @since v1.6.0
     */
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

    /**
     * Limits the output to N rows starting from offset.
     * @param n Maximum number of rows to take.
     * @param options Offset and position options.
     * @returns DataFrame
     * @example
     * >>> const df = $df.data({ a: [10, 20, 30, 40] })
     * >>> df
     * shape: (4, 1)
     * ┌────┐
     * │ a  │
     * ├────┤
     * │ 10 │
     * │ 20 │
     * │ 30 │
     * │ 40 │
     * └────┘
     * >>> df.limit(2, { offset: 1 })
     * shape: (2, 1)
     * ┌────┐
     * │ a  │
     * ├────┤
     * │ 20 │
     * │ 30 │
     * └────┘
     * @since v1.5.0
     */
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

    /**
     * Pivots columns from long format to a wide datagrid structure.
     * @param config Pivot configuration containing index, columns, and values.
     * @returns DataFrame
     * @example
     * >>> const df = $df.data({
     * ...   year: [2020, 2020, 2021, 2021],
     * ...   month: ["Jan", "Feb", "Jan", "Feb"],
     * ...   revenue: [100, 150, 120, 180]
     * ... })
     * >>> df
     * shape: (4, 3)
     * ┌──────┬───────┬─────────┐
     * │ year │ month │ revenue │
     * ├──────┼───────┼─────────┤
     * │ 2020 │ Jan   │ 100     │
     * │ 2020 │ Feb   │ 150     │
     * │ 2021 │ Jan   │ 120     │
     * │ 2021 │ Feb   │ 180     │
     * └──────┴───────┴─────────┘
     * >>> df.pivot({ index: "year", columns: "month", values: "revenue" })
     * shape: (2, 3)
     * ┌──────┬─────┬─────┐
     * │ year │ Jan │ Feb │
     * ├──────┼─────┼─────┤
     * │ 2020 │ 100 │ 150 │
     * │ 2021 │ 120 │ 180 │
     * └──────┴─────┴─────┘
     * @since v1.7.0
     */
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

    /**
     * Renames columns based on a key-value mapping dictionary.
     * @param mapping Dictionary mapping old column names to new names.
     * @returns DataFrame
     * @example
     * >>> const df = $df.data({ old_name: [1] })
     * >>> df
     * shape: (1, 1)
     * ┌──────────┐
     * │ old_name │
     * ├──────────┤
     * │ 1        │
     * └──────────┘
     * >>> df.rename({ old_name: "new_name" })
     * shape: (1, 1)
     * ┌──────────┐
     * │ new_name │
     * ├──────────┤
     * │ 1        │
     * └──────────┘
     * @since v1.6.0
     */
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

    /**
     * Reverses the row ordering of the DataFrame.
     * @returns DataFrame
     * @example
     * >>> const df = $df.data({ a: [1, 2, 3] })
     * >>> df
     * shape: (3, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 1 │
     * │ 2 │
     * │ 3 │
     * └───┘
     * >>> df.reverse()
     * shape: (3, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 3 │
     * │ 2 │
     * │ 1 │
     * └───┘
     * @since v1.5.0
     */
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

    /**
     * Gets current DataFrameSchema dictionary mapping column names to DataType.
     * @returns DataFrameSchema mapping.
     * @example
     * >>> const df = $df.data({ a: [1], b: ["text"] })
     * >>> df
     * shape: (1, 2)
     * ┌───┬──────┐
     * │ a │ b    │
     * ├───┼──────┤
     * │ 1 │ text │
     * └───┴──────┘
     * >>> df.schema
     * { a: Float64, b: Utf8 }
     * @since v1.5.0
     */
    get schema(): DataFrameSchema {
        return this._schema;
    }

    /**
     * Selects specific columns or evaluates column expressions.
     * @param args Column names, column expressions, or object maps to evaluate.
     * @returns DataFrame
     * @example
     * >>> const df = $df.data({ a: [1, 2], b: [10, 20] })
     * >>> df
     * shape: (2, 2)
     * ┌───┬────┐
     * │ a │ b  │
     * ├───┼────┤
     * │ 1 │ 10 │
     * │ 2 │ 20 │
     * └───┴────┘
     * >>> df.select("a", $df.col("b").add(100).alias("b_plus"))
     * shape: (2, 2)
     * ┌───┬────────┐
     * │ a │ b_plus │
     * ├───┼────────┤
     * │ 1 │ 110    │
     * │ 2 │ 120    │
     * └───┴────────┘
     * @since v1.5.0
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
            const isGlobalAgg = expr._aggFn != null && (expr._partitionBy == null || expr._partitionBy.length === 0);
            const isLit = !!expr._isLiteral;
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
            const originalKey = expr._colName || targetKey;
            const isPureCol = expr instanceof ColumnExpr && expr._ops.length === 0 && !expr._isWindow && !expr._aggFn;
            const type = (isPureCol && this._schema[originalKey]) || inferColumnType(col);

            outSchema[targetKey] = type;
            newColumns[targetKey] = coerceColumn(col, type, targetHeight);
        }

        return DataFrame._createDirect<U>(newColumns, outSchema, targetHeight);
    }

    /**
     * Gets DataFrame dimensions as [height, width] tuple.
     * @returns Tuple [height, width].
     * @example
     * >>> const df = $df.data({ a: [1, 2], b: ["x", "y"] })
     * >>> df
     * shape: (2, 2)
     * ┌───┬───┐
     * │ a │ b │
     * ├───┼───┤
     * │ 1 │ x │
     * │ 2 │ y │
     * └───┴───┘
     * >>> df.shape
     * [2, 2]
     * @since v1.5.0
     */
    get shape(): [number, number] {
        return [this.height, this.width];
    }

    /**
     * Slices a subset range of rows between start and end index.
     * @param start Starting row index.
     * @param end Optional ending row index (exclusive).
     * @returns DataFrame
     * @example
     * >>> const df = $df.data({ a: [10, 20, 30, 40] })
     * >>> df
     * shape: (4, 1)
     * ┌────┐
     * │ a  │
     * ├────┤
     * │ 10 │
     * │ 20 │
     * │ 30 │
     * │ 40 │
     * └────┘
     * >>> df.slice(1, 3)
     * shape: (2, 1)
     * ┌────┐
     * │ a  │
     * ├────┤
     * │ 20 │
     * │ 30 │
     * └────┘
     * @since v1.5.0
     */
    slice(start: number, end?: number): DataFrame<T> {
        const total = this._height;

        const actualStart = start < 0 ? Math.max(total + start, 0) : Math.min(start, total);
        const actualEnd = end === undefined
            ? total
            : (end < 0 ? Math.max(total + end, 0) : Math.min(end, total));

        const n = Math.max(actualEnd - actualStart, 0);

        return this.limit(n, { offset: actualStart });
    }

    /**
     * Sorts DataFrame rows by one or more column expressions or custom sorters.
     * @param config Configuration options containing by keys, descending, and nullsLast options.
     * @returns DataFrame
     * @example
     * >>> const df = $df.data({ val: [3, 1, 2] })
     * >>> df
     * shape: (3, 1)
     * ┌─────┐
     * │ val │
     * ├─────┤
     * │ 3   │
     * │ 1   │
     * │ 2   │
     * └─────┘
     * >>> df.sort({ by: "val" })
     * shape: (3, 1)
     * ┌─────┐
     * │ val │
     * ├─────┤
     * │ 1   │
     * │ 2   │
     * │ 3   │
     * └─────┘
     * @since v1.5.0
     */
    sort(config?: SortOptions<T>): DataFrame<T> {
        if (!config || !config.by || this._height === 0) return this;

        const { by, descending = false, nullsLast = true, custom } = config;
        const sortKeys = toValidArray(by);

        for (let i = 0; i < sortKeys.length; i++) {
            const expr = ColumnExpr.toColExpr(sortKeys[i] as any);
            if (expr._colName) {
                assertColumnExists(expr._colName, this._columns, "Sort key");
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

    /**
     * Returns the last N rows as a new DataFrame.
     * @param n Number of trailing rows to take (default 10).
     * @returns DataFrame
     * @example
     * >>> const df = $df.data({ a: [1, 2, 3, 4] })
     * >>> df
     * shape: (4, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 1 │
     * │ 2 │
     * │ 3 │
     * │ 4 │
     * └───┘
     * >>> df.tail(2)
     * shape: (2, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 3 │
     * │ 4 │
     * └───┘
     * @since v1.5.0
     */
    tail(n: number = 10): DataFrame<T> {
        return this.limit(n, { offset: 0, from: 'end' })
    }

    /**
     * Converts columns into a JavaScript dictionary mapping column keys to raw arrays.
     * @returns Column dictionary map.
     * @example
     * >>> const df = $df.data({ a: [1, 2], b: ["x", "y"] })
     * >>> df
     * shape: (2, 2)
     * ┌───┬───┐
     * │ a │ b │
     * ├───┼───┤
     * │ 1 │ x │
     * │ 2 │ y │
     * └───┴───┘
     * >>> df.to_dict()
     * { a: Float64Array([1, 2]), b: ["x", "y"] }
     * @since v1.5.0
     */
    to_dict(): DataFrameColumns<T> {
        return { ...this._columns };
    }

    /**
     * Converts rows into an array of JavaScript objects.
     * @returns Array of row record objects.
     * @example
     * >>> const df = $df.data({ a: [1], b: ["x"] })
     * >>> df
     * shape: (1, 2)
     * ┌───┬───┐
     * │ a │ b │
     * ├───┼───┤
     * │ 1 │ x │
     * └───┴───┘
     * >>> df.to_dicts()
     * [{ a: 1, b: "x" }]
     * @since v1.5.0
     */
    to_dicts(): T[] {
        return columnsToRows(this._columns, this._height);
    }

    /**
     * Evaluates a column expression or retrieves column values as a raw JavaScript array.
     * @param nameOrExpr Target column name or column expression.
     * @returns Array of column scalar values.
     * @example
     * >>> const df = $df.data({ a: [10, 20] })
     * >>> df
     * shape: (2, 1)
     * ┌────┐
     * │ a  │
     * ├────┤
     * │ 10 │
     * │ 20 │
     * └────┘
     * >>> df.to_array("a")
     * [10, 20]
     * @since v1.6.0
     */
    to_array<K extends keyof T>(nameOrExpr: K | IExpr): any[] {
        if (this._height === 0) return [];
        if (nameOrExpr == null) {
            return new Array(this._height).fill(null);
        }

        const expr = ColumnExpr.toColExpr(nameOrExpr as any);
        const colData = expr.evaluate(this._columns, this._height);
        return Array.isArray(colData) ? colData : Array.from(colData);
    }

    /**
     * Transposes rows into columns and columns into rows.
     * @param options Configuration for headers, header names, and output columns.
     * @returns DataFrame
     * @example
     * >>> const df = $df.data({ metric: ["sales", "clicks"], q1: [100, 500], q2: [120, 600] })
     * >>> df
     * shape: (2, 3)
     * ┌────────┬─────┬─────┐
     * │ metric │ q1  │ q2  │
     * ├────────┼─────┼─────┤
     * │ sales  │ 100 │ 120 │
     * │ clicks │ 500 │ 600 │
     * └────────┴─────┴─────┘
     * >>> df.transpose({ include_header: true, header_name: "metric" })
     * shape: (2, 3)
     * ┌────────┬──────────┬──────────┐
     * │ metric │ column_0 │ column_1 │
     * ├────────┼──────────┼──────────┤
     * │ q1     │ 100      │ 500      │
     * │ q2     │ 120      │ 600      │
     * └────────┴──────────┴──────────┘
     * @since v1.7.0
     */
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

    /**
     * Filters distinct unique rows matching target key columns.
     * @param columns Target column or array of column names to evaluate uniqueness.
     * @returns DataFrame
     * @example
     * >>> const df = $df.data({ a: [1, 2, 2], b: ["x", "y", "y"] })
     * >>> df
     * shape: (3, 2)
     * ┌───┬───┐
     * │ a │ b │
     * ├───┼───┤
     * │ 1 │ x │
     * │ 2 │ y │
     * │ 2 │ y │
     * └───┴───┘
     * >>> df.unique()
     * shape: (2, 2)
     * ┌───┬───┐
     * │ a │ b │
     * ├───┼───┤
     * │ 1 │ x │
     * │ 2 │ y │
     * └───┴───┘
     * @since v1.5.0
     */
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

    /**
     * Unpivots a wide DataFrame into a long format structure.
     * @param config Unpivot configuration containing idVars, valueVars, varName, and valueName.
     * @returns DataFrame
     * @example
     * >>> const df = $df.data({ year: [2020], Jan: [100], Feb: [150] })
     * >>> df
     * shape: (1, 3)
     * ┌──────┬─────┬─────┐
     * │ year │ Jan │ Feb │
     * ├──────┼─────┼─────┤
     * │ 2020 │ 100 │ 150 │
     * └──────┴─────┴─────┘
     * >>> df.unpivot({ idVars: "year", valueVars: ["Jan", "Feb"], varName: "month", valueName: "revenue" })
     * shape: (2, 3)
     * ┌──────┬───────┬─────────┐
     * │ year │ month │ revenue │
     * ├──────┼───────┼─────────┤
     * │ 2020 │ Jan   │ 100     │
     * │ 2020 │ Feb   │ 150     │
     * └──────┴───────┴─────────┘
     * @since v1.7.0
     */
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

    /**
     * Concatenates DataFrames vertically. Alias for concat({ how: "vertical" }).
     * @param other Single DataFrame or array of DataFrames to append vertically.
     * @returns DataFrame
     * @example
     * >>> const df1 = $df.data({ a: [1] })
     * >>> df1
     * shape: (1, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 1 │
     * └───┘
     * >>> const df2 = $df.data({ a: [2] })
     * >>> df1.vstack(df2)
     * shape: (2, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 1 │
     * │ 2 │
     * └───┘
     * @since v1.6.0
     */
    vstack<U extends RowRecord = any>(
        other: ConcatItem | ConcatItem[]
    ): DataFrame<U> {
        return this.concat<U>(other, { how: "vertical" });
    }

    /**
     * Gets width (total column count) of the DataFrame.
     * @returns Number of columns.
     * @example
     * >>> const df = $df.data({ a: [1], b: [2] })
     * >>> df
     * shape: (1, 2)
     * ┌───┬───┐
     * │ a │ b │
     * ├───┼───┤
     * │ 1 │ 2 │
     * └───┴───┘
     * >>> df.width
     * 2
     * @since v1.5.0
     */
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

    /**
     * Adds new columns or updates existing ones using column expressions.
     * @param args Expressions or field objects defining column calculations.
     * @returns DataFrame
     * @example
     * >>> const df = $df.data({ a: [1, 2] })
     * >>> df
     * shape: (2, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 1 │
     * │ 2 │
     * └───┘
     * >>> df.with_columns($df.col("a").add(10).alias("b"))
     * shape: (2, 2)
     * ┌───┬────┐
     * │ a │ b  │
     * ├───┼────┤
     * │ 1 │ 11 │
     * │ 2 │ 12 │
     * └───┴────┘
     * @since v1.6.0
     */
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
     * @param name Name of index column (default "index").
     * @param offset Starting numeric index offset (default 0).
     * @returns DataFrame
     * @example
     * >>> const df = $df.data({ val: ["a", "b"] })
     * >>> df
     * shape: (2, 1)
     * ┌─────┐
     * │ val │
     * ├─────┤
     * │ a   │
     * │ b   │
     * └─────┘
     * >>> df.with_row_index("idx")
     * shape: (2, 2)
     * ┌─────┬─────┐
     * │ idx │ val │
     * ├─────┼─────┤
     * │ 0   │ a   │
     * │ 1   │ b   │
     * └─────┴─────┘
     * @since v1.6.0
     */
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

    /**
     * Writes DataFrame rows to JSON format string or file/stream target.
     * @param file Target file path or stream object.
     * @param options Formatting and replacer configuration options.
     * @returns JSON string representation.
     * @example
     * >>> const df = $df.data({ a: [1], b: ["x"] })
     * >>> df
     * shape: (1, 2)
     * ┌───┬───┐
     * │ a │ b │
     * ├───┼───┤
     * │ 1 │ x │
     * └───┴───┘
     * >>> df.write_json()
     * '[{"a":1,"b":"x"}]'
     * @since v1.6.0
     */
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

    /**
     * Writes DataFrame to CSV format string or file/stream target.
     * @param file Target file path or stream object.
     * @param options CSV formatting options (delimiter, header, quoteChar).
     * @returns CSV string output.
     * @example
     * >>> const df = $df.data({ a: [1], b: ["x"] })
     * >>> df
     * shape: (1, 2)
     * ┌───┬───┐
     * │ a │ b │
     * ├───┼───┤
     * │ 1 │ x │
     * └───┴───┘
     * >>> df.write_csv()
     * "a,b\n1,x"
     * @since v1.6.0
     */
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
            } else if (isObj(file) && typeof (file as any).write === "function") {
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
