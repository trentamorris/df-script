/** @internalfile */
import type { IExpr, ColumnData, ColumnDict, RegisteredDataType, DataFrameSchema, RowRecord } from "../types"
import type { JoinOptions, AsofJoinOptions } from "./types"
import { DataFrame } from "./dataframe"
import { DataTypeRegistry } from "../datatypes"
import { KEY_SEPARATOR, UNMATCHED_ROW_INDEX } from "../constants"
import { isObj, isTypedArray, toCanonicalString, isArrayOrTypedArray, isValidDateObj, computeCartesianProduct, toValidNumber, isValidNumber, binarySearch } from "../utils"
import { assertColumnExists, IOStreamError, InvalidArgumentError } from "../exceptions"

function partition_by_columns(
    columns: ColumnDict,
    height: number,
    partitionKeys: (string | IExpr)[]
): Map<string, number[]> {
    const partitionMap = new Map<string, number[]>();

    const pKeysLen = partitionKeys.length;
    const keyColumns = new Array(pKeysLen);
    for (let i = 0; i < pKeysLen; i++) {
        const pKey = partitionKeys[i];
        if (typeof pKey === "string") {
            assertColumnExists(pKey, columns, "Partition key", " in the DataFrame.");
            keyColumns[i] = columns[pKey];
        } else {
            keyColumns[i] = pKey.evaluate(columns, height);
        }
    }

    if (pKeysLen === 1) {
        const keyCol = keyColumns[0];
        for (let i = 0; i < height; i++) {
            const val = keyCol[i];
            const hash = val == null ? "" : toCanonicalString(val);
            let group = partitionMap.get(hash);
            if (group === undefined) {
                group = [];
                partitionMap.set(hash, group);
            }
            group.push(i);
        }
        return partitionMap;
    }

    for (let i = 0; i < height; i++) {
        const keyValues = new Array(pKeysLen);
        for (let j = 0; j < pKeysLen; j++) {
            const val = keyColumns[j][i];
            keyValues[j] = val == null ? "" : toCanonicalString(val);
        }
        const hash = keyValues.join(KEY_SEPARATOR);
        let group = partitionMap.get(hash);
        if (group === undefined) {
            group = [];
            partitionMap.set(hash, group);
        }
        group.push(i);
    }
    return partitionMap;
}

export function resolveWindowExpr(expr: IExpr, columns: ColumnDict, height: number): ColumnData {
    const results = new Array(height);
    if (height === 0) return results;

    const partitionKeys = expr._partitionBy || [];
    const partitionGroups = partition_by_columns(columns, height, partitionKeys);

    const prePartitionArray = expr._evaluatePre(expr._partitionOpsIndex, columns, height);

    for (const indices of partitionGroups.values()) {
        const groupLen = indices.length;
        const groupPreValues = new Array(groupLen);
        for (let k = 0; k < groupLen; k++) {
            groupPreValues[k] = prePartitionArray[indices[k]];
        }

        if (expr._evaluateWindow) {
            for (let k = 0; k < groupLen; k++) {
                results[indices[k]] = expr._evaluateWindow(groupPreValues, indices, k);
            }
            continue;
        }

        if (expr._aggFn) {
            const aggregatedVal = expr._aggFn(groupPreValues);
            for (let k = 0; k < groupLen; k++) {
                results[indices[k]] = aggregatedVal;
            }
            continue;
        }

        for (let k = 0; k < groupLen; k++) {
            results[indices[k]] = prePartitionArray[indices[k]];
        }
    }

    return expr._evaluatePost(expr._partitionOpsIndex, results, columns);
}

export function rowsToColumns(rows: any[]): { columns: ColumnDict; height: number } {
    if (!Array.isArray(rows) || rows.length === 0) {
        return { columns: {}, height: 0 };
    }
    const height = rows.length;
    const keysSet = new Set<string>();
    for (let r = 0; r < height; r++) {
        const row = rows[r];
        if (isObj(row)) {
            const rowKeys = Object.keys(row);
            for (let i = 0; i < rowKeys.length; i++) {
                keysSet.add(rowKeys[i]);
            }
        }
    }
    const keys = Array.from(keysSet);
    const columns: Record<string, any[]> = {};
    for (let i = 0; i < keys.length; i++) {
        columns[keys[i]] = new Array(height);
    }
    for (let r = 0; r < height; r++) {
        const row = rows[r] || {};
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            const val = row[k];
            columns[k][r] = val === undefined ? null : val;
        }
    }
    return { columns, height };
}

