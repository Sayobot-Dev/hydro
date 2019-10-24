const { ObjectID } = require('bson');
module.exports = {
    TYPE_THREAD: 1,
    UID_GUEST: new ObjectID('000000000000000000000000'),
    PERM_THREAD_CREATE: 1,
    PERM_THREAD_REPLY: 2,
    PERM_THREAD_DELETE: 4,
    PERM_REPLY_DELETE: 8,
    PERM_ADMIN: 16,
    PERM_DEFAULT: 1 | 2
};
