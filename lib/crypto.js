const crypto = require('crypto');
exports.lib = class CRYPTO {
    constructor() { }
    pwhash(str) {
        const cipher = crypto.createCipher('aes192', str);
        let crypted = cipher.update(str, 'utf8', 'hex');
        crypted += cipher.final('hex');
        return crypted;
    }
    encrypt(str, secret) {
        const cipher = crypto.createCipher('aes192', secret);
        let crypted = cipher.update(str, 'utf8', 'hex');
        crypted += cipher.final('hex');
        return crypted;
    }
};
exports.id = 'crypto';
exports.type = 'class';
exports.depends = [];