export function columnsToRows(columns: ColumnDict, height: number): any[] {
    const keys = Object.keys(columns);
    const rows = new Array(height);
    for (let r = 0; r < height; r++) {
        const row: any = {};
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            const val = columns[k][r];
            row[k] = val === undefined ? null : val;
        }
        rows[r] = row;
    }
    return rows;
}

export function getRowFromColumns(columns: ColumnDict, idx: number, keys: string[]): any {
    const row: any = {};
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const val = columns[k][idx];
        row[k] = val === undefined ? null : val;
    }
    return row;
}

export function inferColumnType(col: ColumnData): RegisteredDataType {
    if (col.length === 0) return DataTypeRegistry.Utf8;
    let isBoolean = true;
    let isInteger = true;
    let isNumeric = true;
    let isBigInt = true;
    let isDate = true;
    let isArrayVal = true;
    let isBinary = true;
    let isObject = true;
    let hasDateObj = false;
    let hasNonNull = false;
    const allArrayElements: any[] = [];

    for (let i = 0; i < col.length; i++) {
        const val = col[i];
        if (val == null) continue;
        hasNonNull = true;

        if (!(val instanceof Uint8Array)) {
            isBinary = false;
        }

        if (!isArrayOrTypedArray(val) || val instanceof Uint8Array) {
            isArrayVal = false;
        } else {
            const valArr = val as any;
            const subLen = valArr.length;
            for (let j = 0; j < subLen; j++) {
                allArrayElements.push(valArr[j]);
            }
        }
        if (isValidDateObj(val)) hasDateObj = true;
        if (typeof val !== "boolean") isBoolean = false;
        if (typeof val !== "bigint") isBigInt = false;
        if (typeof val !== "number") {
            isNumeric = false;
            isInteger = false;
        } else {
            if (!Number.isInteger(val)) isInteger = false;
        }
        if (!isValidDateObj(val) && (typeof val !== "string" || isNaN(Date.parse(val)))) {
            isDate = false;
        }
        if (!isObj(val) || val instanceof Uint8Array) {
            isObject = false;
        }
    }

    if (!hasNonNull) return DataTypeRegistry.Null;
    if (isBinary) return DataTypeRegistry.Binary;
    if (isArrayVal) {
        const innerType = inferColumnType(allArrayElements);
        return DataTypeRegistry.Array(innerType);
    }
    if (isBoolean) return DataTypeRegistry.Boolean;
    if (isBigInt) return DataTypeRegistry.Int64;
    if (isNumeric && !isInteger) return DataTypeRegistry.Float64;
    if (isNumeric && isInteger) {
        let fitsInInt32 = true;
        for (let i = 0; i < col.length; i++) {
            const val = col[i];
            if (val == null) continue;
            if (val < -2147483648 || val > 2147483647) {
                fitsInInt32 = false;
                break;
            }
        }
        return fitsInInt32 ? DataTypeRegistry.Int32 : DataTypeRegistry.Float64;
    }
    if (isDate && hasDateObj) return DataTypeRegistry.Datetime;
    if (isObject) return DataTypeRegistry.Object;
    return DataTypeRegistry.Utf8;
}

export function gatherColumnsByIndices(columns: ColumnDict, indices: number[]): ColumnDict {
    const keys = Object.keys(columns);
    const numKeys = keys.length;
    const newHeight = indices.length;
    const res: ColumnDict = {};
    for (let j = 0; j < numKeys; j++) {
        const k = keys[j];
        const oldCol = columns[k];
        const newCol = isTypedArray(oldCol)
            ? new (oldCol.constructor as any)(newHeight)
            : new Array(newHeight);
        for (let idx = 0; idx < newHeight; idx++) {
            newCol[idx] = oldCol[indices[idx]];
        }
        res[k] = newCol;
    }
    return res;
}

