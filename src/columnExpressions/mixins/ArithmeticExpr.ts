import type { IExpr } from "../../types"
import type { ExprConstructor } from "../types"
import { derive, kleeneUnary, kleeneBinary } from "../ExprBase"
import { clamp, mulberry32 } from "../../utils"

export const ArithmeticExpr = <TBase extends ExprConstructor>(Base: TBase) => {
    return class extends Base {
        abs() {
            return derive(this, kleeneUnary((v) => Math.abs(v)));
        }

        acos() {
            return derive(this, kleeneUnary((v) => (v < -1 || v > 1) ? null : Math.acos(v)));
        }

        acosh() {
            return derive(this, kleeneUnary((v) => v < 1 ? null : Math.acosh(v)));
        }

        add(val: number | IExpr | null) {
            return derive(this, kleeneBinary(this, val, (v, r) => v + r));
        }

        asin() {
            return derive(this, kleeneUnary((v) => (v < -1 || v > 1) ? null : Math.asin(v)));
        }

        asinh() {
            return derive(this, kleeneUnary(Math.asinh));
        }

        atan() {
            return derive(this, kleeneUnary(Math.atan));
        }

        atanh() {
            return derive(this, kleeneUnary((v) => (v <= -1 || v >= 1) ? null : Math.atanh(v)));
        }

        cbrt() {
            return derive(this, kleeneUnary(Math.cbrt));
        }

        ceil() {
            return derive(this, kleeneUnary(Math.ceil));
        }

        clip(lower: number | null = null, upper: number | null = null) {
            return derive(this, kleeneUnary((v) => {
                if (lower !== null && upper !== null) {
                    return clamp({ val: v, min: lower, max: upper });
                } else if (lower !== null) {
                    return Math.max(v, lower);
                } else if (upper !== null) {
                    return Math.min(v, upper);
                }
                return v;
            }));
        }

        cos() {
            return derive(this, kleeneUnary(Math.cos));
        }

        cosh() {
            return derive(this, kleeneUnary(Math.cosh));
        }

        degrees() {
            return derive(this, kleeneUnary((v) => v * (180 / Math.PI)));
        }

        div(val: number | IExpr | null) {
            return derive(this, kleeneBinary(this, val, (v, r) => r === 0 ? null : v / r));
        }

        exp() {
            return derive(this, kleeneUnary(Math.exp));
        }

        expm1() {
            return derive(this, kleeneUnary(Math.expm1));
        }

        floor() {
            return derive(this, kleeneUnary(Math.floor));
        }

        floordiv(val: number | IExpr | null) {
            return derive(this, kleeneBinary(this, val, (v, r) => r === 0 ? null : Math.floor(v / r)));
        }

        hypot(val: number | IExpr | null) {
            return derive(this, kleeneBinary(this, val, (v, r) => Math.hypot(v, r)));
        }

        log(base: number = Math.E) {
            return derive(this, kleeneUnary((v) => v <= 0 ? null : (base === Math.E ? Math.log(v) : Math.log(v) / Math.log(base))));
        }

        log1p() {
            return derive(this, kleeneUnary((v) => v <= -1 ? null : Math.log1p(v)));
        }

        mod(val: number | IExpr | null) {
            return derive(this, kleeneBinary(this, val, (v, r) => r === 0 ? null : v % r));
        }

        mul(val: number | IExpr | null) {
            return derive(this, kleeneBinary(this, val, (v, r) => v * r));
        }

        negate() {
            return derive(this, kleeneUnary((v) => -v));
        }

        pow(val: number | IExpr | null) {
            return derive(this, kleeneBinary(this, val, (v, r) => Math.pow(v, r)));
        }

        radians() {
            return derive(this, kleeneUnary((v) => v * (Math.PI / 180)));
        }

        round(decimals: number = 0) {
            const factor = Math.pow(10, decimals);
            return derive(this, kleeneUnary((v) => Math.round(v * factor) / factor));
        }

        sin() {
            return derive(this, kleeneUnary(Math.sin));
        }

        sinh() {
            return derive(this, kleeneUnary(Math.sinh));
        }

        sign() {
            return derive(this, kleeneUnary(Math.sign));
        }

        sqrt() {
            return derive(this, kleeneUnary((v) => v < 0 ? null : Math.sqrt(v)));
        }

        sub(val: number | IExpr | null) {
            return derive(this, kleeneBinary(this, val, (v, r) => v - r));
        }

        tan() {
            return derive(this, kleeneUnary(Math.tan));
        }

        tanh() {
            return derive(this, kleeneUnary(Math.tanh));
        }

        trunc() {
            return derive(this, kleeneUnary(Math.trunc));
        }

        rand(seed?: number) {
            return derive(this, (vArray) => {
                const len = vArray.length;
                const out = new Float64Array(len);
                if (seed !== undefined) {
                    const rnd = mulberry32(seed);
                    for (let i = 0; i < len; i++) {
                        out[i] = rnd();
                    }
                } else {
                    for (let i = 0; i < len; i++) {
                        out[i] = Math.random();
                    }
                }
                return out;
            });
        }
    }
}

