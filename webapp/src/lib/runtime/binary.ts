import { AuConvertableNumber, AuString } from './au3';


export class Binary {
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
        if (!str.startsWith('0x') || str.length % 2 != 0 || /[^0-9a-f]/i.test(str.slice(2))) {
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

    toSliced(start: number, end?: number) {
        const slice = new Binary('', this.encoding);
        slice.data = this.data.slice(start, end);
        return slice;
    }
}