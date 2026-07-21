import { ExprBase, derive } from "../ExprBase";
import { kleeneUnary, evaluateExpression } from "../utils";
import {
    isArrayOrTypedArray,
    getArrayStats,
    sortArray,
    SortArrayOptions,
    computeMedian,
    getUniqueArrayStats,
    computeMode,
    isArrayOfType,
    stepSliceArray,
    StepSliceArrayOptions,
    joinArray,
    getArrayElement,
    shiftArray
} from "../../utils";
import type { UniqueArrayStatsOptions, JoinArrayOptions, ExplodeOptions, IExpr, AnyTypedArray, ToStructOptions } from "../../types";
import { ELEMENT_MARKER } from "../constants";

export class ArrayExprNamespace {
    constructor(public expr: any) { }

    _deriveArray(fn: (arr: any[] | AnyTypedArray) => any) {
        return derive(this.expr, kleeneUnary((v) => {
            return isArrayOrTypedArray(v) ? fn(v as any) : null;
        }));
    }

    /**
     * Returns true if all items in nested list cells are truthy.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[true, true], [true, false]] })
     * >>> df.with_columns($df.col("a").arr.all().alias("all_true"))
     * shape: (2, 2)
     * ┌───────────────┬──────────┐
     * │ a             │ all_true │
     * ├───────────────┼──────────┤
     * │ [true, true]  │ true     │
     * │ [true, false] │ false    │
     * └───────────────┴──────────┘
     * @since v1.6.0
     */
    all() {
        return this._deriveArray((arr) => isArrayOfType(arr, (x) => !!x, { mode: "every" }));
    }

    /**
     * Returns true if any item in nested list cells is truthy.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[true, false], [false, false]] })
     * >>> df.with_columns($df.col("a").arr.any().alias("any_true"))
     * shape: (2, 2)
     * ┌────────────────┬──────────┐
     * │ a              │ any_true │
     * ├────────────────┼──────────┤
     * │ [true, false]  │ true     │
     * │ [false, false] │ false    │
     * └────────────────┴──────────┘
     * @since v1.6.0
     */
    any() {
        return this._deriveArray((arr) => isArrayOfType(arr, (x) => !!x, { mode: "some" }));
    }

    /**
     * Checks if nested lists contain item.
     * @param item The element to search for.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 2, 3], [4, 5]] })
     * >>> df.with_columns($df.col("a").arr.contains(3).alias("has_three"))
     * shape: (2, 2)
     * ┌───────────┬───────────┐
     * │ a         │ has_three │
     * ├───────────┼───────────┤
     * │ [1, 2, 3] │ true      │
     * │ [4, 5]    │ false     │
     * └───────────┴───────────┘
     * @since v1.6.0
     */
    contains(item: any) {
        return this._deriveArray((arr) => arr.includes(item));
    }

    /**
     * Checks if nested lists contain all elements in items.
     * @param items Array of elements that must all be present.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 2, 3], [1, 5]] })
     * >>> df.with_columns($df.col("a").arr.contains_all([1, 2]).alias("has_all"))
     * shape: (2, 2)
     * ┌───────────┬─────────┐
     * │ a         │ has_all │
     * ├───────────┼─────────┤
     * │ [1, 2, 3] │ true    │
     * │ [1, 5]    │ false   │
     * └───────────┴─────────┘
     * @since v1.6.0
     */
    contains_all(items: ArrayLike<any>) {
        return this._deriveArray((arr) => isArrayOfType(items, (x) => arr.includes(x), { mode: "every" }));
    }

    /**
     * Checks if nested lists contain any element in items.
     * @param items Array of elements where at least one must be present.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 2], [3, 4]] })
     * >>> df.with_columns($df.col("a").arr.contains_any([2, 3]).alias("has_any"))
     * shape: (2, 2)
     * ┌────────┬─────────┐
     * │ a      │ has_any │
     * ├────────┼─────────┤
     * │ [1, 2] │ true    │
     * │ [3, 4] │ true    │
     * └────────┴─────────┘
     * @since v1.6.0
     */
    contains_any(items: ArrayLike<any>) {
        return this._deriveArray((arr) => isArrayOfType(items, (x) => arr.includes(x), { mode: "some" }));
    }

