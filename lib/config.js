module.exports = class CONFIG {
    constructor(item) {
        this.coll = item.db.collection('config');
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
};
