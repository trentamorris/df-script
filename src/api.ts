import { DataFrame } from "./dataframe"
import { ColumnExpr, lit, all, exclude, coalesce, when, implode, seq_range, element } from "./columnExpressions"

import { DataTypeRegistry, DataType } from "./datatypes"
import { concat } from "./functions"
import type { RowRecord, DataFrameSchema, ColumnDict, InferSchema } from "./types"

function data<S extends DataFrameSchema>(data: any[] | ColumnDict, schema: S): DataFrame<InferSchema<S>>;
function data<T extends RowRecord = any>(data: T[] | ColumnDict, schema?: DataFrameSchema): DataFrame<T>;
function data(data: any[] | ColumnDict, schema?: DataFrameSchema): DataFrame<any> {
    return new DataFrame(data, schema);
}

export const $df = {
    data,
    col: <T = any>(
        name: keyof T | string | (keyof T | string)[] | DataType | Function | (DataType | Function)[]
    ) => new ColumnExpr<T>(name),
    all,
    exclude,
    coalesce,
    concat,
    lit,
    when,
    implode,
    seq_range,
    element,
    DataType: DataTypeRegistry
};
