const
    log = require('./log.js').get('Deploy'),
    { UID_GUEST } = require('../constants.js'),
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

async function db_install(db, lib) {
    log.info('\nIt seem that it\'s your first time to run Hydro.\nWe are now preparing database.');
    await db.collection('user').deleteMany({ _id: UID_GUEST });
    await db.collection('user').insertOne(expects.udoc);
    await Promise.all([
        db.collection('user').createIndex({ 'uname_lower': 1 }, { unique: true }),
        db.collection('user').createIndex({ 'email_lower': 1 }, { unique: true }),
        db.collection('config').createIndex({ 'key': 1 }, { unique: true }),
        db.collection('config').insertOne({ key: 'categories', value: [{ id: 'default', name: 'Default Category' }] })
    ]);
    await lib.conf.set('bbs.dbver', 1);
    log.info('Database installed.');
}
module.exports = async (db, lib) => {
    if (await lib.conf.get('bbs.dbver') != 1) {
        await db_install(db, lib).catch(e => {
            log.error(e);
            log.error('Database installation failed.');
            process.exit(1);
        });
        process.emit('restart');
        return false;
    }
    return true;
};
