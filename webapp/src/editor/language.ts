import { StreamLanguage } from "@codemirror/language";


const keywords = new Set([
    'if', 'then', 'else', 'elseif', 'endif',
    'not', 'and', 'or',
    'null', 'true', 'false', 'default',
    'global', 'local', 'dim', 'const', 'static', 'redim', 'enum',
    'switch', 'endswitch', 'select', 'endselect',
    'case', 'continuecase',
    'while', 'wend',
    'do', 'until',
    'for', 'to', 'step', 'in', 'next',
    'continueloop', 'exitloop',
    'func', 'endfunc', 'return', 'byref', 'volatile',
    'with', 'endwith',
    'exit',
]);

const builtins = new Set([
    'abs', 'acos', 'asc', 'ascw', 'asin', 'atan', 'adlibregister', 'adlibunregister', 'asc', 'ascw', 'autoitsetoption',
    'binary', 'binarylen', 'binarymid', 'binarytostring', 'bitand', 'bitnot', 'bitor', 'bitrotate', 'bitshift', 'bitxor',
    'call', 'ceiling', 'chr', 'chrw', 'clipget', 'clipput', 'consoleread', 'consolewrite', 'cos',
    'dec', 'dllcall', 'dllclose', 'dllopen',
    'eval', 'exp',
    'floor', 'funcname',
    'guicreate', 'guigetmsg', 'guisetstate',
    'guictrlcreatebutton', 'guictrlcreateinput', 'guictrlcreatepic',
    'guictrlread', 'guictrlsetdata',
    'hex', 'hotkeyset',
    'include', 'inputbox', 'int','isdeclared',
    'isarray', 'isbool', 'isnumber', 'isstring', 'isint', 'isfloat', 'isbinary', 'isfunc', 'iskeyword',
    'log',
    'mapappend', 'mapexists', 'mapkeys', 'mapremove',
    'mod', 'mouseclick', 'mousedown', 'mousegetcursor', 'mousegetpos', 'mousemove', 'mouseup', 'msgbox',
    'number',
    'objcreate', 'opt',
    'processclose', 'processexists', 'processgetstats', 'processsetpriority', 'processlist',
    'processwait', 'processwaitclose',
    'random', 'round', 'run', 'runwait', 'runas', 'runaswait',
    'send', 'sendkeepactive', 'seterror', 'setexitcode', 'setextended',
    'shellexecute', 'shellexecutewait', 'sin', 'sleep', 'srandom',
    'string', 'stringaddcr', 'stringcompare', 'stringinstr', 'stringformat', 'stringleft',
    'stringlen', 'stringlower', 'stringmid', 'stringregexp', 'stringregexpreplace',
    'stringreplace', 'stringreverse', 'stringright', 'stringsplit', 'stringtobinary',
    'stringtrimleft', 'stringtrimright', 'stringupper',
    'sqrt',
    'tan', 'timerinit', 'timerdiff', 'tooltip',
    'ubound',
    'vargettype',
    'winclose', 'winexists', 'winwaitactive',
    '_arraypop', '_arraypush', '_arraydelete', '_arraydisplay',
]);


export const autoitLanguage = StreamLanguage.define({
    languageData: {
        commentTokens: { line: ';' }
    },
    startState() {
        return { inBlockComment: false };
    },
    token(stream, state) {

        // #cs ... #ce
        if (state.inBlockComment) {
            if (stream.match(/^#(?:ce|comments-end)\b/i)) {
                state.inBlockComment = false;
            }
            else {
                stream.skipToEnd();
            }

            return 'comment';
        }

        // Whitespace
        if (stream.eatSpace()) {
            return null;
        }

        // ; comment
        if (stream.peek() == ';') {
            stream.skipToEnd();
            return 'comment';
        }

        // #cs
        if (stream.match(/^#(?:cs|comments-start)\b/i)) {
            state.inBlockComment = true;
            return 'comment';
        }

        // Preprocessor
        if (stream.match(
            /^#(?:include|include-once|pragma|region|endregion|requireadmin|js)\b/i
        )) {
            return 'meta';
        }

        // Strings
        if (stream.peek() == '"' || stream.peek() == "'") {
            const quote = stream.next();

            while (!stream.eol()) {
                const ch = stream.next();

                if (ch == '\\') {
                    stream.next();
                    continue;
                }

                if (ch === quote) {
                    break;
                }
            }

            return 'string';
        }

        // Variables
        if (stream.match(/^\$[A-Za-z_]\w*/)) {
            return 'variableName';
        }

        // Macros
        if (stream.match(/^@[A-Za-z_]\w*/)) {
            return 'atom';
        }

        // Hex numbers
        if (stream.match(/^0x[0-9A-F]+/i)) {
            return 'number';
        }

        // Decimal numbers
        if (stream.match(/^\d+(\.\d+)?([eE][+-]?\d+)?/)) {
            return 'number';
        }

        // Operators
        if (stream.match(/^(<>|<=|>=|==|=|\+|-|\*|\/|&|\^|<|>)/)) {
            return 'operator';
        }

        // Brackets
        if (stream.match(/^[()[\]{}]/)) {
            return 'bracket';
        }

        // Keywords / builtins
        const ident = stream.match(/^[A-Za-z_]\w*/, false);
        if (ident) {
            const word = (ident as any[])[0].toLowerCase();

            stream.match(/^[A-Za-z_]\w*/);

            if (keywords.has(word)) {
                return 'keyword';
            }

            if (builtins.has(word)) {
                return 'def';
            }

            return 'variableName';
        }

        stream.next();
        return null;
    },
});