import { ColumnExpr } from "../ColumnExpr";
import { LITERAL_MARKER } from "../constants";
import { ShapeError } from "../../exceptions";
import type { RegisteredDataType, FlattenUnion } from "../../types";
import { clamp, fillSequence, CumulativeStepContext, IndependentStepContext } from "../../utils";

export type SeqRangeOptions = {
    n?: number;
    dtype?: RegisteredDataType;
    name?: string;
} & (
    | { mode: "constant" }
    | {
          mode?: "cumulative";
          step?: number | ((context: CumulativeStepContext) => any);
      }
    | {
          mode: "independent";
          step?: number | ((context: IndependentStepContext) => any);
      }
) & (
    | { strict?: true }
    | {
        strict: false;
        pad?: boolean;
        truncate?: boolean;
        padValue?: any;
        startIndex?: number;
        endIndex?: number;
      }
);

/**
 * Creates a column expression that generates a range of values.
 * If mode is "cumulative" (default) or "independent", it generates a sequence.
 * If mode is "constant", it repeats the given value.
 */
export function seq_range(
    value: any,
    options: SeqRangeOptions = { strict: true }
): ColumnExpr<any> {
    const opts = options as FlattenUnion<SeqRangeOptions>;

    const expr = new ColumnExpr(LITERAL_MARKER);
    expr.literalValue = value;


    if (opts.name) {
        expr.outputName = opts.name;
    }

    expr.ops.push((vArray) => {
        const targetHeight = vArray.length;

        const getIdx = (val: number | undefined, def: number) => {
            if (val === undefined) return def;
            return clamp(val < 0 ? targetHeight + val : val, { min: 0, max: targetHeight });
        };
        const safeStart = getIdx(opts.startIndex, 0);
        const safeEnd = getIdx(opts.endIndex, targetHeight);

        const sliceWidth = Math.max(0, safeEnd - safeStart);
        const specifiedHeight = opts.n !== undefined ? opts.n : sliceWidth;
        const strict = opts.strict !== false;

        if (strict) {
            if (specifiedHeight !== targetHeight) {
                throw new ShapeError(
                    `Column height mismatch: seq_range length ${specifiedHeight} does not match DataFrame height ${targetHeight}`
                );
            }
        } else {
            const pad = opts.pad ?? false;
            const truncate = opts.truncate ?? false;

            if (pad && !truncate && specifiedHeight > sliceWidth) {
                throw new ShapeError(
                    `Cannot pad seq_range output: specified length ${specifiedHeight} starting at index ${safeStart} exceeds slice width ${sliceWidth} (requires truncation).`
                );
            }
            if (truncate && !pad && specifiedHeight < sliceWidth) {
                throw new ShapeError(
                    `Cannot truncate seq_range output: specified length ${specifiedHeight} starting at index ${safeStart} is less than slice width ${sliceWidth} (requires padding).`
                );
            }
        }

        const finalHeight = targetHeight;
        const hasDtype = !!opts.dtype;
        const mode = opts.mode || "cumulative";
        const step = opts.step !== undefined ? opts.step : 1;

        const coerceVal = hasDtype
            ? (val: any) => opts.dtype!.coerce(val)
            : (val: any) => val;

        if (strict) {
            const result = opts.dtype?.allocate
                ? opts.dtype.allocate(finalHeight)
                : new Array(finalHeight);
            fillSequence(result, value, {
                mode,
                step,
                coerce: coerceVal,
                startIndex: 0,
                endIndex: finalHeight
            } as any);
            return result;
        }

        // Non-strict mode path:
        const repeatEnd = Math.min(safeStart + specifiedHeight, safeEnd);
        const rawFill = opts.padValue !== undefined ? opts.padValue : null;
        const coercedFill = coerceVal(rawFill);

        // Fast-path optimization for simple constant lit/repeat operations
        if (mode === "constant" && safeStart === 0 && repeatEnd === finalHeight && !opts.dtype) {
            const result = new Array(finalHeight);
            for (let i = 0; i < finalHeight; i++) {
                result[i] = value;
            }
            return result;
        }

        const result = new Array(finalHeight);
        result.fill(coercedFill);
        fillSequence(result, value, {
            mode,
            step,
            coerce: coerceVal,
            startIndex: safeStart,
            endIndex: repeatEnd
        } as any);

        return result;
    });

    return expr;
}
