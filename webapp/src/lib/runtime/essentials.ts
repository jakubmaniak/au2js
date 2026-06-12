export const essentials = {
    Default: {
        [Symbol.toPrimitive](hint: string) {
            return hint == 'number' ? -1 : 'Default';
        },
        toString() { return 'Default'; }
    },
    CompareCI(a: any, b: any) {
        (typeof a == 'string') && (a = a.toLowerCase());
        (typeof b == 'string') && (b = b.toLowerCase());
        return a == b;
    },
    And(a: any, b: any) {
        return !!(a && b);
    },
    Or(a: any, b: any) {
        return !!(a || b);
    }
};