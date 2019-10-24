const { ObjectID } = require('bson');
module.exports = class CONFIG {
    constructor(item) {
        this.coll = item.db.collection('token');
    }
    async get(key) {
        let _id = new ObjectID(key);
        let data = await this.coll.findOne({ _id });
        if (data) return data.value;
        else return null;
    }
    async destory(key) {
        let _id = new ObjectID(key);
        let data = await this.coll.findOne({ _id });
        if (data) {
            await this.coll.deleteOne({ _id });
            return data.value;
        } else return null;
    }
    async create(value) {
        let res = await this.coll.insertOne({ value });
        return res.insertedId;
    }
};
