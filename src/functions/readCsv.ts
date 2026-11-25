import { DataFrame } from "../dataframe/dataframe";

import type { ColumnDict, DataFrameDataArg, ReadCSVOptions, RowRecord } from "../types";
import { parseCSV, inferAndCoerceCSVColumn } from "../utils";

/**
 * Reads a CSV string and constructs a DataFrame.
 * Automatically infers column data types unless an explicit schema is provided.
 * @namespace $df
 * @syntax $df.{symbol}(...)
 * @param content The CSV content string.
 * @param [options] Parse and configuration options.
 * @returns DataFrame
 * @example
 * // 1. Parse standard comma-separated values:
 * <!-- doc:base_2x2 -->
 * $df.readCsv("a,b\n1,x\n2,y");
 * // shape: (2, 2)
 * // +---+---+
 * // | a | b |
 * // +---+---+
 * // | 1 | x |
 * // | 2 | y |
 * // +---+---+
 *
 * @example
 * // 2. Parse delimited text with custom separator options:
 * <!-- doc:base_2x2 -->
 * $df.readCsv("a;b\n10;20\n30;40", { separator: ";" });
 * // shape: (2, 2)
 * // +----+----+
 * // | a  | b  |
 * // +----+----+
 * // | 10 | 20 |
 * // | 30 | 40 |
 * // +----+----+
 */
export function readCsv<T extends RowRecord = RowRecord>(
    content: string,
    options: ReadCSVOptions = {}
): DataFrame<T> {
    const {
        hasHeader = true,
        schema,
        inferSchema = true,
    } = options;

    const rows = parseCSV(content, options);
    const totalRows = rows.length;
    if (totalRows === 0) return new DataFrame<T>({} as DataFrameDataArg<T>);

    const startRow = hasHeader ? 1 : 0;
    const numRows = totalRows - startRow;
    const firstRow = rows[0];
    const numCols = firstRow.length;

    const coercedColumns: ColumnDict = {};
    for (let c = 0; c < numCols; c++) {
        const colName = hasHeader ? firstRow[c] : `column_${c}`;
        const rawValues = new Array(numRows);
        for (let r = 0; r < numRows; r++) {
            const val = rows[r + startRow][c];
            rawValues[r] = val !== undefined ? val : "";
        }
        coercedColumns[colName] = (!schema?.[colName] && inferSchema)
            ? inferAndCoerceCSVColumn(rawValues, options).values
            : rawValues;
    }

    return new DataFrame<T>(coercedColumns as DataFrameDataArg<T>, schema);
}
