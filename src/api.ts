import { DataTypeRegistry } from "./datatypes";
import {
    all,
    coalesce,
    col,
    concat,
    data,
    duration,
    element,
    exclude,
    horizontal,
    implode,
    lit,
    readCsv,
    readJson,
    seqRange,
    struct,
    when
} from "./functions";

export const $df = {
    all,
    coalesce,
    col,
    concat,
    data,
    duration,
    element,
    exclude,
    horizontal,
    implode,
    lit,
    readCsv,
    readJson,
    seqRange,
    struct,
    when,
    ...DataTypeRegistry,
};
