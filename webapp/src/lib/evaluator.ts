import au3 from './au3';
import { ConsoleHandler } from './console-handler';


const lib = ConsoleHandler.injectTo(au3);

export class Evaluator {
    private constructor(
        private code: string,
        private onConsoleWrite?: (data: any) => void
    ) { }

    static evaluate(code: string, onConsoleWrite?: (data: any) => void) {
        return new Evaluator(code, onConsoleWrite).run();
    }

    private run() {
        if (this.onConsoleWrite) {
            ConsoleHandler.setCallback(this.onConsoleWrite);
            this.onConsoleWrite = undefined;
        }

        const require = (_path: string) => lib;
        new Function('require', this.code).call(null, require);
    }
}