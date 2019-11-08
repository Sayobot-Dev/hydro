const
    stream = require('stream'),
    fs = require('fs');
exports.lib = async that => {
    const
        Grid = require('gridfs-stream'),
        mongo = require('mongodb');
    Grid.prototype.fromFile = function (options, source) {
        let ws = this.createWriteStream(options);
        let rs = typeof source === 'string' ? fs.createReadStream(source) : source;
        return new Promise((resolve, reject) => {
            ws.on('close', resolve);
            ws.on('error', reject);
            rs.pipe(ws);
        });
    };
    Grid.prototype.toFile = function (options, target) {
        let rs = this.createReadStream(options);
        let ws = typeof target === 'string' ? fs.createWriteStream(target) : target;
        return new Promise((resolve, reject) => {
            ws.on('close', resolve);
            ws.on('error', reject);
            rs.pipe(ws);
        });
    };
    Grid.prototype.readFile = function (options) {
        return new Promise((resolve, reject) => {
            let source = this.createReadStream(options);
            let chunks = [];
            let buffer = new stream.Writable();
            buffer._write = function (chunk, enc, done) {
                chunks.push(chunk);
                done();
            };
            source.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
            source.on('error', reject);
            source.pipe(buffer);
        });
    };
    Grid.prototype.writeFile = function (options, data) {
        data = data instanceof Buffer ? data : data.toString();
        let ws = this.createWriteStream(options);
        return new Promise((resolve, reject) => {
            ws.on('close', resolve);
            ws.on('error', reject);
            ws.end(data);
        });
    };
    Grid.prototype.list = function () {
        return new Promise((resolve, reject) => {
            resolve(this.mongo.GridStore.list(this.db, reject));
        });
    };
    that.gfs = Grid(that.db, mongo);
};
exports.id = 'gridfs';
exports.depends = ['database'];
exports.type = 'function';