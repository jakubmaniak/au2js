export class Evaluator {
    private constructor(
        private code: string,
        private onConsoleWrite?: (data: any) => void
    ) { }

    static evaluate(code: string, onConsoleWrite?: (data: any) => void) {
        return new Evaluator(code, onConsoleWrite).run();
    }

    private run() {
        const worker = new Worker(
            new URL('evaluator-worker.ts', import.meta.url),
            { type: 'module' }
        );

        worker.addEventListener('message', (ev) => {
            if ('$console' in ev.data) {
                this.onConsoleWrite?.(ev.data.$console);
            }
            else if ('$done' in ev.data) {
                console.log('Executed in ' + ev.data.$done.toFixed(2) + 'ms');
                worker.terminate();
            }
        });

        worker.postMessage({ code: this.code });
    }
}