    /**
     * Counts occurrence frequency of item inside nested lists.
     * @param item The value to count occurrences of.
     * @param options Statistics and matching options.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 2, 2, 3], [4, 5]] })
     * >>> df.with_columns($df.col("a").arr.count_matches(2).alias("twos"))
     * shape: (2, 2)
     * ┌──────────────┬──────┐
     * │ a            │ twos │
     * ├──────────────┼──────┤
     * │ [1, 2, 2, 3] │ 2    │
     * │ [4, 5]       │ 0    │
     * └──────────────┴──────┘
     * @since v1.7.0
     */
    count_matches(item: any, options: UniqueArrayStatsOptions = {}) {
        return this._deriveArray((arr) => getUniqueArrayStats(arr, options).frequencies.get(item) ?? 0);
    }

    /**
     * Filters elements of list columns matching a boolean sub-expression.
     * @param expr The boolean column expression to filter by.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 5, 10], [2, 8]] })
     * >>> df.with_columns($df.col("a").arr.filter($df.element().gt(4)).alias("filtered"))
     * shape: (2, 2)
     * ┌────────────┬──────────┐
     * │ a          │ filtered │
     * ├────────────┼──────────┤
     * │ [1, 5, 10] │ [5, 10]  │
     * │ [2, 8]     │ [8]      │
     * └────────────┴──────────┘
     * @since v1.7.0
     */
    filter(expr: IExpr) {
        return derive(this.expr, (vArray, columns) => {
            const height = vArray.length;
            const result = new Array(height);
            const subColumns = Object.create(columns);
            for (let i = 0; i < height; i++) {
                const val = vArray[i];
                if (!isArrayOrTypedArray(val)) {
                    result[i] = null;
                    continue;
                }
                const subHeight = val.length;
                subColumns[ELEMENT_MARKER] = val;
                const mask = evaluateExpression(expr, subColumns, subHeight);
                const res = [];
                if (isArrayOrTypedArray(mask)) {
                    const limit = Math.min(subHeight, mask.length);
                    for (let j = 0; j < limit; j++) {
                        if (mask[j]) {
                            res.push(val[j]);
                        }
                    }
                } else if (mask) {
                    for (let j = 0; j < subHeight; j++) {
                        res.push(val[j]);
                    }
                }
                result[i] = res;
            }
            return result;
        });
    }

    /**
     * Expands lists into row-wise records.
     * @param options Config options including handling of empty arrays and nulls.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 2], [3]] })
     * >>> df.explode($df.col("a").arr.explode())
     * shape: (3, 1)
     * ┌───┐
     * │ a │
     * ├───┤
     * │ 1 │
     * │ 2 │
     * │ 3 │
     * └───┘
     * @since v1.7.0
     */
    explode({ empty_as_null = true, keep_nulls = true }: ExplodeOptions = {}) {
        return derive(this.expr, (vArray) => {
            const height = vArray.length;
            let newHeight = 0;
            for (let i = 0; i < height; i++) {
                const val = vArray[i];
                if (isArrayOrTypedArray(val)) {
                    newHeight += val.length || (empty_as_null ? 1 : 0);
                    continue;
                }

                if (val != null) {
                    newHeight += 1;
                    continue;
                }

                if (keep_nulls) {
                    newHeight += 1;
                }
            }

            const res = new Array(newHeight);
            const rowMap = new Int32Array(newHeight);
            let idx = 0;
            for (let i = 0; i < height; i++) {
                const val = vArray[i];
                if (isArrayOrTypedArray(val)) {
                    const len = val.length;
                    if (len > 0) {
                        for (let j = 0; j < len; j++) {
                            rowMap[idx] = i;
                            res[idx++] = val[j];
                        }
                        continue;
                    }
                    if (empty_as_null) {
                        rowMap[idx] = i;
                        res[idx++] = null;
                    }
                    continue;
                }

                if (val != null) {
                    rowMap[idx] = i;
                    res[idx++] = val;
                    continue;
                }

                if (keep_nulls) {
                    rowMap[idx] = i;
                    res[idx++] = null;
                }
            }
            (res as any).rowMap = rowMap;
            return res;
        });
    }

