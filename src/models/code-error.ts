export class CodeError extends Error {

    public code;

    constructor(code: number = -1, message: string = "") {
        super(message);
        this.code = code;
    }
}
