const
    { ObjectID } = require('bson'),
    constants = require('../constants.js');
module.exports = class HANDLER_BASE {
    constructor(i) {
        this.db = i.db;
        this.lib = i.lib;
        this.locales = i.locales;
        this.config = i.config;
    }
    i18n(lang) {
        if (this.locales[lang]) return str => this.locales[lang][str] || str;
        else return str => str;
    }
    async init() {
        return async (ctx, next) => {
            let sessionid = new ObjectID(ctx.cookies.get('sayobot.bbs.sessionid')) || constants.UID_GUEST;
            ctx.session = (await this.db.collection('session').findOne({ _id: sessionid })) || {};
            ctx.session.uid = ctx.session.uid || constants.UID_GUEST;
            Object.assign(ctx.state, constants);
            ctx.state.user = new this.lib.user.user(await this.lib.user.getByUID(ctx.session.uid));
            let languages = (ctx.request.headers['accept-language'] || '').split(';')[0].split(',');
            let language = this.config.LANGUAGE;
            for (let i of languages)
                if (this.locales[i]) language = i;
            language = ctx.session.language || language;
            ctx.state._ = this.i18n(language);
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
                if (ctx.session.uid == constants.UID_GUEST && !ctx.session.language) return;
                let session = await this.db.collection('session').insertOne(ctx.session);
                ctx.cookies.set('sayobot.bbs.sessionid', session.insertedId);
            }
        };
    }
};
