import { DataFrame } from "./dataframe"
import { ColumnExpr, lit, all, exclude, coalesce, when } from "./columnExpressions"
import { DataTypeRegistry } from "./datatypes"
import { concat } from "./functions"
import type { RowRecord, DataFrameSchema, ColumnDict } from "./types"

export const $df = {
    data: <T extends RowRecord = any>(data: T[] | ColumnDict, schema?: DataFrameSchema) => new DataFrame<T>(data, schema),
    col: <T = any>(name: keyof T | string) => new ColumnExpr<T>(name),
    all,
    exclude,
    coalesce,
    concat,
    lit,
    when,
    DataType: DataTypeRegistry
};