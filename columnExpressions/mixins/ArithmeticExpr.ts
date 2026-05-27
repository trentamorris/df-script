import type { IExpr, ExprConstructor } from "../../types"
import { derive } from "../ExprBase"
import { clamp } from "../../utils"

export const ArithmeticExpr = <TBase extends ExprConstructor>(Base: TBase) => {
    return class extends Base {
        abs() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = v == null ? null : Math.abs(v);
                }
                return result;
            });
        }

        acos() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = (v == null || v < -1 || v > 1) ? null : Math.acos(v);
                }
                return result;
            });
        }

        acosh() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = (v == null || v < 1) ? null : Math.acosh(v);
                }
                return result;
            });
        }

        add(val: number | IExpr | null) {
            return derive(this, (vArray, columns) => {
                const height = vArray.length;
                const rResolved = this._resolve(val, columns, height);
                const result = new Array(height);
                if (Array.isArray(rResolved)) {
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        const r = rResolved[i];
                        result[i] = (v == null || r == null) ? null : v + r;
                    }
                } else {
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        result[i] = (v == null || rResolved == null) ? null : v + rResolved;
                    }
                }
                return result;
            });
        }

        asin() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = (v == null || v < -1 || v > 1) ? null : Math.asin(v);
                }
                return result;
            });
        }

        asinh() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = v == null ? null : Math.asinh(v);
                }
                return result;
            });
        }

        atan() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = v == null ? null : Math.atan(v);
                }
                return result;
            });
        }

        atanh() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = (v == null || v <= -1 || v >= 1) ? null : Math.atanh(v);
                }
                return result;
            });
        }

        cbrt() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = v == null ? null : Math.cbrt(v);
                }
                return result;
            });
        }

        ceil() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = v == null ? null : Math.ceil(v);
                }
                return result;
            });
        }

        clip(lower: number | null = null, upper: number | null = null) {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    if (v == null) {
                        result[i] = null;
                    } else if (lower !== null && upper !== null) {
                        result[i] = clamp({ val: v, min: lower, max: upper });
                    } else if (lower !== null) {
                        result[i] = Math.max(v, lower);
                    } else if (upper !== null) {
                        result[i] = Math.min(v, upper);
                    } else {
                        result[i] = v;
                    }
                }
                return result;
            });
        }

        cos() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = v == null ? null : Math.cos(v);
                }
                return result;
            });
        }

        cosh() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = v == null ? null : Math.cosh(v);
                }
                return result;
            });
        }

        degrees() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = v == null ? null : v * (180 / Math.PI);
                }
                return result;
            });
        }

        div(val: number | IExpr | null) {
            return derive(this, (vArray, columns) => {
                const height = vArray.length;
                const rResolved = this._resolve(val, columns, height);
                const result = new Array(height);
                if (Array.isArray(rResolved)) {
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        const r = rResolved[i];
                        result[i] = (v == null || r == null || r === 0) ? null : v / r;
                    }
                } else {
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        result[i] = (v == null || rResolved == null || rResolved === 0) ? null : v / rResolved;
                    }
                }
                return result;
            });
        }

        exp() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = v == null ? null : Math.exp(v);
                }
                return result;
            });
        }

        expm1() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = v == null ? null : Math.expm1(v);
                }
                return result;
            });
        }

        floor() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = v == null ? null : Math.floor(v);
                }
                return result;
            });
        }

        floordiv(val: number | IExpr | null) {
            return derive(this, (vArray, columns) => {
                const height = vArray.length;
                const rResolved = this._resolve(val, columns, height);
                const result = new Array(height);
                if (Array.isArray(rResolved)) {
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        const r = rResolved[i];
                        result[i] = (v == null || r == null || r === 0) ? null : Math.floor(v / r);
                    }
                } else {
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        result[i] = (v == null || rResolved == null || rResolved === 0) ? null : Math.floor(v / rResolved);
                    }
                }
                return result;
            });
        }

        hypot(val: number | IExpr | null) {
            return derive(this, (vArray, columns) => {
                const height = vArray.length;
                const rResolved = this._resolve(val, columns, height);
                const result = new Array(height);
                if (Array.isArray(rResolved)) {
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        const r = rResolved[i];
                        result[i] = (v == null || r == null) ? null : Math.hypot(v, r);
                    }
                } else {
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        result[i] = (v == null || rResolved == null) ? null : Math.hypot(v, rResolved);
                    }
                }
                return result;
            });
        }

        log(base: number = Math.E) {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    if (v == null || v <= 0) {
                        result[i] = null;
                    } else {
                        result[i] = base === Math.E ? Math.log(v) : Math.log(v) / Math.log(base);
                    }
                }
                return result;
            });
        }

        log1p() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = (v == null || v <= -1) ? null : Math.log1p(v);
                }
                return result;
            });
        }

        mod(val: number | IExpr | null) {
            return derive(this, (vArray, columns) => {
                const height = vArray.length;
                const rResolved = this._resolve(val, columns, height);
                const result = new Array(height);
                if (Array.isArray(rResolved)) {
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        const r = rResolved[i];
                        result[i] = (v == null || r == null || r === 0) ? null : v % r;
                    }
                } else {
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        result[i] = (v == null || rResolved == null || rResolved === 0) ? null : v % rResolved;
                    }
                }
                return result;
            });
        }

        mul(val: number | IExpr | null) {
            return derive(this, (vArray, columns) => {
                const height = vArray.length;
                const rResolved = this._resolve(val, columns, height);
                const result = new Array(height);
                if (Array.isArray(rResolved)) {
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        const r = rResolved[i];
                        result[i] = (v == null || r == null) ? null : v * r;
                    }
                } else {
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        result[i] = (v == null || rResolved == null) ? null : v * rResolved;
                    }
                }
                return result;
            });
        }

        negate() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = v == null ? null : -v;
                }
                return result;
            });
        }

        pow(val: number | IExpr | null) {
            return derive(this, (vArray, columns) => {
                const height = vArray.length;
                const rResolved = this._resolve(val, columns, height);
                const result = new Array(height);
                if (Array.isArray(rResolved)) {
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        const r = rResolved[i];
                        result[i] = (v == null || r == null) ? null : Math.pow(v, r);
                    }
                } else {
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        result[i] = (v == null || rResolved == null) ? null : Math.pow(v, rResolved);
                    }
                }
                return result;
            });
        }

        radians() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = v == null ? null : v * (Math.PI / 180);
                }
                return result;
            });
        }

        round(decimals: number = 0) {
            const factor = Math.pow(10, decimals);
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = v == null ? null : Math.round(v * factor) / factor;
                }
                return result;
            });
        }

        sin() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = v == null ? null : Math.sin(v);
                }
                return result;
            });
        }

        sinh() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = v == null ? null : Math.sinh(v);
                }
                return result;
            });
        }

        sign() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = v == null ? null : Math.sign(v);
                }
                return result;
            });
        }

        sqrt() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = (v == null || v < 0) ? null : Math.sqrt(v);
                }
                return result;
            });
        }

        tan() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = v == null ? null : Math.tan(v);
                }
                return result;
            });
        }

        tanh() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = v == null ? null : Math.tanh(v);
                }
                return result;
            });
        }

        trunc() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = v == null ? null : Math.trunc(v);
                }
                return result;
            });
        }

        sub(val: number | IExpr | null) {
            return derive(this, (vArray, columns) => {
                const height = vArray.length;
                const rResolved = this._resolve(val, columns, height);
                const result = new Array(height);
                if (Array.isArray(rResolved)) {
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        const r = rResolved[i];
                        result[i] = (v == null || r == null) ? null : v - r;
                    }
                } else {
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        result[i] = (v == null || rResolved == null) ? null : v - rResolved;
                    }
                }
                return result;
            });
        }
    }
}
