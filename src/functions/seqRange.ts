import { ColumnExpr } from "../columnExpressions/columnExpr";
import { LITERAL_MARKER } from "../columnExpressions/constants";
import { ShapeError } from "../exceptions";

import { clamp, fillSequence } from "../utils";
import type { SeqRangeOptions } from "./types";


/**
 * Creates a column expression that generates a range of values.
 * If mode is "cumulative" (default) or "independent", it generates a sequence.
 * If mode is "constant", it repeats the given value.
 *
 * @param value The initial value to start the sequence or the constant value to repeat.
 * @param [options] Configuration options.
 * @returns {ColumnExpr<any>} A column expression generating the sequence.
 * @namespace $df
 * @category Function
 * @syntax $df.{symbol}(...)
 * @example
 * <!-- doc:base_numbers_3x1 -->
 * >>> df.select($df.seqRange(1, { step: 2 }).alias("odd"))
 * shape: (3, 1)
 * +-----+
 * | odd |
 * +-----+
 * | 1   |
 * | 3   |
 * | 5   |
 * +-----+
 */
export function seqRange(
    value: any,
    options: SeqRangeOptions = { strict: true }
): ColumnExpr<any> {
    const opts = options;
    const expr = new ColumnExpr(LITERAL_MARKER);
    expr._literalValue = value;

    if (opts.name) expr._outputName = opts.name;

    expr._ops.push((vArray) => {
        const targetHeight = vArray.length;
        const strict = opts.strict !== false;

        const getIdx = (val: number | undefined, def: number) =>
            val === undefined ? def : clamp(val < 0 ? targetHeight + val : val, { min: 0, max: targetHeight });

        const safeStart = getIdx(opts.startIndex, 0);
        const safeEnd = getIdx(opts.endIndex, targetHeight);
        const sliceWidth = Math.max(0, safeEnd - safeStart);
        const specifiedHeight = opts.n !== undefined ? opts.n : sliceWidth;

        if (strict) {
            if (specifiedHeight !== targetHeight) {
                throw new ShapeError(`Column height mismatch: ${specifiedHeight} !== ${targetHeight}`);
            }
        } else {
            const pad = opts.pad ?? false;
            const truncate = opts.truncate ?? false;

            if (pad && !truncate && specifiedHeight > sliceWidth) {
                throw new ShapeError(`Cannot pad seqRange: length ${specifiedHeight} exceeds slice width ${sliceWidth}`);
            }
            if (truncate && !pad && specifiedHeight < sliceWidth) {
                throw new ShapeError(`Cannot truncate seqRange: length ${specifiedHeight} is less than slice width ${sliceWidth}`);
            }
        }

        const mode = opts.mode || "cumulative";
        const step = opts.step !== undefined ? opts.step : 1;
        const coerceVal = opts.dtype ? (val: any) => opts.dtype!.coerce(val) : (val: any) => val;
        const coercedFill = coerceVal(!strict && opts.padValue !== undefined ? opts.padValue : null);

        const result = (strict && opts.dtype?.allocate)
            ? opts.dtype.allocate(targetHeight)
            : new Array(targetHeight).fill(coercedFill);

        fillSequence(result, value, {
            mode,
            step,
            coerce: coerceVal,
            startIndex: strict ? 0 : safeStart,
            endIndex: strict ? targetHeight : Math.min(safeStart + specifiedHeight, safeEnd)
        } as any);

        return result;
    });

    return expr;
}
