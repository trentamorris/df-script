import { ColumnNotFoundError, ShapeError } from "./index";
import type { ColumnDict } from "../types";
import { isArrayOrTypedArray } from "../utils";

export function assertColumnExists(
    columnName: string,
    columns: ColumnDict,
    context: string,
    suffix: string = ""
): void {
    if (!(columnName in columns)) {
        throw new ColumnNotFoundError(columnName, `${context} "${columnName}" does not exist${suffix}`);
    }
}

export function assertHeight(
    columns: ColumnDict,
    height?: number
): number {
    const keys = Object.keys(columns);
    const numKeys = keys.length;
    let expectedHeight = height;

    for (let i = 0; i < numKeys; i++) {
        const key = keys[i];
        const col = columns[key];
        const len = isArrayOrTypedArray(col) ? col.length : 0;
        if (expectedHeight === undefined) {
            expectedHeight = len;
        } else if (len !== expectedHeight) {
            throw new ShapeError(
                `Column height mismatch: Column "${key}" has length ${len}, but DataFrame height is ${expectedHeight}`
            );
        }
    }
    return expectedHeight === undefined ? 0 : expectedHeight;
}

