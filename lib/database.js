exports.lib = async that => {
    let Database = await require('mongodb').MongoClient.connect(
        that.cfg.db_url, { useNewUrlParser: true, useUnifiedTopology: true }
    );
    that.db = Database.db(that.cfg.db_name);
};
exports.id = 'database';
exports.type = 'function';
exports.depends = [];
