import { sanitize } from './helpers/sanitize';


export class Evaluator {
    private static activeWorker: Worker | null = null;

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

        Evaluator.activeWorker?.terminate();
        Evaluator.activeWorker = worker;

        worker.addEventListener('message', (ev) => {
            if ('$console' in ev.data) {
                this.onConsoleWrite?.(sanitize(ev.data.$console.toString()));
            }
            else if ('$done' in ev.data) {
                let time = ev.data.$done;
                const exitCode = ev.data.exitCode;

                if (time < 10) time = time.toFixed(3) + ' ms';
                else if (time < 100) time = time.toFixed(2) + ' ms';
                else if (time < 1000) time = time.toFixed(1) + ' ms';
                else time = (time / 1000).toFixed(2) + ' s';

                this.onConsoleWrite?.(`\n<mark>-&lt;&lt; Executed in ${time} | Exit code: ${exitCode} &gt;&gt;-</mark>`);

                worker.terminate();

                if (Evaluator.activeWorker == worker) {
                    Evaluator.activeWorker = null;
                }
            }
        });

        worker.postMessage({ code: this.code });
    }
}