/**
 * Computes a hash string for a row at the given index, using one or more column keys.
 * Includes a single-key fast path to avoid array allocation and join overhead.
 */
export function computeRowHash(columns: ColumnDict, keys: string[], rowIndex: number): string {
    const len = keys.length;
    if (len === 1) {
        return toCanonicalString(columns[keys[0]][rowIndex]);
    }
    const vals = new Array(len);
    for (let i = 0; i < len; i++) {
        vals[i] = toCanonicalString(columns[keys[i]][rowIndex]);
    }
    return vals.join(KEY_SEPARATOR);
}

export function coerceColumn(col: ColumnData, type: RegisteredDataType, height: number): ColumnData {
    let newCol: any = type.allocate ? type.allocate(height) : new Array(height);
    const isTyped = isTypedArray(newCol);
    if (isTyped) {
        const typedCol = newCol as any;
        for (let i = 0; i < height; i++) {
            const coerced = type.coerce(col[i]);
            if (coerced == null) {
                const fallback = new Array(height);
                for (let j = 0; j < i; j++) {
                    fallback[j] = typedCol[j];
                }
                fallback[i] = null;
                for (let j = i + 1; j < height; j++) {
                    fallback[j] = type.coerce(col[j]);
                }
                return fallback;
            }
            typedCol[i] = coerced;
        }
    } else {
        for (let i = 0; i < height; i++) {
            newCol[i] = type.coerce(col[i]);
        }
    }
    return newCol;
}

export function writeStringToFileOrStream(
    file: string | { write: (str: string) => void } | undefined,
    content: string
): void {
    if (!file) return;
    if (typeof file === "string") {
        if (typeof require !== "function") {
            throw new IOStreamError("File writing is not supported in this environment (missing require('fs')).");
        }
        const fs = require("fs");
        fs.writeFileSync(file, content, "utf8");
    } else if (isObj(file) && typeof (file as any).write === "function") {
        (file as any).write(content);
    } else {
        throw new InvalidArgumentError("Invalid file argument. Expected a file path string or a writable stream/object with a write method.");
    }
}

/**
 * Generic key-alignment engine computing positional row index mappings (leftIndex <-> rightIndex)
 * between two columnar datasets based on key hashing.
 * Reusable for Joins, Set Operations (Intersect/Difference), Upserts, and Alignments.
 */
