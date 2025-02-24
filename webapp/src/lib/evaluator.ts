import { sanitize } from './helpers/sanitize';


export class Evaluator {
    private static activeWorker: Worker | null = null;
    private worker: Worker | null = null;

    private constructor(
        private code: string,
        private onConsoleWrite?: (data: any) => void
    ) { }

    static evaluate(code: string, onConsoleWrite?: (data: any) => void) {
        return new Evaluator(code, onConsoleWrite).run();
    }

    private run() {
        this.worker = new Worker(
            new URL('evaluator-worker.ts', import.meta.url),
            { type: 'module' }
        );

        Evaluator.activeWorker?.terminate();
        Evaluator.activeWorker = this.worker;

        this.worker.addEventListener('message', (ev) => this.handleMessage(ev.data));

        this.worker.postMessage({ code: this.code });
    }

    private handleMessage(msg: any) {
        if ('$console' in msg) {
            const data = sanitize(String(msg.$console));
            this.onConsoleWrite?.(data);
        }
        else if ('$done' in msg) {
            let time = msg.$done;
            const exitCode = msg.exitCode;

            if (time < 10) time = time.toFixed(3) + ' ms';
            else if (time < 100) time = time.toFixed(2) + ' ms';
            else if (time < 1000) time = time.toFixed(1) + ' ms';
            else time = (time / 1000).toFixed(2) + ' s';

            this.onConsoleWrite?.(`\n<mark>-&lt;&lt; Executed in ${time} | Exit code: ${exitCode} &gt;&gt;-</mark>`);

            this.worker?.terminate();

            if (Evaluator.activeWorker == this.worker) {
                Evaluator.activeWorker = null;
            }
        }
    }
}