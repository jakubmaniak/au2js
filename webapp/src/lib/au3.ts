type AuString = string | number | boolean;
type AuNumber = number | boolean | string;// | null

type AuConvertableNumber<T extends number> = T | `${T}`
    | (T extends 0 ? false | null : never)
    | (T extends 1 ? true : never);


const essentials = {
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

const macros = {
    _var: {
        error: 0,
        extended: 0,
        exitCode: 0,
    },
    AUTOITVERSION: '3.3.16.1',
    COMPILED: 0,
    CR: '\r',
    CRLF: '\r\n',
    get ERROR() { return this._var.error; },
    get EXTENDED() { return this._var.extended; },
    get EXITCODE() { return this._var.exitCode; },
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
    Abs(number: AuNumber) { return Math.abs(+number); },
    ACos(value: AuNumber) { return Math.acos(+value); },
    Asc(char: AuString) {
        const code = (char.toString() || '\0').charCodeAt(0);
        return (code < 256) ? code : 63;
    },
    AscW(char: AuString) {
        return (char.toString() || '\0').charCodeAt(0);
    },
    ASin(value: AuNumber) { return Math.asin(+value); },
    ATan(value: AuNumber) { return Math.atan(+value); },
    Binary(input: AuString | Binary) {
        if (input instanceof Binary)
            return input;
        if (input.toString().startsWith('0x'))
            return Binary.fromHex(input.toString());
        return new Binary(input, 1);
    },
    BinaryToString(input: AuString | Binary, flag: AuConvertableNumber<1 | 4> = 1) {
        if (input instanceof Binary)
            return input.decode();
        if (input.toString().startsWith('0x'))
            return Binary.fromHex(input.toString(), flag).decode();
        return new Binary(input, flag).decode();
    },
    BitAND(a: number, b: number, ...rest: number[]) {
        let r = a & b;
        let i = 0;
        while (i < rest.length) r &= rest[i++];
        return r;
    },
    BitOR(a0: number, a1: number, a2 = 0, a3 = 0, a4 = 0, a5 = 0) {
        return a0 | a1 | a2 | a3 | a4 | a5;
    },
    Ceiling(number: AuNumber) { return Math.ceil(+number); },
    Chr(code: AuNumber) {
        if (+code < 0 || +code > 255) return '';
        return String.fromCharCode(+code);
    },
    ChrW(code: AuNumber) {
        if (+code < 0 || +code > 65535) return '';
        return String.fromCharCode(+code);
    },
    ClipGet() { },
    ClipPut(text: string) { },
    ConsoleWrite(data: any) { console.log(data); },
    Cos(number: AuNumber) { return Math.cos(+number); },
    // Exit(number: AuNumber = 0) {
    //     macros._var.exitCode = +number;
    // },
    Exp(number: AuNumber) { return Math.exp(+number); },
    Floor(number: AuNumber) { return Math.floor(+number); },
    FuncName(func: Function) { return func.name; },
    HotKeySet(keys: AuString, func: AuString | Function) { },
    Include(_path: string) {  },
    Log(number: AuNumber) { return Math.log(+number); },
    Mod(a: AuNumber, b: AuNumber) { return +a % +b; },
    MouseClick() { },
    MouseDown() { },
    MouseGetCursor() { },
    MouseGetPos() { },
    MouseMove() { },
    MouseUp() { },
    MsgBox(_flag: number, _title: string, content: string) {
        alert(content);
        return 1;
    },
    InputBox(_title: string, content: string, _default = '') {
        return prompt(content, _default) ?? '';
    },
    Random(min = 0, max?: number, flag: 0 | 1 = 0) {
        if (min != 0 && max == undefined)
            return Math.random() * min;
        if (flag == 1)
            return (min|0) + Math.round(Math.random() * (((max??1)|0) - (min|0)));
        return min + Math.random() * ((max??1) - min);
    },
    Round(number: AuNumber, decim: AuNumber = 0) {
        if (+decim < 0)
            return Math.round((number as number) * 10 ** +decim) / 10 ** +decim;
        return +(+number).toFixed(+decim);
    },
    Run(command: AuString) { },
    Send(keys: AuString) { },
    SetError(code: AuNumber, extended: AuNumber = 0, returnValue: any = 1) {
        macros._var.error = +code;
        macros._var.extended = +extended;
        return returnValue;
    },
    SetExtended(extended: AuNumber, returnValue: any = 1) {
        macros._var.extended = +extended;
        return returnValue;
    },
    Sin(number: AuNumber) {
        return Math.sin(+number);
    },
    Sleep(time: AuNumber) {
        //Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 1, +time);
        const d = new Date().getTime();
        while (Date.now() - d < +time);
    },
    String(value: string | number | boolean | null) {
        // if (typeof value == 'boolean')
        //     return value ? 'True' : 'False';
        return value?.toString() ?? '';
    },
    StringInStr(
        string: AuString,
        substring: AuString,
        casesense: AuNumber = 0,
        occurence: AuNumber = 1, 
        start: AuNumber = 1,
        count: AuNumber = -1
    ) {
        if (+count != -1) {
            return String(string)
                .slice(0, +count)
                .indexOf(substring.toString(), +start - 1) + 1;
        }
        return String(string).indexOf(substring.toString(), +start - 1) + 1;
    },
    StringLeft(string: AuString, count: AuNumber) {
        return string.toString().slice(0, +count);
    },
    StringLen(string: AuString) {
        return string.toString().length;
    },
    StringLower(string: AuString) {
        return string.toString().toLowerCase();
    },
    StringMid(string: AuString, start: AuNumber, count: AuNumber = -1) {
        return (
            count == -1
            ? string.toString().slice(+start - 1)
            : string.toString().slice(+start - 1, +start + +count - 1)
        );
    },
    StringReverse(string: AuString) {
        return string.toString().split('').reverse().join('');
    },
    StringRight(string: AuString, count: AuNumber) {
        return string.toString().slice(-count);
    },
    StringToBinary(string: AuString, flag: AuNumber = 1) {
        return new Binary(string, flag as 1 | 4);
    },
    StringUpper(string: AuString) {
        return string.toString().toUpperCase();
    },
    Sqrt(number: AuNumber) {
        return Math.sqrt(+number);
    },
    ToolTip() { },
    UBound(array: any[], dim = 1): number {
        if (dim > 1 && array.length)
            return this.UBound(array[0], dim - 1);
        return array?.length ?? 0;
    },
    VarGetType(variable: any) {
        if (variable == null)
            return 'Keyword';
        else if (typeof variable == 'string')
            return 'String';
        else if (typeof variable == 'boolean')
            return 'Bool';
        else if (typeof variable == 'number')
            return Number.isInteger(variable) ? 'Int32' : 'Double';
        else if (variable instanceof Binary)
            return 'Binary';
        else if (variable instanceof Array)
            return 'Array';
        else if (typeof variable == 'function')
            return Object.values(functions).includes(variable) ? 'Function' : 'UserFunction';

        return 'Object';
    },
    WinClose() { },
    WinExists() { },
    WinWaitActive() { },
};


class Binary {
    data: Uint8Array;

    constructor(string: AuString, public encoding: AuConvertableNumber<1 | 4>) { 
        this.data = this.encodeString(string.toString())
    }

    private encodeString(str: string) {
        let chars = str.split('');

        if (this.encoding == 1) {
            const codes = chars.map((ch) => {
                const code = ch.charCodeAt(0);
                return (code < 256) ? code : 0x3f;
            });
            return new Uint8Array(codes);
        }
        else if (this.encoding == 4) {
            return new TextEncoder().encode(str);
        }

        return new Uint8Array(0);
    }

    static fromHex(str: string, flag: AuConvertableNumber<1 | 4> = 1) {
        if (!str.startsWith('0x') || str.length % 2 != 0 || /[^0-9a-f]/i.test(str)) {
            return new Binary(str, flag);
        }

        const codes: number[] = [];

        for (let i = 2; i < str.length; i += 2) {
            codes.push(parseInt(str.slice(i, i + 2), 16));
        }

        const binary = new Binary('', flag);
        binary.data = new Uint8Array(codes);
        return binary;
    }

    decode() {
        return new TextDecoder().decode(this.data);
    }

    toString() {
        if (this.data.length == 0)
            return '';

        const hex = (n: number) => {
            const h = n.toString(16);
            return h.padStart(h.length + h.length % 2, '0');
        };

        const codes = [...this.data].map((code) => hex(code));

        return '0x' + codes.join('').toUpperCase();
    }
}


const au3 = Object.assign(macros, functions, essentials);

export default au3;