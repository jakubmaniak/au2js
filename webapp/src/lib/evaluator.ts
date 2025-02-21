import au3 from './au3';


export class Evaluator {
    private constructor(private code: string) { }

    static evaluate(code: string) {
        return new Evaluator(code).run();
    }

    private run() {
        // eval(this.code);

        const require = (_path: string) => au3;
        new Function('require', this.code).call(null, require);
    }
}