    /**
     * Returns the first element of each list.
     * @param null_on_oob If true, returns null if the list is empty (default: true).
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[10, 20], [30]] })
     * >>> df.with_columns($df.col("a").arr.first().alias("first_a"))
     * shape: (2, 2)
     * ┌──────────┬─────────┐
     * │ a        │ first_a │
     * ├──────────┼─────────┤
     * │ [10, 20] │ 10      │
     * │ [30]     │ 30      │
     * └──────────┴─────────┘
     * @since v1.6.0
     */
    first(null_on_oob: boolean = true) {
        return this.get(0, null_on_oob);
    }

    /**
     * Gathers specific indices from each nested list.
     * @param indices Index or array of indices to extract.
     * @param null_on_oob If true, returns null for indices out of bounds (default: true).
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[10, 20, 30], [40, 50]] })
     * >>> df.with_columns($df.col("a").arr.gather([0, 2]).alias("g"))
     * shape: (2, 2)
     * ┌──────────────┬──────────┐
     * │ a            │ g        │
     * ├──────────────┼──────────┤
     * │ [10, 20, 30] │ [10, 30] │
     * │ [40, 50]     │ [40, null]│
     * └──────────────┴──────────┘
     * @since v1.7.0
     */
    gather(
        indices: number | ArrayLike<number>,
        null_on_oob: boolean = true
    ) {
        return this._deriveArray((arr) => {
            const idxs = typeof indices === "number" ? [indices] : indices;
            const numIndices = idxs.length;
            const res = new Array(numIndices);
            for (let i = 0; i < numIndices; i++) {
                res[i] = getArrayElement(arr, idxs[i], null_on_oob);
            }
            return res;
        });
    }

    /**
     * Gather element slices with custom steps.
     * @param options Config options including offset, limit, and step size.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 2, 3, 4], [5, 6, 7]] })
     * >>> df.with_columns($df.col("a").arr.gather_every({ step: 2 }).alias("ge"))
     * shape: (2, 2)
     * ┌──────────────┬────────┐
     * │ a            │ ge     │
     * ├──────────────┼────────┤
     * │ [1, 2, 3, 4] │ [1, 3] │
     * │ [5, 6, 7]    │ [5, 7] │
     * └──────────────┴────────┘
     * @since v1.7.0
     */
    gather_every(options: StepSliceArrayOptions = {}) {
        return this._deriveArray((arr) => stepSliceArray(arr, options));
    }

    /**
     * Extracts a single list element by its index position.
     * @param index The 0-based or negative index position to extract.
     * @param null_on_oob If true, returns null if index is out of bounds (default: true).
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[10, 20], [30]] })
     * >>> df.with_columns($df.col("a").arr.get(1).alias("second"))
     * shape: (2, 2)
     * ┌──────────┬────────┐
     * │ a        │ second │
     * ├──────────┼────────┤
     * │ [10, 20] │ 20     │
     * │ [30]     │ null   │
     * └──────────┴────────┘
     * @since v1.6.0
     */
    get(index: number, null_on_oob: boolean = true) {
        return this._deriveArray((arr) => getArrayElement(arr, index, null_on_oob));
    }

    /**
     * Joins elements of list columns into a single string column.
     * @param separator The character sequence separating list elements.
     * @param options String conversion options.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [["a", "b"], ["c"]] })
     * >>> df.with_columns($df.col("a").arr.join("-").alias("joined"))
     * shape: (2, 2)
     * ┌──────────┬────────┐
     * │ a        │ joined │
     * ├──────────┼────────┤
     * │ ["a","b"]│ "a-b"  │
     * │ ["c"]    │ "c"    │
     * └──────────┴────────┘
     * @since v1.7.0
     */
    join(separator: string = ",", options: JoinArrayOptions = {}) {
        return this._deriveArray((arr) => joinArray(arr, separator, options));
    }

