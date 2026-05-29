const boolMap: Record<string, boolean> = {
    true: true, "1": true, yes: true, y: true, on: true,
    false: false, "0": false, no: false, n: false, off: false
};

export function tryParseBoolean(v: unknown): boolean | undefined {
    if (typeof v === "boolean") return v;
    if (v === 1) return true;
    if (v === 0) return false;
    if (typeof v !== "string") return undefined;
    return boolMap[v.trim().toLowerCase()];
}
