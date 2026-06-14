function roundToScale1(v: number, scale: number): number {
    return Number(Math.round(Number(v + "e" + scale)) + "e-" + scale);
}

function roundToScale2(v: number, scale: number): number {
    const str = v.toString();
    if (str.includes('e')) {
        const [base, expStr] = str.split('e');
        const exp = parseInt(expStr, 10);
        const roundedBase = Math.round(Number(base + 'e' + (exp + scale)));
        return Number(roundedBase + 'e-' + scale);
    }
    return Number(Math.round(Number(str + "e" + scale)) + "e-" + scale);
}

console.log("Original 1.005, 2: ", roundToScale1(1.005, 2));
console.log("Fixed 1.005, 2: ", roundToScale2(1.005, 2));

console.log("Original 1e-7, 2: ", roundToScale1(1e-7, 2));
console.log("Fixed 1e-7, 2: ", roundToScale2(1e-7, 2));

console.log("Original 1e-21, 2: ", roundToScale1(1e-21, 2));
console.log("Fixed 1e-21, 2: ", roundToScale2(1e-21, 2));

console.log("Original 1e21, 2: ", roundToScale1(1e21, 2));
console.log("Fixed 1e21, 2: ", roundToScale2(1e21, 2));
