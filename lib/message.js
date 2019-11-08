const bson = require('bson');
exports.lib = class MESSAGE {
    constructor(item) {
        this.coll = item.db.collection('message');
        this.lib = item.lib;
    }
    ack(id, uid) {
        if (uid) return this.coll.deleteOne({ _id: new bson.ObjectID(id), uid: new bson.ObjectID(uid) });
        else return this.coll.deleteOne({ _id: new bson.ObjectID(id) });
    }
    get(id) {
        return this.coll.findOne({ _id: new bson.ObjectID(id) });
    }
    find(query) {
        return this.coll.find(query);
    }
    async push({ uid, expire = null, content = '', extra = {} }) {
        uid = new bson.ObjectID(uid);
        let user = await this.lib.user.getByUID(uid);
        if (!user) throw new Error('User not found');
        return await this.coll.insertOne({
            uid, expire, content, extra
        });
    }
};
exports.depends = ['user', 'database'];
exports.id = 'message';
exports.type = 'class';
