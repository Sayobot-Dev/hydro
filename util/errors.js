class BadRequestError extends Error {
    constructor(perm) {
        super(perm);
        this.code = 400;
        this.perm = perm;
    }
}
class PermissionError extends Error {
    constructor(perm) {
        super(perm);
        this.code = 403;
        this.perm = perm;
    }
}
class NotFoundError extends Error {
    constructor(perm) {
        super(perm);
        this.code = 404;
        this.perm = perm;
    }
}
module.exports = {
    BadRequestError, PermissionError, NotFoundError
};
