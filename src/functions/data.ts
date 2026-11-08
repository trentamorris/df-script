import { DataFrame } from "../dataframe/dataframe";
import type { RowRecord, DataFrameSchema, DataFrameDataArg } from "../types";

/**
 * Constructs a new DataFrame from an array of row records or a column dictionary.
 *
 * @template T The row record type of the DataFrame.
 * @param {DataFrameDataArg<T>} data Array of row objects or column data dictionary.
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
    data: DataFrameDataArg<T>,
    schema?: DataFrameSchema
): DataFrame<T> {
    return new DataFrame<T>(data, schema);
}