export function alignKeyIndices(
    leftCols: ColumnDict,
    rightCols: ColumnDict,
    leftHeight: number,
    rightHeight: number,
    leftKeys: string[],
    rightKeys: string[],
    options: Partial<JoinOptions> = {}
): { leftIndices: number[]; rightIndices: (number | null)[] } {
    const { how = "inner", join_nulls = false, maintain_order } = options;

    const getRowHashAt = (cols: ColumnDict, keys: string[], idx: number): string | null => {
        if (!join_nulls) {
            for (let i = 0; i < keys.length; i++) {
                if (cols[keys[i]][idx] == null) return null;
            }
        }
        return computeRowHash(cols, keys, idx);
    };

    // 1b. Fast path for Cross join (Cartesian product)
    if (how === "cross") {
        return computeCartesianProduct(leftHeight, rightHeight);
    }

    // 1. Build hash table for right DataFrame
    const rightHash = new Map<string, number[]>();
    for (let i = 0; i < rightHeight; i++) {
        const hash = getRowHashAt(rightCols, rightKeys, i);
        if (hash === null) continue;
        let list = rightHash.get(hash);
        if (list === undefined) {
            list = [];
            rightHash.set(hash, list);
        }
        list.push(i);
    }

    const leftIndices: number[] = [];
    const rightIndices: (number | null)[] = [];

    // 2. Fast path for Semi & Anti joins (returns matching left row indices only)
    if (how === "semi" || how === "anti") {
        for (let i = 0; i < leftHeight; i++) {
            const hash = getRowHashAt(leftCols, leftKeys, i);
            const matches = hash === null ? undefined : rightHash.get(hash);
            const hasMatch = matches !== undefined && matches.length > 0;

            if ((how === "semi" && hasMatch) || (how === "anti" && !hasMatch)) {
                leftIndices.push(i);
                rightIndices.push(null);
            }
        }
        return { leftIndices, rightIndices };
    }

    // 3. Handle Inner, Left, Right, and Outer index alignment
    const trackRight = how === "outer" || how === "right";
    const matchedRightIndices = trackRight ? new Set<number>() : null;

    for (let i = 0; i < leftHeight; i++) {
        const hash = getRowHashAt(leftCols, leftKeys, i);
        const matches = hash === null ? undefined : rightHash.get(hash);

        if (matches === undefined) {
            if (how === "left" || how === "outer") {
                leftIndices.push(i);
                rightIndices.push(null);
            }
        } else {
            for (let m = 0; m < matches.length; m++) {
                const rIdx = matches[m];
                if (trackRight) matchedRightIndices!.add(rIdx);
                leftIndices.push(i);
                rightIndices.push(rIdx);
            }
        }
    }

    // 4. Append unmatched right rows for Right & Outer alignments
    if (trackRight) {
        for (let j = 0; j < rightHeight; j++) {
            if (!matchedRightIndices!.has(j)) {
                leftIndices.push(UNMATCHED_ROW_INDEX);
                rightIndices.push(j);
            }
        }
    }

    // 5. Apply maintain_order sorting if requested
    const orderStrategy = maintain_order || "none";

    // Fast-path: "left" (and "none") are naturally emitted in left-table row order!
    if (orderStrategy === "none" || orderStrategy === "left") {
        return { leftIndices, rightIndices };
    }

    const len = leftIndices.length;
    // Flat index array to avoid object allocations
    const perm = new Int32Array(len);
    for (let idx = 0; idx < len; idx++) perm[idx] = idx;

    const getL = (i: number) => leftIndices[i] === UNMATCHED_ROW_INDEX ? Number.MAX_SAFE_INTEGER : leftIndices[i];
    const getR = (i: number) => rightIndices[i] ?? Number.MAX_SAFE_INTEGER;

    if (orderStrategy === "right") {
        perm.sort((a, b) => (getR(a) - getR(b)) || (a - b));
    } else if (orderStrategy === "left_right") {
        perm.sort((a, b) => (getL(a) - getL(b)) || (getR(a) - getR(b)) || (a - b));
    } else if (orderStrategy === "right_left") {
        perm.sort((a, b) => (getR(a) - getR(b)) || (getL(a) - getL(b)) || (a - b));
    }

    const sortedLeft = new Array(len);
    const sortedRight = new Array(len);
    for (let idx = 0; idx < len; idx++) {
        const p = perm[idx];
        sortedLeft[idx] = leftIndices[p];
        sortedRight[idx] = rightIndices[p];
    }
    return { leftIndices: sortedLeft, rightIndices: sortedRight };
}

