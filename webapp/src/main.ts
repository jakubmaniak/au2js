import './style.css';

import hljs from 'highlight.js';
import javascript from 'highlight.js/lib/languages/javascript';
import yml from 'highlight.js/lib/languages/yaml';
import YAML from 'yaml';
import { Evaluator } from './lib/evaluator';
import { Lexer } from './lib/lexer';
import { Parser } from './lib/parser';
import { Transpiler } from './lib/transpiler';


let evalCode = '';

addEventListener('keyup', (ev) => {
    if (ev.code == 'Enter' && ev.ctrlKey) {
        ev.preventDefault();

        console.clear();
        Evaluator.evaluate(evalCode);
    }
});


hljs.configure({ classPrefix: 'token--' });
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('yaml', yml);

console.log(hljs.getLanguage('yaml')!.contains[12].beginKeywords += ' undefined');
(hljs.getLanguage('yaml')!.contains[12].keywords as any)['literal'] += ' undefined';

const textarea = document.querySelector('textarea')!;
const output = document.querySelector('div#output')!;
const outputB = document.querySelector('div#output-bottom')!;


function process(input: string) {
    console.clear();

    // return objectInspect(JSON5.parse(input));
    let out: any;
    let out2: any;

    try {
        const tokens = Lexer.getTokens(input);
        const ast = Parser.getAst(tokens);
        out = ast;
        out2 = Transpiler.transpile(ast);
    }
    catch (err: any) {
        return [
            { $$error: err.stack },
            ''
        ];
    }

    return [
        YAML.stringify(out),
        out2
    ];
}

textarea.addEventListener('input', () => onInput());

textarea.value = localStorage.getItem('code') ?? '';
onInput();

function onInput() {
    if (textarea.value.trim().length == 0) {
        output.innerHTML = '';
        outputB.innerHTML = '';
        return;
    }

    localStorage.setItem('code', textarea.value);

    let tree: string | { $$error: string };
    let code: string;
    try {
        [tree, code] = process(textarea.value);
    }
    catch {
        return;
    }

    evalCode = code;
    // Evaluator.evaluate(code);

    if (typeof tree == 'string') {
        const result = hljs.highlight(tree, { language: 'yaml', ignoreIllegals: true });
        outputB.innerHTML = result.value;
        outputB.classList.remove('error');
    }
    else {
        outputB.innerHTML = tree.$$error;
        outputB.classList.add('error');
    }

    const jsResult = hljs.highlight(code, { language: 'javascript', ignoreIllegals: true });
    output.innerHTML = jsResult.value;
}