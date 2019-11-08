const
    path = require('path');

exports.handler = class {
    constructor(i) {
        this.cfg = i.cfg;
    }
    async init() {
        return [
            require('koa-static')(path.resolve(this.cfg.ui_path, 'public')),
            require('koa-morgan')(':method :url :status :res[content-length] - :response-time ms'),
            require('koa-body')({
                patchNode: true,
                multipart: true,
                formidable: {
                    uploadDir: path.join(__dirname, 'uploads'),
                    keepExtensions: true
                }
            })
        ];
    }
};
exports.id = 'log';
exports.depends = [];
