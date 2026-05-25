import { DataType as BaseDataType } from "./DataType";
import { Int32 } from "./Int32";
import { Float64 } from "./Float64";
import { Utf8 } from "./Utf8";
import { Boolean } from "./Boolean";
import { Datetime } from "./Datetime";
import { List } from "./List";
import { Struct } from "./Struct";

export { BaseDataType as DataType };

export const DataTypeRegistry = {
    Int32,
    Float64,
    Utf8,
    Boolean,
    Datetime,
    List,
    Struct
};
