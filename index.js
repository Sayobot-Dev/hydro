const
    log = require('./util/log.js').get('Worker'),
    bson = require('bson'),
    Koa = require('koa'),
    Router = require('koa-router'),
    fs = require('fs'),
    path = require('path'),
    yaml = require('js-yaml'),
    mongo = require('mongodb'),
    EventEmitter = require('events');

exports.errors = require('./util/errors.js');
exports.log = require('./util/log.js');
exports.handler = {
    base: require('./handler/base.js'),
    trace: require('./handler/trace.js'),
    user: require('./handler/user.js'),
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
        this.locales = {};
        this.lib = {};
        this.status = {};
        this.sockets = [];
        this.handler = [];
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
        this.cfg.ui_path = path.resolve(this.cfg.ui_path);
        log.log('Using ui folder: ', this.cfg.ui_path);
        if (!fs.existsSync(this.cfg.ui_path)) throw new Error('No UI files found!');
        await this.connectDatabase();
        await this.loadLocale();
        await this.mountLib();
        let deploy = require('./util/deploy.js');
        if (this.cfg.deploy) deploy = this.cfg.deploy;
        if (!await deploy(this.db, this.lib)) return;
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
        this.app.use(ctx => {
            if (this.handler[ctx.hostname]) return this.handler[ctx.hostname](ctx);
        });
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
        await this.server.listen((await this.lib.conf.get('bbs.port')) || '10001');
        if (this.cfg.postListen) {
            if (typeof this.cfg.postListen != 'function') throw new Error('postListen must be a function!');
            let res = this.cfg.postListen();
            if (res instanceof Promise) await res;
        }
        this.status.listening = true;
        log.log('Server listening on port: %s', (await this.lib.conf.get('bbs.port')) || '10001');
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
    async connectDatabase() {
        try {
            let Database = await require('mongodb').MongoClient.connect(
                this.cfg.db_url, { useNewUrlParser: true, useUnifiedTopology: true }
            );
            this.db = Database.db(this.cfg.db_name);
            this.gfs = require('gridfs')(this.db, mongo);
        } catch (e) {
            log.error('Unable to connect to database.');
            log.error(e);
            process.exit(1);
        }
    }
    async loadLocale() {
        let locales = fs.readdirSync(path.resolve(this.cfg.ui_path, 'locales'));
        for (let i of locales) {
            let locale = yaml.safeLoad((fs.readFileSync(path.resolve(this.cfg.ui_path, 'locales', i))));
            let name = i.split('.')[0];
            this.locales[name] = locale;
        }
    }
    async mountLib() {
        let conf = require('./lib/config.js');
        this.lib.conf = new conf({ db: this.db });
        await this.setConfig();
        for (let i of this.cfg.lib) await this.Lib(i);
    }
    async Lib(lib) {
        if (lib == '@') {
            let user = require('./lib/user.js');
            this.lib.user = new user(this);
            let crypto = require('./lib/crypto.js');
            this.lib.crypto = new crypto(this);
            let token = require('./lib/token.js');
            this.lib.token = new token(this);
            let mail = require('./lib/mail.js');
            this.lib.mail = new mail(this);
        } else {
            this.lib[lib.name] = new lib.lib(this);
            if (this.lib[lib.name].init) {
                let r = this.lib[lib.name].init();
                if (r instanceof Promise) await r;
            }
        }
    }
    async setConfig() {
        for (let i in this.cfg.config)
            await this.lib.conf.set(i, this.cfg.config[i]);
    }
    async Handler(target) {
        if (target == '@') {
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
                }),
                require('koa-nunjucks-2')({
                    ext: 'html',
                    path: path.join(this.cfg.ui_path, 'templates'),
                    nunjucksConfig: {
                        trimBlocks: true
                    }
                })
            ];
        } else {
            if (target.init) {
                let t = target.init();
                if (t instanceof Promise) await t;
            }
            let t = new target.handler(this);
            let r = t.init();
            if (r instanceof Promise) r = await r;
            if (typeof r == 'object') return [r.routes(), r.allowedMethods()];
            else return [r];
        }
    }
};
