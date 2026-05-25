import { DataFrame } from "./dataframe"
import { ColumnExpr, AllColumnsExpr } from "./columnExpressions"
import { DataType, DataTypeRegistry } from "./datatypes"

export const $tbl = {
    data: <T extends Record<string, any>>(data: T[], schema?: Record<string, DataType>) => new DataFrame(data, schema),
    col: <T = any>(name: keyof T | string) => new ColumnExpr<T>(name),
    all: () => new AllColumnsExpr(),
    DataType: DataTypeRegistry
};