    /**
     * Returns the last element of each list.
     * @param null_on_oob If true, returns null if the list is empty (default: true).
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[10, 20], [30]] })
     * >>> df.with_columns($df.col("a").arr.last().alias("last_a"))
     * shape: (2, 2)
     * ┌──────────┬────────┐
     * │ a        │ last_a │
     * ├──────────┼────────┤
     * │ [10, 20] │ 20     │
     * │ [30]     │ 30     │
     * └──────────┴────────┐
     * @since v1.6.0
     */
    last(null_on_oob: boolean = true) {
        return this.get(-1, null_on_oob);
    }

    /**
     * Returns the length of each list inside the column cell.
     * @since v1.6.0
     */
    len() {
        return this.lengths();
    }

    /**
     * Returns the length of each list inside the column cell.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[10, 20], [30, 40, 50]] })
     * >>> df.with_columns($df.col("a").arr.lengths().alias("len_a"))
     * shape: (2, 2)
     * ┌──────────────┬───────┐
     * │ a            │ len_a │
     * ├──────────────┼───────┤
     * │ [10, 20]     │ 2     │
     * │ [30, 40, 50] │ 3     │
     * └──────────────┴───────┘
     * @since v1.6.0
     */
    lengths() {
        return this._deriveArray((arr) => arr.length);
    }

    /**
     * Returns the maximum value of elements inside each list.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 5, 2], [10, 4]] })
     * >>> df.with_columns($df.col("a").arr.max().alias("max_a"))
     * shape: (2, 2)
     * ┌───────────┬───────┐
     * │ a         │ max_a │
     * ├───────────┼───────┤
     * │ [1, 5, 2] │ 5     │
     * │ [10, 4]   │ 10    │
     * └───────────┴───────┘
     * @since v1.6.0
     */
    max() {
        return this._deriveArray((arr) => getArrayStats(arr).max);
    }

    /**
     * Returns the index of maximum value.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 5, 2], [10, 4]] })
     * >>> df.with_columns($df.col("a").arr.max_index().alias("max_idx"))
     * shape: (2, 2)
     * ┌───────────┬─────────┐
     * │ a         │ max_idx │
     * ├───────────┼─────────┤
     * │ [1, 5, 2] │ 1       │
     * │ [10, 4]   │ 0       │
     * └───────────┴─────────┘
     * @since v1.7.0
     */
    max_index() {
        return this._deriveArray((arr) => getArrayStats(arr).maxIdx);
    }

    /**
     * Returns average of elements inside each list.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 5, 9], [10, 40]] })
     * >>> df.with_columns($df.col("a").arr.mean().alias("mean_a"))
     * shape: (2, 2)
     * ┌───────────┬────────┐
     * │ a         │ mean_a │
     * ├───────────┼────────┤
     * │ [1, 5, 9] │ 5      │
     * │ [10, 40]  │ 25     │
     * └───────────┴────────┘
     * @since v1.6.0
     */
    mean() {
        return this._deriveArray((arr) => getArrayStats(arr).mean);
    }

    /**
     * Returns statistical median inside each list.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 3, 5, 7], [10, 20, 30]] })
     * >>> df.with_columns($df.col("a").arr.median().alias("med"))
     * shape: (2, 2)
     * ┌────────────────┬──────┐
     * │ a              │ med  │
     * ├────────────────┼──────┤
     * │ [1, 3, 5, 7]   │ 4    │
     * │ [10, 20, 30]   │ 20   │
     * └────────────────┴──────┘
     * @since v1.6.0
     */
    median() {
        return this._deriveArray((arr) => computeMedian(arr));
    }

