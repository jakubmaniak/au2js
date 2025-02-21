export enum TokenType {
    EOF = 'EOF',
    EOL = 'EOL',
    Directive = 'Directive',
    Keyword = 'Keyword',
    Identifier = 'Identifier',
    Variable = 'Variable',
    Macro = 'Macro',
    Number = 'Number',
    String = 'String',
    Bracket = 'Bracket',
    // LParen = 'LParen',
    // RParen = 'RParen',
    // LSquare = 'LSquare',
    // RSquare = 'RSquare',
    Comma = 'Comma',
    Dot = 'Dot',
    Operator = 'Operator',
}


// TODO: add position and (toString / TokenFormatter)
export interface Token<V = any> {
    type: TokenType;
    value?: V;
}


const keywords = [
    'Exit',
    'Null', 'True', 'False', 'Default',
    'Global', 'Local', 'Dim', 'Const', 'Static', 'ReDim', 'Enum',
    'If', 'Then', 'ElseIf', 'Else', 'EndIf', 'Not', 'And', 'Or',
    'Switch', 'EndSwitch', 'Select', 'EndSelect', 'Case', 'ContinueCase',
    'While', 'WEnd', 'Do', 'Until', 'ContinueLoop', 'ExitLoop',
    'For', 'To', 'Step', 'In', 'Next',
    'Func', 'EndFunc', 'ByRef', 'Return', 'Volatile',
    'With', 'EndWith'
];


export class Lexer {
    private tokens: Token[] = [];
    private codeLength: number;
    private i = -1;
    private ch = '';

    get eof() {
        return this.i >= this.codeLength;
    }

    private constructor(private code: string) {
        this.codeLength = this.code.length;
    }

    static getTokens(code: string) {
        return new Lexer(code).run();
    }

