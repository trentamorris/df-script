import { DataFrame } from "../dataframe/dataframe";
import type { ReadCSVOptions } from "../dataframe/types";
import type { ColumnDict, RowRecord } from "../types";
import { parseCSV, inferAndCoerceCSVColumn } from "../utils";

/**
 * Reads a CSV string and constructs a DataFrame.
 * Automatically infers column data types unless an explicit schema is provided.
 */
export function read_csv<T extends RowRecord = any>(
    content: string,
    options: ReadCSVOptions = {}
): DataFrame<T> {
    const {
        hasHeader = true,
        schema,
        inferSchema = true,
    } = options;

    const rows = parseCSV(content, options);

    if (rows.length === 0) {
        return new DataFrame<T>({} as any);
    }

    let headers: string[];
    let dataRows: string[][];

    if (hasHeader) {
        headers = rows[0];
        dataRows = rows.slice(1);
    } else {
        headers = rows[0].map((_, i) => `column_${i}`);
        dataRows = rows;
    }

    const numCols = headers.length;
    const numRows = dataRows.length;

    const columns: Record<string, string[]> = {};
    for (let c = 0; c < numCols; c++) {
        const colName = headers[c];
        const colData = new Array(numRows);
        for (let r = 0; r < numRows; r++) {
            colData[r] = dataRows[r][c] !== undefined ? dataRows[r][c] : "";
        }
        columns[colName] = colData;
    }

    const coercedColumns: ColumnDict = {};

    for (let c = 0; c < numCols; c++) {
        const colName = headers[c];
        const rawValues = columns[colName];

        if (schema && schema[colName]) {
            coercedColumns[colName] = rawValues;
        } else if (inferSchema) {
            const { values } = inferAndCoerceCSVColumn(rawValues, options);
            coercedColumns[colName] = values;
        } else {
            coercedColumns[colName] = rawValues;
        }
    }

    return new DataFrame<T>(coercedColumns as any, schema);
}