    /**
     * Returns minimum of elements inside each list.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 5, 2], [10, 4]] })
     * >>> df.with_columns($df.col("a").arr.min().alias("min_a"))
     * shape: (2, 2)
     * ┌───────────┬───────┐
     * │ a         │ min_a │
     * ├───────────┼───────┤
     * │ [1, 5, 2] │ 1     │
     * │ [10, 4]   │ 4     │
     * └───────────┴───────┘
     * @since v1.6.0
     */
    min() {
        return this._deriveArray((arr) => getArrayStats(arr).min);
    }

    /**
     * Returns the index of minimum value.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[5, 1, 2], [10, 4]] })
     * >>> df.with_columns($df.col("a").arr.min_index().alias("min_idx"))
     * shape: (2, 2)
     * ┌───────────┬─────────┐
     * │ a         │ min_idx │
     * ├───────────┼─────────┤
     * │ [5, 1, 2] │ 1       │
     * │ [10, 4]   │ 1       │
     * └───────────┴─────────┘
     * @since v1.7.0
     */
    min_index() {
        return this._deriveArray((arr) => getArrayStats(arr).minIdx);
    }

    /**
     * Returns the mode value inside each list.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 2, 2, 3], [5, 5, 6]] })
     * >>> df.with_columns($df.col("a").arr.mode().alias("mode_a"))
     * shape: (2, 2)
     * ┌──────────────┬────────┐
     * │ a            │ mode_a │
     * ├──────────────┼────────┤
     * │ [1, 2, 2, 3] │ 2      │
     * │ [5, 5, 6]    │ 5      │
     * └──────────────┴────────┘
     * @since v1.7.0
     */
    mode() {
        return this._deriveArray((arr) => computeMode(arr));
    }

    /**
     * Returns the unique count of elements inside each list.
     * @param options Formatting/statistics parameters.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 2, 2, 3], [4, 5]] })
     * >>> df.with_columns($df.col("a").arr.n_unique().alias("unique_len"))
     * shape: (2, 2)
     * ┌──────────────┬────────────┐
     * │ a            │ unique_len │
     * ├──────────────┼────────────┤
     * │ [1, 2, 2, 3] │ 3          │
     * │ [4, 5]       │ 2          │
     * └──────────────┴────────────┘
     * @since v1.7.0
     */
    n_unique(options: UniqueArrayStatsOptions = {}) {
        return this._deriveArray((arr) => getUniqueArrayStats(arr, options).count);
    }

    /**
     * Reverses elements of list columns.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 2, 3], [4, 5]] })
     * >>> df.with_columns($df.col("a").arr.reverse().alias("reversed"))
     * shape: (2, 2)
     * ┌───────────┬───────────┐
     * │ a         │ reversed  │
     * ├───────────┼───────────┤
     * │ [1, 2, 3] │ [3, 2, 1] │
     * │ [4, 5]    │ [5, 4]    │
     * └───────────┴───────────┘
     * @since v1.6.0
     */
    reverse() {
        return this._deriveArray((arr) => arr.slice().reverse());
    }

    /**
     * Shifts elements of list columns by N offsets.
     * @param n Positive or negative offsets shift amount (default: 1).
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 2, 3], [4, 5]] })
     * >>> df.with_columns($df.col("a").arr.shift(1).alias("shifted"))
     * shape: (2, 2)
     * ┌───────────┬──────────────────┐
     * │ a         │ shifted          │
     * ├───────────┼──────────────────┤
     * │ [1, 2, 3] │ [null, 1, 2]     │
     * │ [4, 5]    │ [null, 4]        │
     * └───────────┴──────────────────┘
     * @since v1.7.0
     */
    shift(n: number = 1) {
        return this._deriveArray((arr) => shiftArray(arr, n));
    }

    /**
     * Slices nested list arrays.
     * @param start The slice starting index.
     * @param end The slice ending index.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 2, 3, 4], [5, 6]] })
     * >>> df.with_columns($df.col("a").arr.slice(1, 3).alias("sliced"))
     * shape: (2, 2)
     * ┌──────────────┬────────┐
     * │ a            │ sliced │
     * ├──────────────┼────────┤
     * │ [1, 2, 3, 4] │ [2, 3] │
     * │ [5, 6]       │ [6]    │
     * └──────────────┴────────┘
     * @since v1.6.0
     */
    slice(start?: number, end?: number) {
        return this._deriveArray((arr) => arr.slice(start, end));
    }

