const macros = {
    AUTOITVERSION: '3.3.16.1',
    COMPILED: 0,
    CR: '\r',
    CRLF: '\r\n',
    ERROR: 0,
    EXTENDED: 0,
    get HOUR() { return new Date().getHours(); },
    LF: '\n',
    get MDAY() { return new Date().getDate(); },
    get MIN() { return new Date().getMinutes(); },
    get MON() { return new Date().getMonth() + 1; },
    get MSEC() { return new Date().getMilliseconds(); },
    get OSLANG() { return '0409'; },
    get SEC() { return new Date().getSeconds(); },
    SW_SHOW: 5,
    TAB: '\t',
    get WDAY() { return new Date().getDay() + 1; },
    get YDAY() {
        const d = new Date();
        return (d.getTime() - d.setMonth(0, 1)) / (24 * 3600 * 1000) + 1;
    },
    get YEAR() { return new Date().getFullYear(); },
};

const functions = {
    Array(elements: any[], subscripts: number[]) {
        const array = new Array(...elements);
        if (subscripts[0] != undefined) {
            if (subscripts[0] < elements.length) {
                throw new Error('Array has incorrect number of subscripts');
            }
            array.length = subscripts[0];
        }
        return array;
    },
    Abs(number: number) { return Math.abs(number); },
    ACos(value: number) { return Math.acos(value); },
    ASin(value: number) { return Math.asin(value); },
    ATan(value: number) { return Math.atan(value); },
    BitAND(a: number, b: number, ...rest: number[]) {
        let r = a & b;
        let i = 0;
        while (i < rest.length) r &= rest[i++];
        return r;
    },
    BitOR(a0: number, a1: number, a2 = 0, a3 = 0, a4 = 0, a5 = 0) {
        return a0 | a1 | a2 | a3 | a4 | a5;
    },
    Ceiling(number: number) { return Math.ceil(number); },
    ConsoleWrite(data: any) { console.log(data); },
    Cos(number: number) { return Math.cos(+number); },
    Exp(number: number) { return Math.exp(number); },
    Floor(number: number) { return Math.floor(number); },
    FuncName(func: Function) { return func.name; },
    Include(path: string) {  },
    Log(number: number) { return Math.log(number); },
    Mod(a: number, b: number) { return a % b; },
    MsgBox(_flag: number, _title: string, content: string) { alert(content); return 1; },
    InputBox(_title: string, content: string, _default = '') { return prompt(content, _default) ?? ''; },
    Random(min = 0, max?: number, flag: 0 | 1 = 0) {
        if (min != 0 && max == undefined)
            return Math.random() * min;
        if (flag == 1)
            return (min|0) + Math.round(Math.random() * (((max??1)|0) - (min|0)));
        return min + Math.random() * ((max??1) - min);
    },
    Round(number: number, decim = 0) {
        if (decim < 0)
            return Math.round(number * 10**decim) / 10**decim;
        return +number.toFixed(decim);
    },
    Sin(number: number) { return Math.sin(+number); },
    StringLeft(string: string, count: number) { return string.slice(0, count); },
    StringLen(string: string) { return string.length; },
    StringLower(string: string) { return string.toLowerCase(); },
    StringMid(string: string, start: number, count = -1) {
        return (
            count == -1
            ? string.slice(start - 1)
            : string.slice(start - 1, start + count - 1)
        );
    },
    StringReverse(string: string) { return string.split('').reverse().join(''); },
    StringRight(string: string, count: number) { return string.slice(-count); },
    StringUpper(string: string) { return string.toUpperCase(); },
    UBound(array: any[], dim = 1) { return array.length; },
};

const au3 = Object.freeze(Object.assign(macros, functions));

export default au3;