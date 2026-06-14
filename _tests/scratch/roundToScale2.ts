function roundToScale1(v: number, scale: number): number {
    return Number(Math.round(Number(v + "e" + scale)) + "e-" + scale);
}

function roundToScale2(v: number, scale: number): number {
    const str = v.toString();
    if (str.includes("e")) {
        const factor = Math.pow(10, scale);
        return Math.round(v * factor) / factor;
    }
    return Number(Math.round(Number(str + "e" + scale)) + "e-" + scale);
}

const tests = [
    [1.005, 2],
    [1e-7, 2],
    [1e-7, 8],
    [1e-21, 2],
    [1e21, 2],
    [0, 2],
    [-1.005, 2],
    [1.2345e-7, 8]
];

for (const [v, scale] of tests) {
    let r1;
    try { r1 = roundToScale1(v, scale); } catch(e) { r1 = "ERROR"; }
    let r2 = roundToScale2(v, scale);
    console.log(`v: ${v}, scale: ${scale} => r1: ${r1}, r2: ${r2}`);
}
