import { Evaluator } from 'lib/evaluator';
import { Lexer } from 'lib/lexer';
import { Parser } from 'lib/parser';
import { Transpiler } from 'lib/transpiler';
import { Token } from 'lib/types/token';
import { state } from './state';
import { initUI } from './ui';



const ui = initUI({
    onInput,
    onExecute: executeCode
});

initSourceCode();


function initSourceCode() {
    const defaultSource = `Local $n = Random(0, 10)
ConsoleWrite("Hello, JavaScript!" & @CRLF & "$n = " & $n & @CRLF)

If $n > 9 Then
  ConsoleWrite("You are lucky" & @CRLF)
EndIf
`;
    const source = localStorage.getItem('au2js:source') || defaultSource;

    ui.setEditorContent(source);
    onInput(source);

    ui.focusEditor();
}


function transpile(source: string) {
    let tokens: Token[] = [];

    try {
        tokens = Lexer.getTokens(source);
        const ast = Parser.getAst(tokens);
        const code = Transpiler.transpile(ast);

        return {
            code,
            tokens,
            ast,
            error: null
        };
    }
    catch (err: any) {
        return {
            error: err.stack,
            tokens
        };
    }
}


function executeCode() {
    console.clear();
    state.consoleOutput = '';

    Evaluator.evaluate(state.code, (data) => {
        state.consoleOutput += data.toString();
        state.currentTab == 'console' && ui.updateDebugInfo();
    });

    ui.changeTab('console');
}


function onInput(source: string) {
    localStorage.setItem('au2js:source', source);

    if (source.trim().length == 0) {
        ui.output.innerHTML = '';
        ui.debugOutput.innerHTML = '';
        return;
    }

    const result = transpile(source);

    if (result.error) {
        state.error = result.error;
        state.tokens = result.tokens;
        ui.showError(result.error);
        return;
    }

    state.code = result.code!;
    state.tokens = result.tokens;
    state.ast = result.ast!;

    ui.updateOutput();
    ui.updateDebugInfo();
}