export function alignAsofIndices(
    leftCols: ColumnDict,
    rightCols: ColumnDict,
    leftHeight: number,
    rightHeight: number,
    leftOnKey: string,
    rightOnKey: string,
    leftByKeys: string[],
    rightByKeys: string[],
    options: AsofJoinOptions = {} as AsofJoinOptions
): { leftIndices: number[]; rightIndices: (number | null)[] } {
    const strategy = options.strategy ?? "backward";
    const allowExactMatches = options.allow_exact_matches ?? true;
    const checkSorted = options.check_sorted ?? true;

    assertColumnExists(leftOnKey, leftCols, "Join on key", " in the left DataFrame.");
    assertColumnExists(rightOnKey, rightCols, "Join on key", " in the right DataFrame.");

    const leftOnCol = leftCols[leftOnKey];
    const rightOnCol = rightCols[rightOnKey];

    if (checkSorted) {
        const assertSorted = (col: ColumnData, height: number, colName: string, side: string) => {
            for (let i = 1; i < height; i++) {
                const prev = toValidNumber(col[i - 1]);
                const curr = toValidNumber(col[i]);
                if (isValidNumber(prev) && isValidNumber(curr) && curr < prev) {
                    throw new InvalidArgumentError(`${side} DataFrame key column "${colName}" is not sorted in ascending order at row ${i}.`);
                }
            }
        };
        assertSorted(leftOnCol, leftHeight, leftOnKey, "left");
        assertSorted(rightOnCol, rightHeight, rightOnKey, "right");
    }

    const hasBy = leftByKeys.length > 0;
    const rightByMap = new Map<string, number[]>();
    if (hasBy) {
        for (let j = 0; j < rightHeight; j++) {
            const hash = computeRowHash(rightCols, rightByKeys, j);
            let group = rightByMap.get(hash);
            if (!group) {
                group = [];
                rightByMap.set(hash, group);
            }
            group.push(j);
        }
    }

    const allRightCandidates: number[] = new Array(rightHeight);
    if (!hasBy) {
        for (let c = 0; c < rightHeight; c++) allRightCandidates[c] = c;
    }

    const leftIndices: number[] = new Array(leftHeight);
    const rightIndices: (number | null)[] = new Array(leftHeight);

    const matchCandidate = (leftVal: number, candidates: number[]): number | null => {
        const len = candidates.length;
        if (len === 0) return null;

        const getVal = (_: number, c: number) => toValidNumber(rightOnCol[c]) ?? NaN;

        if (strategy === "backward") {
            const pos = binarySearch(candidates, leftVal, { side: allowExactMatches ? "right" : "left", getValue: getVal }) - 1;
            return pos >= 0 ? candidates[pos] : null;
        }
        if (strategy === "forward") {
            const pos = binarySearch(candidates, leftVal, { side: allowExactMatches ? "left" : "right", getValue: getVal });
            return pos < len ? candidates[pos] : null;
        }
        
        // strategy === "nearest"
        const pos = binarySearch(candidates, leftVal, { side: "right", getValue: getVal });
        let bIdx = pos - 1, fIdx = pos;
        if (!allowExactMatches) {
            if (bIdx >= 0 && getVal(bIdx, candidates[bIdx]) === leftVal) bIdx--;
            if (fIdx < len && getVal(fIdx, candidates[fIdx]) === leftVal) fIdx++;
        }
        if (bIdx < 0) return fIdx < len ? candidates[fIdx] : null;
        if (fIdx >= len) return bIdx >= 0 ? candidates[bIdx] : null;
        const bVal = getVal(bIdx, candidates[bIdx]);
        const fVal = getVal(fIdx, candidates[fIdx]);
        return Math.abs(leftVal - bVal) <= Math.abs(leftVal - fVal) ? candidates[bIdx] : candidates[fIdx];
    };

    const tol = options.tolerance !== undefined ? toValidNumber(options.tolerance) : null;

    for (let i = 0; i < leftHeight; i++) {
        leftIndices[i] = i;
        const leftVal = toValidNumber(leftOnCol[i]);

        if (!isValidNumber(leftVal)) {
            rightIndices[i] = null;
            continue;
        }

        const candidates = hasBy
            ? (rightByMap.get(computeRowHash(leftCols, leftByKeys, i)) || [])
            : allRightCandidates;

        if (candidates.length === 0) {
            rightIndices[i] = null;
            continue;
        }

        let matchedRIdx = matchCandidate(leftVal, candidates);

        if (matchedRIdx !== null && tol !== null) {
            const rVal = toValidNumber(rightOnCol[matchedRIdx]);
            if (!isValidNumber(tol) || !isValidNumber(rVal) || Math.abs(leftVal - rVal) > tol) {
                matchedRIdx = null;
            }
        }

        rightIndices[i] = matchedRIdx;
    }

    return { leftIndices, rightIndices };
}

