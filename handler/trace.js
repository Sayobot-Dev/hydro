const statuses = require('statuses');
const { BadRequestError, NotFoundError, PermissionError } = require('../util/errors.js');
exports.handler = class {
    constructor() { }
    init() {
        return (ctx, next) => {
            return Promise.resolve().then(next).then(() => {
                if (ctx.res.statusCode !== 404) return true;
                return ctx.throw(404, `url \`${ctx.path}\` not found.`);
            }).catch(err => {
                if (err instanceof BadRequestError || err instanceof PermissionError || err instanceof NotFoundError) {
                    ctx.status = err.code;
                    ctx.body = err.message;
                } else {
                    if (typeof err.status !== 'number' || !statuses[err.status])
                        err.status = 500;
                    ctx.status = err.status;
                    if (ctx.prefer_json)
                        ctx.body = { error: err.toString(), stack: err.stack };
                    else {
                        ctx.body = `<pre>${err.toString()}</pre><br/><pre>${err.stack}</pre>`;
                        ctx.response.type = 'text/html';
                    }
                }
            });
        };
    }
};
exports.depends = [];
exports.id = 'trace';