    /**
     * Splices elements in list cells.
     * @param start The index where array modifications begin.
     * @param deleteCount The number of elements to remove.
     * @param items The elements to insert.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 2, 3], [4, 5]] })
     * >>> df.with_columns($df.col("a").arr.splice(1, 1, 10, 20).alias("spliced"))
     * shape: (2, 2)
     * ┌───────────┬─────────────────┐
     * │ a         │ spliced         │
     * ├───────────┼─────────────────┤
     * │ [1, 2, 3] │ [1, 10, 20, 3]  │
     * │ [4, 5]    │ [4, 10, 20]     │
     * └───────────┴─────────────────┘
     * @since v1.7.0
     */
    splice(start: number, deleteCount?: number, ...items: any[]) {
        return this._deriveArray((arr) => {
            const copy = [...arr];
            copy.splice(start, deleteCount ?? copy.length, ...items);
            return copy;
        });
    }

    /**
     * Sorts elements inside each list.
     * @param options Sort customization parameters (e.g. descending flag).
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[3, 1, 2], [5, 4]] })
     * >>> df.with_columns($df.col("a").arr.sort().alias("sorted"))
     * shape: (2, 2)
     * ┌───────────┬───────────┐
     * │ a         │ sorted    │
     * ├───────────┼───────────┤
     * │ [3, 1, 2] │ [1, 2, 3] │
     * │ [5, 4]    │ [4, 5]    │
     * └───────────┴───────────┘
     * @since v1.6.0
     */
    sort(options?: SortArrayOptions) {
        return this._deriveArray((arr) => sortArray(arr, options));
    }

    /**
     * Returns sample standard deviation of elements inside each list.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 2, 3], [10, 20]] })
     * >>> df.with_columns($df.col("a").arr.std().alias("std_dev"))
     * shape: (2, 2)
     * ┌───────────┬─────────┐
     * │ a         │ std_dev │
     * ├───────────┼─────────┤
     * │ [1, 2, 3] │ 1       │
     * │ [10, 20]  │ 7.071   │
     * └───────────┴─────────┘
     * @since v1.7.0
     */
    std() {
        return this._deriveArray((arr) => getArrayStats(arr).std);
    }

    /**
     * Returns sum of elements inside each list.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 2, 3], [10, 20]] })
     * >>> df.with_columns($df.col("a").arr.sum().alias("sum_a"))
     * shape: (2, 2)
     * ┌───────────┬───────┐
     * │ a         │ sum_a │
     * ├───────────┼───────┤
     * │ [1, 2, 3] │ 6     │
     * │ [10, 20]  │ 30    │
     * └───────────┴───────┘
     * @since v1.6.0
     */
    sum() {
        return this._deriveArray((arr) => getArrayStats(arr).sum);
    }

    /**
     * Converts list column elements to struct columns.
     * @param options Config flags including custom field names or upper bound size.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 2], [3, 4]] })
     * >>> df.with_columns($df.col("a").arr.to_struct({ fields: ["x", "y"] }).alias("struct_a"))
     * shape: (2, 2)
     * ┌────────┬────────────────┐
     * │ a      │ struct_a       │
     * ├────────┼────────────────┤
     * │ [1, 2] │ { x: 1, y: 2 } │
     * │ [3, 4] │ { x: 3, y: 4 } │
     * └────────┴────────────────┘
     * @since v1.7.0
     */
    to_struct({ upper_bound, fields }: ToStructOptions = {}) {
        return derive(this.expr, (vArray) => {
            const height = vArray.length;
            const result = new Array(height);

            let width = 0;
            if (Array.isArray(fields)) {
                width = fields.length;
            } else if (typeof upper_bound === "number") {
                width = upper_bound;
            } else {
                for (let i = 0; i < height; i++) {
                    const val = vArray[i];
                    if (isArrayOrTypedArray(val) && val.length > width) {
                        width = val.length;
                    }
                }
            }

            if (width === 0) {
                throw new Error("to_struct cannot be evaluated: struct width is 0. Provide an upper_bound, non-empty fields names, or non-empty lists.");
            }

            const names = new Array<string>(width);
            for (let j = 0; j < width; j++) {
                if (typeof fields === "function") {
                    names[j] = fields(j);
                } else {
                    names[j] = (Array.isArray(fields) ? fields[j] : null) ?? `field_${j}`;
                }
            }

            for (let i = 0; i < height; i++) {
                const val = vArray[i];
                if (!isArrayOrTypedArray(val)) {
                    result[i] = null;
                    continue;
                }
                const obj: any = {};
                for (let j = 0; j < width; j++) {
                    obj[names[j]] = getArrayElement(val, j, true);
                }
                result[i] = obj;
            }
            return result;
        });
    }

