const
    log = require('./util/log.js').get('Worker'),
    bson = require('bson'),
    Koa = require('koa'),
    Router = require('koa-router'),
    path = require('path'),
    EventEmitter = require('events');

exports.errors = require('./util/errors.js');
exports.log = require('./util/log.js');
exports.handler = {
    base: require('./handler/base.js'),
    trace: require('./handler/trace.js'),
    user: require('./handler/user.js'),
    nunjucks: require('./handler/nunjucks.js'),
    log: require('./handler/log.js'),
    requirePerm: perm => (ctx, next) => ctx.state.user.hasPerm(perm) ? next() : Promise.resolve(),
    merge: (ctx, next) => { Object.assign(ctx.request.body, ctx.query); return next(); }
};
exports.UID_GUEST = new bson.ObjectID('000000000000000000000000');
exports.app = class Hydro extends EventEmitter {
    constructor(Hydro_config) {
        super();
        if (Hydro_config.preConstruct) {
            if (typeof Hydro_config.preConstruct != 'function') throw new Error('preConstruct must be a function!');
            Hydro_config.preConstruct();
        }
        this.cfg = Hydro_config;
        this.constants = this.cfg.constants || {};
        this.cfg.perm = this.cfg.perm || {};
        this.lib = {};
        this.status = {};
        this.sockets = [];
        this.handler = [];
        this.queue = [];
        this.serviceID = new bson.ObjectID();
        this.app = new Koa();
        this.app.keys = this.cfg.keys || ['Hydro'];
        if (this.cfg.postConstruct) {
            if (typeof this.cfg.postConstruct != 'function') throw new Error('postConstruct must be a function!');
            this.cfg.postConstruct();
        }
    }
    async load() {
        if (this.cfg.preLoad) {
            if (typeof this.cfg.preLoad != 'function') throw new Error('preLoad must be a function!');
            let res = this.cfg.preLoad();
            if (res instanceof Promise) await res;
        }
        this.router = new Router();
        this.server = require('http').createServer(this.app.callback());
        this.io = require('socket.io')(this.server, { cookie: true });
        this.app.use(
            require('koa-morgan')(':method :url :status :res[content-length] - :response-time ms'));
        for (let i of this.cfg.middleware)
            for (let lib of i.depends)
                await this.PrepareLib(lib);
        for (let i in this.cfg.hosts)
            for (let j of this.cfg.hosts[i])
                for (let lib of j.depends)
                    await this.PrepareLib(lib);
        for (let i of this.queue) await this.Lib(i);
        for (let i of this.cfg.middleware) {
            let h = await this.Handler(i);
            for (let j of h) this.app.use(j);
        }
        for (let i in this.cfg.hosts) {
            let r = new Router();
            for (let j of this.cfg.hosts[i]) {
                let h = await this.Handler(j);
                for (let l of h) r.use(l);
            }
            this.handler[i] = r.routes();
        }
        this.app.use(ctx =>
            this.handler[ctx.hostname]
                ? this.handler[ctx.hostname](ctx, () => { })
                : Promise.resolve()
        );
        if (this.cfg.postLoad) {
            if (typeof this.cfg.postLoad != 'function') throw new Error('postLoad must be a function!');
            let res = this.cfg.postLoad();
            if (res instanceof Promise) await res;
        }
        this.status.loaded = true;
    }
    async listen() {
        if (!this.status.loaded) return;
        if (this.cfg.preListen) {
            if (typeof this.cfg.preListen != 'function') throw new Error('preListen must be a function!');
            let res = this.cfg.preListen();
            if (res instanceof Promise) await res;
        }
        await this.server.listen((await this.lib.config.get('port')) || '10001');
        if (this.cfg.postListen) {
            if (typeof this.cfg.postListen != 'function') throw new Error('postListen must be a function!');
            let res = this.cfg.postListen();
            if (res instanceof Promise) await res;
        }
        this.status.listening = true;
        log.log('Server listening on port: %s', (await this.lib.config.get('port')) || '10001');
    }
    async stop() {
        await this.server.close();
        this.status.listening = false;
    }
    async destory() {

    }
    async restart() {
        process.emit('restart');
    }
    async PrepareLib(lib) {
        if (typeof lib == 'string') {
            try {
                lib = require(path.resolve(__dirname, 'lib', lib));
            } catch (e) {
                lib = require(path.resolve(process.cwd(), 'lib', lib));
            }
        }
        for (let l of lib.depends) await this.PrepareLib(l);
        if (!this.queue.includes(lib.id)) this.queue.push(lib.id);
    }
    async Lib(lib) {
        if (typeof lib == 'string') {
            try {
                lib = require(path.resolve(__dirname, 'lib', lib));
            } catch (e) {
                lib = require(path.resolve(process.cwd(), 'lib', lib));
            }
        }
        log.log(`[INIT] lib::${lib.id}`);
        if (lib.type == 'function') await lib.lib(this);
        else {
            this.lib[lib.id] = new lib.lib(this);
            if (this.lib[lib.id].init) {
                let r = this.lib[lib.id].init();
                if (r instanceof Promise) await r;
                if (!r) throw new Error(`[FAIL] lib::${lib.id}`);
            }
        }
        log.log(`[DONE] lib::${lib.id}`);
    }
    async Handler(target) {
        log.log(`[HANDLER] ${target.id}`);
        if (target.handler instanceof Array)
            return target.handler;
        else if (target.type == 'function')
            return [target.handler];
        else {
            if (target.init) {
                let t = target.init();
                if (t instanceof Promise) await t;
            }
            let t = new target.handler(this);
            let r = t.init();
            if (r instanceof Promise) r = await r;
            if (r instanceof Array) return r;
            else if (typeof r == 'object') return [r.routes(), r.allowedMethods()];
            else return [r];
        }
    }
};
