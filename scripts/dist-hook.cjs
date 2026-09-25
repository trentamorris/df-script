const path = require("path");
const Module = require("module");

const distRoot = path.resolve(__dirname, "../dist");
const srcRoot = path.resolve(__dirname, "../src");

const origResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
    if (parent && parent.filename && request.startsWith(".")) {
        const resolved = path.resolve(path.dirname(parent.filename), request);
        if (resolved.startsWith(srcRoot)) {
            const rel = path.relative(srcRoot, resolved).replace(/\\/g, "/");
            if (rel.startsWith("utils")) return path.join(distRoot, "utils.js");
            if (rel.startsWith("columnExpressions")) return path.join(distRoot, "expressions.js");
            return path.join(distRoot, "index.js");
        }
    }
    return origResolveFilename.call(this, request, parent, isMain, options);
};

let patched = false;
function patchDistIndex(indexExp) {
    if (patched || !indexExp) return;
    patched = true;

    // 1. Symbol.hasInstance bridge for custom error classes across bundle boundaries
    const exceptionKeys = [
        "DFScriptError", "DataFrameError", "ColumnNotFoundError",
        "SchemaError", "ComputeError", "ShapeError",
        "InvalidArgumentError", "IOStreamError"
    ];
    for (let i = 0; i < exceptionKeys.length; i++) {
        const k = exceptionKeys[i];
        const cls = indexExp[k];
        if (cls && typeof cls === "function" && !Object.prototype.hasOwnProperty.call(cls, Symbol.hasInstance)) {
            Object.defineProperty(cls, Symbol.hasInstance, {
                value(inst) {
                    if (!inst || typeof inst !== "object") return false;
                    return inst.name === k || inst.name === cls.name ||
                           inst.constructor?.name === k || inst.constructor?.name === cls.name ||
                           Function.prototype[Symbol.hasInstance].call(cls, inst);
                },
                configurable: true,
                writable: true
            });
        }
    }

    // 2. Bridge mangled DataFrame._columns and DataFrame._createDirect
    if (indexExp.DataFrame?.prototype && !("_columns" in indexExp.DataFrame.prototype)) {
        const sampleDf = new indexExp.DataFrame({ a: [1] });
        const sampleKeys = Object.keys(sampleDf);
        for (let i = 0; i < sampleKeys.length; i++) {
            const k = sampleKeys[i];
            if (sampleDf[k]?.a && (Array.isArray(sampleDf[k].a) || ArrayBuffer.isView(sampleDf[k].a))) {
                Object.defineProperty(indexExp.DataFrame.prototype, "_columns", {
                    get() { return this[k]; },
                    set(val) { this[k] = val; },
                    configurable: true
                });
                break;
            }
        }

        if (!("_createDirect" in indexExp.DataFrame)) {
            const staticProps = Object.getOwnPropertyNames(indexExp.DataFrame);
            for (let i = 0; i < staticProps.length; i++) {
                const sp = staticProps[i];
                if (typeof indexExp.DataFrame[sp] === "function" && indexExp.DataFrame[sp].length === 3) {
                    indexExp.DataFrame._createDirect = indexExp.DataFrame[sp];
                    break;
                }
            }
        }
    }

    // 3. Bridge mangled WhenThen._branchOperands
    if (indexExp.when) {
        const sampleWhen = indexExp.when(true).then("test");
        const proto = Object.getPrototypeOf(sampleWhen);
        if (proto && !("_branchOperands" in proto)) {
            const propNames = Object.getOwnPropertyNames(proto);
            for (let i = 0; i < propNames.length; i++) {
                const name = propNames[i];
                if (name === "constructor" || name === "when" || name === "otherwise") continue;
                const desc = Object.getOwnPropertyDescriptor(proto, name);
                if (desc?.get) {
                    try {
                        const val = desc.get.call(sampleWhen);
                        if (Array.isArray(val) && val.length === 1 && val[0] === "test") {
                            Object.defineProperty(proto, "_branchOperands", { get: desc.get, configurable: true });
                            break;
                        }
                    } catch {}
                }
            }
        }
    }
}

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
    const exports = origLoad.apply(this, arguments);
    const indexPath = path.join(distRoot, "index.js");
    if (!patched && require.cache[indexPath]) {
        patchDistIndex(require.cache[indexPath].exports);
    }
    return exports;
};
