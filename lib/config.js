exports.lib = class CONFIG {
    constructor(item) {
        this.coll = item.db.collection('config');
        this.config = item.cfg.config;
    }
    async get(key = null) {
        if (key) {
            if (key instanceof Array) {
                let res = [], a = [];
                for (let i of key) res.push(this.coll.findOne({ key: i }));
                res = await Promise.all(res);
                for (let i of res) a.push((i || { value: null }).value);
                return a;
            } else {
                let data = await this.coll.findOne({ key });
                if (data) return data.value;
                else return null;
            }
        } else return await this.coll.find().toArray();
    }
    async set(key, value) {
        let doc = await this.coll.findOne({ key });
        if (doc) await this.coll.deleteOne({ key });
        await this.coll.insertOne({ key, value });
    }
    unset(key) { return this.coll.deleteMany({ key }); }
    async db_install() {
        console.info('[INSTALLING] lib::config');
        await this.coll.createIndex({ 'key': 1 }, { unique: true });
        await this.set('ver.lib.config', 1);
        console.info('[INSTALLED] lib::config');
    }
    async init() {
        if (await this.get('ver.lib.config') != 1)
            await this.db_install().catch(e => {
                console.error(e);
                console.error('[FAIL] lib::config');
                return false;
            });
        for (let i in this.config)
            await this.set(i, this.config[i]);
        return true;
    }
};
exports.id = 'config';
exports.type = 'class';
exports.depends = ['database'];
