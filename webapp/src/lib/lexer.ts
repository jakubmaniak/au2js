import { Token } from './types/token';
import { TokenType } from './types/token-type';


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
    private lines: string[] = [];
    private tokens: Token[] = [];
    private codeLength: number;
    private ch = '';
    private i = -1;
    private line = 0;
    private column = -1;
    private pos = { line: 0, column: -1 };

    get eof() {
        return this.i >= this.codeLength;
    }

    private constructor(private code: string) {
        this.lines = code
            .split(/(\r\n|\r|\n)/)
            .reduce((acc, l, i) =>
                i % 2 == 0
                ? (acc.push(l), acc)
                : (acc[acc.length - 1] += l, acc),
                [] as string[]
            );

        this.codeLength = this.code.length;
    }

    static getTokens(code: string) {
        return new Lexer(code).run();
    }

    private run() {
        this.advance(1);

        while (!this.eof) {
            this.pos = this.position();

            if (this.ch == ',') {
                this.push({ type: TokenType.Comma, value: ',' });
                this.advance(1);
            }
            else if (this.ch == ';') {
                this.advance(1);
                this.eat(/[^\r\n]*/);
            }
            else if (this.ch == '=') {
                this.advance(1);

                if (this.ch == '=') {
                    this.push({ type: TokenType.Operator, value: '==' });
                    this.advance(1);
                }
                else {
                    this.push({ type: TokenType.Operator, value: '=' });
                }
            }
            else if (this.ch == '+' || this.ch == '-' || this.ch == '*' || this.ch == '/') {
                const op = this.ch;
                this.advance(1);

                if ((this.ch as unknown) == '=') {
                    this.push({ type: TokenType.Operator, value: op + '=' });
                    this.advance(1);
                }
                else {
                    this.push({ type: TokenType.Operator, value: op });
                }
            }
            else if (this.ch == '^') {
                this.advance(1);
                this.push({ type: TokenType.Operator, value: '^' });
            }
            else if (this.ch == '<') {
                this.advance(1);

                if ((this.ch as unknown) == '=') {
                    this.push({ type: TokenType.Operator, value: '<=' });
                    this.advance(1);
                }
                else if ((this.ch as unknown) == '>') {
                    this.push({ type: TokenType.Operator, value: '<>' });
                    this.advance(1);
                }
                else {
                    this.push({ type: TokenType.Operator, value: '<' });
                }
            }
            else if (this.ch == '>') {
                this.advance(1);

                if ((this.ch as unknown) == '=') {
                    this.push({ type: TokenType.Operator, value: '>=' });
                    this.advance(1);
                }
                else {
                    this.push({ type: TokenType.Operator, value: '>' });
                }
            }
            else if (this.ch == '?' || this.ch == ':') {
                this.push({ type: TokenType.Operator, value: this.ch });
                this.advance(1);
            }
            else if (this.ch == '&') {
                this.advance(1);

                if ((this.ch as unknown) == '=') {
                    this.push({ type: TokenType.Operator, value: '&=' });
                    this.advance(1);
                }
                else {
                    this.push({ type: TokenType.Operator, value: '&' });
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
                this.push({ type: TokenType.EOL });
            }
            else if (this.ch == '\n') {
                this.advance(1);
                this.push({ type: TokenType.EOL });
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
                        this.push({ type: TokenType.Directive, value });
                    }
                }
                else this.error('Unexpected end of input while parsing a directive');
            }
            else if (this.ch == '$') {
                this.advance(1);
                const value = this.eat(/[0-9a-zA-Z_]+/);

                if (value != null) {
                    this.push({ type: TokenType.Variable, value });
                }
                else this.error('Expected a variable name after \'$\' token');
            }
            else if (this.ch == '@') {
                this.advance(1);
                const value = this.eat(/[0-9a-zA-Z_]+/);

                if (value != null) {
                    this.push({ type: TokenType.Macro, value });
                }
                else this.error('Unexpected end of input while parsing a macro');
            }
            else if (this.ch == '"') {
                const value = this.eat(/"(?:[^"]|"")*"/);

                if (value != null) {
                    this.push({ type: TokenType.String, value });
                }
                else this.error('Unexpected end of input while parsing a string');
            }
            else if (this.ch == '\'') {
                const value = this.eat(/'(?:[^']|'')*'/);

                if (value != null) {
                    this.push({ type: TokenType.String, value });
                }
                else this.error('Unexpected end of input while parsing a string');
            }
            else if (this.ch.match(/[0-9]/)) {
                const value = this.eat(/(0x[0-9a-f]+|\d+(\.\d+)?)/i);

                if (value != null) {
                    this.push({ type: TokenType.Number, value });
                }
                else this.error('Unexpected end of input while parsing a number');
            }
            else if (this.ch == '(') {
                this.push({ type: TokenType.LParen, value: '(' });
                this.advance(1);
            }
            else if (this.ch == ')') {
                this.push({ type: TokenType.RParen, value: ')' });
                this.advance(1);
            }
            else if (this.ch == '[') {
                this.push({ type: TokenType.LSquare, value: '[' });
                this.advance(1);
            }
            else if (this.ch == ']') {
                this.push({ type: TokenType.RSquare, value: ']' });
                this.advance(1);
            }
            else if (this.ch.match(/[_a-z]/i)) {
                const value = this.eat(/[_a-z][_a-z0-9]*/i);

                if (value != null) {
                    const keyword = keywords.find((k) => k.toLowerCase() == value.toLowerCase());

                    if (keyword) {
                        this.push({ type: TokenType.Keyword, value: keyword });
                    }
                    else {
                        this.push({ type: TokenType.Identifier, value });
                    }
                }
                else this.error('');
            }
            else if (this.ch == '.') {
                this.advance(1);
                this.push({ type: TokenType.Dot, value: '.' });
            }
            else if (this.ch == ' ' || this.ch == '\t') {
                this.advance(1);
            }
            else {
                this.error('Invalid token');
            }
        }

        this.push({ type: TokenType.EOL });
        this.push({ type: TokenType.EOF });

        return this.tokens;
    }

    private advance(pos: number) {
        this.i += pos;
        this.ch = this.code[this.i];

        this.column += pos;

        while (this.line < this.lines.length && this.column >= this.lines[this.line].length) {
            this.column = this.column - this.lines[this.line].length;
            this.line++;
        }
    }

    private eat(pattern: RegExp): string | null {
        if (this.eof) {
            return null;
        }

        const exec = pattern.exec(this.lines[this.line].slice(this.column));
        const match = exec?.[0] ?? null;

        if (match != null) {
            this.advance(match.length);
            return match;
        }

        return null;
    }

    private error(msg: string) {
        throw new SyntaxError(msg);
    }

    private position() {
        return {
            line: this.line,
            column: this.column
        };
    }

    private push(token: Token) {
        this.addSourceData(token, this.pos.line, this.pos.column, this.tokens);
        this.tokens.push(token);
    }

    private addSourceData(token: Token, line: number, column: number, tokens: Token[]) {
        token.source = {
            line: line + 1,
            column: column + 1,
            precedingBlankLines: 0
        };

        if (tokens.length <= 1) {
            return;
        }
        if (token.type == TokenType.EOL) {
            return;
        }

        let previousToken = tokens[tokens.length - 1];

        if (token.source.line > previousToken.source!.line) {
            let emptyLines = 0;
            let i = tokens.length - 1;

            while (i - 1 >= 0) {
                previousToken = tokens[i - 1];

                if (previousToken.type != TokenType.EOL) break;

                if (previousToken.source?.column == 1) {
                    emptyLines++;
                }
                else if (i - 2 >= 0 && tokens[i - 2].source?.line == previousToken.source?.line) {
                    emptyLines++;
                }
                else if (i - 2 >= 0 && tokens[i - 2].type == TokenType.EOL) {
                    emptyLines++;
                }
                else {
                    break;
                }

                i--;
            }

            token.source.precedingBlankLines = Math.min(3, emptyLines);
        }
    }
}