import { DataFrame } from "../dataframe/dataframe";
import type { RowRecord, DataFrameSchema, ColumnDict, InferSchema } from "../types";

export function data<S extends DataFrameSchema>(data: any[] | ColumnDict, schema: S): DataFrame<InferSchema<S>>;
/**
 * Constructs a new DataFrame from an array of row records or a column dictionary.
 *
 * @template T The row record type of the DataFrame.
 * @param {T[] | ColumnDict} data Array of row objects or column data dictionary.
 * @param {DataFrameSchema} [schema] Optional explicit column schema mapping.
 * @returns {DataFrame<T>} A new DataFrame instance.
 * @namespace $df
 * @category Function
 * @syntax $df.{symbol}(...)
 * @example
 * >>> const df = $df.data({ a: [1, 2], b: ["x", "y"] })
 * >>> df
 * shape: (2, 2)
 * +---+---+
 * | a | b |
 * +---+---+
 * | 1 | x |
 * | 2 | y |
 * +---+---+
 */
export function data<T extends RowRecord = any>(
    data: T[] | ColumnDict,
    schema?: DataFrameSchema
): DataFrame<T>;
export function data(
    data: any[] | ColumnDict,
    schema?: DataFrameSchema
): DataFrame<any> {
    return new DataFrame(data, schema);
}

