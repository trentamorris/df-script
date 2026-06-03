import { DataFrame } from "./dataframe"
import { ColumnExpr, lit, all, exclude, coalesce, when } from "./columnExpressions"
import { DataTypeRegistry } from "./datatypes"
import { concat } from "./functions"
import type { RowRecord, DataFrameSchema } from "./types"

export const $tbl = {
    data: <T extends RowRecord>(data: T[], schema?: DataFrameSchema) => new DataFrame(data, schema),
    col: <T = any>(name: keyof T | string) => new ColumnExpr<T>(name),
    all,
    exclude,
    coalesce,
    concat,
    lit,
    when,
    DataType: DataTypeRegistry
};