import { DataFrame } from "../dataframe/dataframe";
import type { ReadJSONOptions } from "../dataframe/types";
import { safeJsonParse, isObj } from "../utils";
import { DataFrameError } from "../exceptions";

/**
 * Parses JSON content (JSON or NDJSON) and loads it into a new DataFrame.
 * @namespace $df
 * @category Function
 * @syntax $df.{symbol}(...)
 * @param content The JSON or NDJSON content string.
 * @param [options] Parse and configuration options.
 * @param [options.format] Input format (`"json"` or `"ndjson"`). Default `"json"`.
 * @param [options.trimBeforeParse] When `true` (default), trims whitespace before parsing.
 * @param [options.schema] Optional column schema to coerce types.
 * @returns A new DataFrame instance populated with the parsed records.
 * @example
 * <!-- doc:base_2x2 -->
 * >>> $df.readJson('[{"a":1,"b":"x"},{"a":2,"b":"y"}]')
 * shape: (2, 2)
 * ┌───┬───┐
 * │ a │ b │
 * ├───┼───┤
 * │ 1 │ x │
 * │ 2 │ y │
 * └───┴───┘
 */
export function readJson(
    content: string,
    {
        format = "json",
        trimBeforeParse = true,
        schema,
        ...parseOpts
    }: ReadJSONOptions = {}
): DataFrame<any> {
    const parsed = safeJsonParse(content, { format, trimBeforeParse, ...parseOpts });
    if (parsed === content) {
        throw new DataFrameError(`Invalid JSON input: must be a valid, non-empty JSON ${format} string.`);
    }
    const parsedData = Array.isArray(parsed) ? parsed : (isObj(parsed) ? [parsed] : []);
    return new DataFrame(parsedData, schema);
}
