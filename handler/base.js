const
    { ObjectID } = require('bson'),
    UID_GUEST = new ObjectID('000000000000000000000000');

exports.handler = class {
    constructor(i) {
        this.db = i.db;
        this.lib = i.lib;
        this.cfg = i.cfg;
        this.locales = i.locales;
        this.constants = i.constants;
    }
    async init() {
        return async (ctx, next) => {
            if (this.cfg.ip_header) ctx.request.ip = ctx.request.headers[this.cfg.ip_header];
            let sessionid = new ObjectID(ctx.cookies.get('sayobot.bbs.sessionid')) || UID_GUEST;
            ctx.session = (await this.db.collection('session').findOne({ _id: sessionid })) || {};
            ctx.session.uid = ctx.session.uid || UID_GUEST;
            Object.assign(ctx.state, this.cfg.perm, this.constants);
            try {
                ctx.state.user = new this.lib.user.user(await this.lib.user.getByUID(ctx.session.uid));
            } catch (e) {
                ctx.state.user = new this.lib.user.user(await this.lib.user.getByUID(UID_GUEST));
                ctx.session.uid = UID_GUEST;
            }
            let languages = (ctx.request.headers['accept-language'] || '').split(';')[0].split(',');
            let language = this.cfg.LANGUAGE;
            for (let i of languages)
                if (this.locales[i]) language = i;
            language = ctx.session.language || language;
            ctx.state._ = this.lib.i18n.getter(language);
            ctx.state.hostname = ctx.request.hostname;
            ctx.json = (json, code = 200) => {
                ctx.body = JSON.stringify(json);
                ctx.code = code;
            };
            let accept = ctx.request.headers.accept.split(',') || '';
            if (accept.includes('application/json')) ctx.prefer_json = true;
            else ctx.prefer_json = false;
            await next();
            if (ctx.session._id) await this.db.collection('session').save(ctx.session);
            else {
                if (ctx.session.uid == UID_GUEST && !ctx.session.language) return;
                let session = await this.db.collection('session').insertOne(ctx.session);
                ctx.cookies.set('sayobot.bbs.sessionid', session.insertedId);
            }
        };
    }
};
exports.id = 'base';
exports.depends = ['i18n', 'database', 'user'];