export function materializeJoinedDataFrame<R extends RowRecord = any>(
    leftCols: ColumnDict,
    rightCols: ColumnDict,
    leftSchema: DataFrameSchema,
    rightSchema: DataFrameSchema,
    leftIndices: number[],
    rightIndices: (number | null)[],
    leftKeysStr: string[],
    rightKeysStr: string[],
    options: {
        suffixes?: [string, string];
        coalesce?: boolean;
        how?: string;
    } = {}
): DataFrame<R> {
    const [leftSuffix = "", rightSuffix = "_right"] = options.suffixes || [];
    const shouldCoalesce = options.coalesce ?? true;
    const how = options.how || "inner";

    const outHeight = leftIndices.length;
    const newColumns: ColumnDict = {};
    const outSchema: DataFrameSchema = {};
    const leftKeysSet = new Set(leftKeysStr);
    const rightKeysSet = new Set(rightKeysStr);

    const resolveUniqueColumnName = (colName: string, suffix: string): string => {
        const effectiveSuffix = suffix !== "" ? suffix : "_left";
        let candidate = `${colName}${effectiveSuffix}`;
        let counter = 1;
        while (allocatedNames.has(candidate)) {
            candidate = `${colName}${effectiveSuffix}_${counter++}`;
        }
        allocatedNames.add(candidate);
        return candidate;
    };

    const gatherColumnByIndices = (
        col: ColumnData,
        indices: (number | null)[],
        unmatchedSentinel: number = UNMATCHED_ROW_INDEX
    ): ColumnData => {
        const len = indices.length;
        const out = new Array(len);
        for (let r = 0; r < len; r++) {
            const idx = indices[r];
            out[r] = idx !== null && idx !== unmatchedSentinel ? col[idx] : null;
        }
        return out;
    };

    const leftToRightKeyMap = new Map<string, string>();
    for (let i = 0; i < leftKeysStr.length; i++) {
        if (!leftToRightKeyMap.has(leftKeysStr[i])) {
            leftToRightKeyMap.set(leftKeysStr[i], rightKeysStr[i]);
        }
    }

    const allocatedNames = new Set<string>();
    const leftColKeys = Object.keys(leftCols);
    const rightColKeys = Object.keys(rightCols);

    for (let i = 0; i < leftColKeys.length; i++) {
        const k = leftColKeys[i];
        if (!(k in rightCols) || leftKeysSet.has(k) || rightKeysSet.has(k)) {
            allocatedNames.add(k);
        }
    }

    for (let i = 0; i < leftColKeys.length; i++) {
        const k = leftColKeys[i];
        const isLeftJoinKey = leftKeysSet.has(k);

        let targetName: string;
        if (k in rightCols && !isLeftJoinKey && !rightKeysSet.has(k)) {
            if (leftSuffix !== "") {
                allocatedNames.add(k);
                targetName = resolveUniqueColumnName(k, leftSuffix);
            } else if (!allocatedNames.has(k)) {
                targetName = k;
                allocatedNames.add(k);
            } else {
                targetName = resolveUniqueColumnName(k, leftSuffix);
            }
        } else {
            targetName = k;
        }

        const leftCol = leftCols[k];
        const rightK = isLeftJoinKey ? leftToRightKeyMap.get(k) : null;
        const rightCol = rightK ? rightCols[rightK] : null;

        if (isLeftJoinKey && shouldCoalesce) {
            const outCol = new Array(outHeight);
            for (let r = 0; r < outHeight; r++) {
                const lIdx = leftIndices[r];
                const rIdx = rightIndices[r];
                const leftVal = lIdx !== UNMATCHED_ROW_INDEX ? leftCol[lIdx] : null;
                const rightVal = (rIdx !== null && rightCol) ? rightCol[rIdx] : null;
                outCol[r] = leftVal ?? rightVal;
            }
            newColumns[targetName] = outCol;
        } else {
            newColumns[targetName] = gatherColumnByIndices(leftCol, leftIndices);
        }

        if (leftSchema[k]) outSchema[targetName] = leftSchema[k];
        else if (rightK && rightSchema[rightK]) outSchema[targetName] = rightSchema[rightK];
    }

    if (how !== "semi" && how !== "anti") {
        for (let i = 0; i < rightColKeys.length; i++) {
            const k = rightColKeys[i];
            if (shouldCoalesce && rightKeysSet.has(k)) continue;

            let targetName: string;
            if (allocatedNames.has(k)) {
                targetName = resolveUniqueColumnName(k, rightSuffix);
            } else {
                targetName = k;
                allocatedNames.add(k);
            }

            newColumns[targetName] = gatherColumnByIndices(rightCols[k], rightIndices);
            if (rightSchema[k]) outSchema[targetName] = rightSchema[k];
        }
    }

    return DataFrame._createDirect<R>(newColumns, outSchema, outHeight);
}
