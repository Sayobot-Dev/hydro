const
    Router = require('koa-router'),
    { BadRequestError } = require('../util/errors.js'),
    UID_GUEST = new (require('bson').ObjectID)('000000000000000000000000');

exports.handler = class {
    constructor(i) {
        this.db = i.db;
        this.lib = i.lib;
        this.router = new Router();
    }
    async init() {
        this.router
            .get('/login', async ctx => {
                await ctx.render('login');
            })
            .post('/login', async ctx => {
                let udoc = await this.lib.user.check(ctx.request.body.username, ctx.request.body.password);
                if (!udoc) await ctx.render('login', { message: 'Incorrent login detail.' });
                else {
                    ctx.session.uid = udoc._id;
                    ctx.redirect(ctx.query.redirect || '/');
                }
            })
            .get('/register', async ctx => {
                await ctx.render('register');
            })
            .post('/register', async ctx => {
                let email = await this.db.collection('user').findOne({ email_lower: ctx.request.body.mail.toLowerCase() });
                if (email) throw new BadRequestError('Email already used');
                let token = await this.lib.token.create({ email: ctx.request.body.mail });
                let res = await this.lib.mail.send(
                    ctx.request.body.mail, ctx.state._('Register Verification'),
                    `${ctx.protocol}://${ctx.host}/register/${token}`, `${ctx.protocol}://${ctx.host}/register/${token}`
                );
                if (res) await ctx.render('register_mail_sent');
                else throw new Error('Error sending mail');
            })
            .get('/register/:code', async ctx => {
                let data = await this.lib.token.get(ctx.params.code);
                await ctx.render('user_register_with_code', data);
            })
            .post('/register/:code', async ctx => {
                let uname = await this.db.collection('user').findOne({ uname_lower: ctx.request.body.uname.toLowerCase() });
                if (uname) throw new BadRequestError('Username Already Used');
                else {
                    let { email } = await this.lib.token.destory(ctx.params.code);
                    if (!email) throw new BadRequestError('Invalid token');
                    let { insertedId } = await this.lib.user.create({
                        email,
                        uname: ctx.request.body.uname,
                        password: ctx.request.body.password,
                        regip: ctx.request.ip
                    });
                    ctx.session.uid = insertedId;
                    ctx.redirect('/');
                }
            })
            .post('/logout', async ctx => {
                ctx.session.uid = UID_GUEST;
                ctx.body = {};
            })
            .get('/user', async ctx => {
                if (ctx.session.uid == UID_GUEST) throw new Error('You are not logged in!');
                let user = new this.lib.user.user(await this.lib.user.getByUID(ctx.session.uid));
                await ctx.render('user', { user });
            });
        return this.router;
    }
};
exports.depends = ['database', 'user', 'token'];
exports.id = 'user';