    /**
     * Fills each list with unique elements only.
     * @param options Custom uniqueness matching configuration.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 2, 2, 3], [4, 4, 5]] })
     * >>> df.with_columns($df.col("a").arr.unique().alias("unique_a"))
     * shape: (2, 2)
     * ┌──────────────┬───────────┐
     * │ a            │ unique_a  │
     * ├──────────────┼───────────┤
     * │ [1, 2, 2, 3] │ [1, 2, 3] │
     * │ [4, 4, 5]    │ [4, 5]    │
     * └──────────────┴───────────┘
     * @since v1.6.0
     */
    unique(options: UniqueArrayStatsOptions = {}) {
        return this._deriveArray((arr) => getUniqueArrayStats(arr, options).values);
    }

    /**
     * Returns sample variance of elements inside each list.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 2, 3], [10, 20]] })
     * >>> df.with_columns($df.col("a").arr.variance().alias("var_a"))
     * shape: (2, 2)
     * ┌───────────┬───────┐
     * │ a         │ var_a │
     * ├───────────┼───────┤
     * │ [1, 2, 3] │ 1     │
     * │ [10, 20]  │ 50    │
     * └───────────┴───────┘
     * @since v1.7.0
     */
    variance() {
        return this._deriveArray((arr) => getArrayStats(arr).variance);
    }

    /**
     * Evaluates subExpr element-wise across array lists.
     * @param expr The sub-expression to evaluate inside each nested list.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [[1, 2], [3, 4]] })
     * >>> df.with_columns($df.col("a").arr.eval($df.element().mul(10)).alias("multiplied"))
     * shape: (2, 2)
     * ┌────────┬────────────┐
     * │ a      │ multiplied │
     * ├────────┼────────────┤
     * │ [1, 2] │ [10, 20]   │
     * │ [3, 4] │ [30, 40]   │
     * └────────┴────────────┘
     * @since v1.7.0
     */
    eval(expr: IExpr) {
        return derive(this.expr, (vArray, columns) => {
            const height = vArray.length;
            const result = new Array(height);
            for (let i = 0; i < height; i++) {
                const val = vArray[i];
                if (!isArrayOrTypedArray(val)) {
                    result[i] = null;
                    continue;
                }
                const subHeight = val.length;
                const subColumns = { ...columns, [ELEMENT_MARKER]: val };
                const isGlobalAgg = expr._aggFn != null && (expr._partitionBy == null || expr._partitionBy.length === 0);
                if (isGlobalAgg) {
                    const preOpsIdx = expr._groupingOpsIndex !== undefined ? expr._groupingOpsIndex : expr._ops.length;
                    const preVal = expr._evaluatePre(preOpsIdx, subColumns, subHeight);
                    const aggVal = expr._aggFn!(Array.from(preVal));
                    result[i] = expr._evaluatePost(preOpsIdx, [aggVal], subColumns);
                } else {
                    result[i] = evaluateExpression(expr, subColumns, subHeight);
                }
            }
            return result;
        });
    }
}

export class ArrayExpr extends ExprBase {
    get arr() {
        return new ArrayExprNamespace(this);
    }
}