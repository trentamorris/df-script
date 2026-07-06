import type { RandomOptions, NumericArg } from "../types"
import { ExprBase, derive } from "../ExprBase"
import { kleeneUnary, kleeneBinary } from "../utils"
import { clamp, isValidNumber, mulberry32, roundToScale } from "../../utils"

export class ArithmeticExpr extends ExprBase {
    abs() {
        return derive(this, kleeneUnary(Math.abs));
    }

    acos() {
        return derive(this, kleeneUnary((v) => (v < -1 || v > 1) ? null : Math.acos(v)));
    }

    acosh() {
        return derive(this, kleeneUnary((v) => v < 1 ? null : Math.acosh(v)));
    }

    add(val: NumericArg) {
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

    atan2(val: NumericArg) {
        return derive(this, kleeneBinary(this, val, Math.atan2));
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
        return derive(this, kleeneUnary((v) => clamp(v, { min: lower, max: upper })));
    }

    copysign(val: NumericArg) {
        return derive(this, kleeneBinary(this, val, (v, r) => Math.abs(v) * (r >= 0 ? 1 : -1)));
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

    div(val: NumericArg) {
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

    floordiv(val: NumericArg) {
        return derive(this, kleeneBinary(this, val, (v, r) => r === 0 ? null : Math.floor(v / r)));
    }

    hypot(val: NumericArg) {
        return derive(this, kleeneBinary(this, val, Math.hypot));
    }

    log(base: number = Math.E) {
        return derive(this, kleeneUnary((v) => v <= 0 ? null : (base === Math.E ? Math.log(v) : Math.log(v) / Math.log(base))));
    }

    log1p() {
        return derive(this, kleeneUnary((v) => v <= -1 ? null : Math.log1p(v)));
    }

    mod(val: NumericArg) {
        return derive(this, kleeneBinary(this, val, (v, r) => r === 0 ? null : v % r));
    }

    mul(val: NumericArg) {
        return derive(this, kleeneBinary(this, val, (v, r) => v * r));
    }

    negate() {
        return derive(this, kleeneUnary((v) => -v));
    }

    pow(val: NumericArg) {
        return derive(this, kleeneBinary(this, val, Math.pow));
    }

    radians() {
        return derive(this, kleeneUnary((v) => v * (Math.PI / 180)));
    }

    rand(seed?: number, { min = 0, max = 1, integer = false }: RandomOptions = {}) {
        return derive(this, (vArray) => {
            const len = vArray.length;
            const out = new Float64Array(len);
            const rnd = seed !== undefined ? mulberry32(seed) : Math.random;
            const range = max - min;

            for (let i = 0; i < len; i++) {
                const raw = rnd();
                out[i] = integer ? Math.floor(raw * (range + 1)) + min : raw * range + min;
            }
            return out;
        });
    }

    round(decimals: number = 0) {
        return derive(this, kleeneUnary((v) => roundToScale(v, decimals)));
    }

    round_sig_figs(sig_figs: number) {
        return derive(this, kleeneUnary((v) => isValidNumber(v) ? Number(v.toPrecision(sig_figs)) : v));
    }

    sign() {
        return derive(this, kleeneUnary(Math.sign));
    }

    sin() {
        return derive(this, kleeneUnary(Math.sin));
    }

    sinh() {
        return derive(this, kleeneUnary(Math.sinh));
    }

    sqrt() {
        return derive(this, kleeneUnary((v) => v < 0 ? null : Math.sqrt(v)));
    }

    sub(val: NumericArg) {
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
}