    private run() {
        this.advance(1);

        while (!this.eof) {
            if (this.ch == ',') {
                this.advance(1);
                this.tokens.push({ type: TokenType.Comma, value: ',' });
            }
            else if (this.ch == ';') {
                this.advance(1);
                this.eat(/.*$/m);
            }
            else if (this.ch == '=') {
                this.advance(1);

                if (this.ch == '=') {
                    this.tokens.push({ type: TokenType.Operator, value: '==' });
                    this.advance(1);
                }
                else {
                    this.tokens.push({ type: TokenType.Operator, value: '=' });
                }
            }
            else if (this.ch == '+' || this.ch == '-' || this.ch == '*' || this.ch == '/') {
                const op = this.ch;
                this.advance(1);

                if ((this.ch as unknown) == '=') {
                    this.tokens.push({ type: TokenType.Operator, value: op + '=' });
                    this.advance(1);
                }
                else {
                    this.tokens.push({ type: TokenType.Operator, value: op });
                }
            }
            else if (this.ch == '^') {
                this.advance(1);
                this.tokens.push({ type: TokenType.Operator, value: '^' });
            }
            else if (this.ch == '<') {
                this.advance(1);

                if ((this.ch as unknown) == '=') {
                    this.tokens.push({ type: TokenType.Operator, value: '<=' });
                    this.advance(1);
                }
                else if ((this.ch as unknown) == '>') {
                    this.tokens.push({ type: TokenType.Operator, value: '<>' });
                    this.advance(1);
                }
                else {
                    this.tokens.push({ type: TokenType.Operator, value: '<' });
                }
            }
            else if (this.ch == '>') {
                this.advance(1);

                if ((this.ch as unknown) == '=') {
                    this.tokens.push({ type: TokenType.Operator, value: '>=' });
                    this.advance(1);
                }
                else {
                    this.tokens.push({ type: TokenType.Operator, value: '>' });
                }
            }
            else if (this.ch == '?' || this.ch == ':') {
                this.tokens.push({ type: TokenType.Operator, value: this.ch });
                this.advance(1);
            }
            else if (this.ch == '&') {
                this.advance(1);

                if ((this.ch as unknown) == '=') {
                    this.tokens.push({ type: TokenType.Operator, value: '&=' });
                    this.advance(1);
                }
                else {
                    this.tokens.push({ type: TokenType.Operator, value: '&' });
                }
            }
            else if ((this.ch == ' ' || this.ch == '\t') && this.eat(/^\s_(?:[\r\n]|\r\n)/)) {
                // skip
            }
            else if (this.ch == '\r') {
                this.advance(1);
                if ((this.ch as unknown) == '\n') {
                    this.advance(1);
                }
                this.tokens.push({ type: TokenType.EOL });
            }
            else if (this.ch == '\n') {
                this.advance(1);
                this.tokens.push({ type: TokenType.EOL });
            }
            else if (this.ch == '#') {
                this.advance(1);
                const value = this.eat(/.+/m);

                if (value != null) {
                    //TODO: improve condition
                    if (value.startsWith('cs') || value.startsWith('comments-start')) {
                        this.eat(/.*?#(?:ce|comments-end)/s);
                    }
                    else {
                        this.tokens.push({ type: TokenType.Directive, value });
                    }
                }
                else this.error('Unexpected end of input while parsing a directive');
            }
            else if (this.ch == '$') {
                this.advance(1);
                const value = this.eat(/[0-9a-zA-Z_]+/);

                if (value != null) {
                    this.tokens.push({ type: TokenType.Variable, value });
                }
                else this.error('Expected a variable name after \'$\' token');
            }
            else if (this.ch == '@') {
                this.advance(1);
                const value = this.eat(/[0-9a-zA-Z_]+/);

                if (value != null) {
                    this.tokens.push({ type: TokenType.Macro, value });
                }
                else this.error('Unexpected end of input while parsing a macro');
            }
            else if (this.ch == '"') {
                const value = this.eat(/"(?:[^"]|"")*"/);

                if (value != null) {
                    this.tokens.push({ type: TokenType.String, value });
                }
                else this.error('Unexpected end of input while parsing a string');
            }
            else if (this.ch == '\'') {
                const value = this.eat(/'(?:[^']|'')*'/);

                if (value != null) {
                    this.tokens.push({ type: TokenType.String, value });
                }
                else this.error('Unexpected end of input while parsing a string');
            }
            else if (this.ch.match(/[0-9]/)) {
                const value = this.eat(/(0x[0-9a-f]+|\d+(\.\d+)?)/i);

                if (value != null) {
                    this.tokens.push({ type: TokenType.Number, value });
                }
                else this.error('Unexpected end of input while parsing a number');
            }
            else if (this.ch.match(/[()\[\]]/)) {
                this.tokens.push({ type: TokenType.Bracket, value: this.ch });
                this.advance(1);
            }
            else if (this.ch.match(/[_a-z]/i)) {
                const value = this.eat(/[_a-z][_a-z0-9]*/i);

                if (value != null) {
                    const keyword = keywords.find((k) => k.toLowerCase() == value.toLowerCase());

                    if (keyword) {
                        this.tokens.push({ type: TokenType.Keyword, value: keyword });
                    }
                    else {
                        this.tokens.push({ type: TokenType.Identifier, value });
                    }
                }
                else this.error('');
            }
            else if (this.ch == '.') {
                this.advance(1);
                this.tokens.push({ type: TokenType.Dot, value: '.' });
            }
            else if (this.ch == ' ' || this.ch == '\t') {
                this.advance(1);
            }
            else {
                this.error('Invalid token');
            }
        }

        this.tokens.push({ type: TokenType.EOL });
        this.tokens.push({ type: TokenType.EOF });

        return this.tokens;
    }

    private advance(pos: number) {
        this.i += pos;
        this.ch = this.code[this.i];
    }

    private eat(pattern: RegExp): string | null {
        if (this.eof) {
            return null;
        }

        const exec = pattern.exec(this.code.slice(this.i)); //TODO: split code to lines
        const match = exec?.[0] ?? null;

        if (match != null) {
            this.advance(match.length);
            return match.replace(/\r/g, '@CR').replace(/\n/g, '@LF') ?? null;
        }

        return null;
    }

    private error(msg: string) {
        throw new SyntaxError(msg);
    }
}