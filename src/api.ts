import { DataFrame } from "./dataframe"
import { ColumnExpr, lit, all, exclude, coalesce, when } from "./columnExpressions"
import { DataType, DataTypeRegistry } from "./datatypes"
import { concat } from "./functions"

export const $tbl = {
    data: <T extends Record<string, any>>(data: T[], schema?: Record<string, DataType>) => new DataFrame(data, schema),
    col: <T = any>(name: keyof T | string) => new ColumnExpr<T>(name),
    all,
    exclude,
    coalesce,
    concat,
    lit,
    when,
    DataType: DataTypeRegistry
};