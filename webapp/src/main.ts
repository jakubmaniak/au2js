import hljs from 'highlight.js';
import javascript from 'highlight.js/lib/languages/javascript';
import yml from 'highlight.js/lib/languages/yaml';
import JSON5 from 'json5';
import YAML from 'yaml';
import { Evaluator } from './lib/evaluator';
import { sanitize } from './lib/helpers/sanitize';
import { Lexer } from './lib/lexer';
import { Parser } from './lib/parser';
import { Transpiler } from './lib/transpiler';
import { Token } from './lib/types/token';


hljs.configure({ classPrefix: 'token--' });
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('yaml', yml);


const state = {
    currentTab: 'ast',
    code: '',
    tokens: [] as Token[],
    ast: { },
    consoleOutput: '',
    error: null,
};


const textarea = document.querySelector<HTMLTextAreaElement>('#source textarea')!;
const output = document.querySelector('#output .content')!;
const extraOutput = document.querySelector('#extra-output .content')!;
const executeButton = document.querySelector('button#execute')!;
const copyButton = document.querySelector<HTMLButtonElement>('button#copy-code')!;

document.querySelectorAll('#extra-output .tabs button')
    .forEach((tab) => {
        const tabElement = tab as HTMLElement;
        const tabId = tabElement.dataset.tabId!;

        tabElement.addEventListener('click', () => changeTab(tabId));
    });

textarea.addEventListener('input', () => onInput());

textarea.value = localStorage.getItem('au2js:source') ?? '';
onInput();

addEventListener('keyup', (ev) => {
    if (ev.code == 'Enter' && ev.ctrlKey) {
        ev.preventDefault();
        executeCode();
    }
});

executeButton.addEventListener('click', executeCode);
copyButton.addEventListener('click', copyCode);

function changeTab(tabId: string) {
    state.currentTab = tabId;

    document.querySelector('#extra-output .tabs button.active')?.classList.remove('active');
    document.querySelector(`#extra-output .tabs button[data-tab-id="${tabId}"]`)?.classList.add('active');

    updateExtraOutput();
}


function process(input: string) {
    let tokens: Token[] = [];

    try {
        tokens = Lexer.getTokens(input);
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

function onInput() {
    if (textarea.value.trim().length == 0) {
        output.innerHTML = '';
        extraOutput.innerHTML = '';
        return;
    }

    localStorage.setItem('au2js:source', textarea.value);

    const result = process(textarea.value);

    if (result.error) {
        state.error = result.error;
        state.tokens = result.tokens;

        extraOutput.innerHTML = sanitize(result.error);
        extraOutput.classList.add('error');
        return;
    }

    state.code = result.code!;
    state.tokens = result.tokens!;
    state.ast = result.ast!;

    const hl = hljs.highlight(state.code, { language: 'javascript', ignoreIllegals: true });
    output.innerHTML = hl.value;

    updateExtraOutput();
}

function updateExtraOutput() {
    let html = '';

    switch (state.currentTab) {
        case 'ast': {
            const yaml = YAML.stringify(state.ast);
            const hl = hljs.highlight(yaml, { language: 'yaml', ignoreIllegals: true });
            html = hl.value;
            break;
        }
        case 'tokens': {
            const tokens = state.tokens
                .map((token) => {
                    const position = (
                        token.source
                        ? (token.source.line + ':' + token.source.column)
                        : ''
                    );
                    const type = (
                        (token.value !== undefined)
                        ? `${token.type.padEnd(10, ' ')} ${JSON5.stringify(token.value)}`
                        : token.type
                    );
                    return position.padEnd(5, ' ') + ' ' + type;
                })
                .join('\n');

            const hl = hljs.highlight(tokens, { language: 'javascript', ignoreIllegals: true });
            html = hl.value;
            break;
        }
        case 'console': {
            html = state.consoleOutput;
            break;
        }
    }

    extraOutput.innerHTML = html;
    extraOutput.classList.remove('error');
}

function executeCode() {
    console.clear();
    state.consoleOutput = '';

    Evaluator.evaluate(state.code, (data) => {
        state.consoleOutput += data.toString();
        state.currentTab == 'console' && updateExtraOutput();
    });

    changeTab('console');
}

async function copyCode() {
    await navigator.clipboard.writeText(state.code);
    copyButton.innerText = 'Copied';

    setTimeout(() => {
        copyButton.innerText = 'Copy';
    }, 1500);
}