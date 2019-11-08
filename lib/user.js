const bson = require('bson');
exports.lib = class USER {
    constructor(item) {
        this.coll = item.db.collection('user');
        this.lib = item.lib;
        this.perm = item.cfg.perm;
        this.user = class USER {
            constructor(user) {
                this._id = user._id;
                this.email = user.email;
                this.uname = user.uname;
                this.perm = user.perm;
            }
            hasPerm(perm) {
                return this.perm & perm;
            }
        };
    }
    getByUID(uid) {
        return this.coll.findOne({ _id: new bson.ObjectID(uid) });
    }
    check(username, password) {
        return this.coll.findOne({
            uname: username, password: this.lib.crypto.pwhash(password)
        });
    }
    create({ email, uname, password, regip, perm = this.perm.PERM_DEFAULT || 0 }) {
        return this.coll.insertOne({
            email, email_lower: email.toLowerCase(),
            uname, uname_lower: uname.toLowerCase(),
            password: this.lib.crypto.pwhash(password),
            regip, perm
        });
    }
    async db_install() {
        const
            { UID_GUEST } = require('hydro-framework'),
            expects = {
                udoc: {
                    _id: UID_GUEST,
                    uname: 'Guest',
                    uname_lower: 'guest',
                    password: '',
                    email: 'example@example.com',
                    email_lower: 'example@example.com',
                    perm: 0,
                    field: 'local',
                    regip: '127.0.0.1'
                }
            };
        console.info('[INSTALLING] lib::user');
        await this.coll.deleteMany({ _id: UID_GUEST });
        await this.coll.insertOne(expects.udoc);
        await Promise.all([
            this.coll.createIndex({ 'uname_lower': 1 }, { unique: true }),
            this.coll.createIndex({ 'email_lower': 1 }, { unique: true })
        ]);
        await this.lib.config.set('ver.lib.user', 1);
        console.info('[INSTALLED] lib::user');
    }
    async init() {
        if (await this.lib.config.get('ver.lib.user') != 1)
            await this.db_install().catch(e => {
                console.error(e);
                console.error('[FAIL] lib::user');
                return false;
            });
        return true;
    }
};
exports.id = 'user';
exports.depends = ['database', 'crypto', 'config'];
exports.type = 'class';
