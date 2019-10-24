const crypto = require('crypto');
module.exports = class CRYPTO {
    constructor() { }
    pwhash(str) {
        const cipher = crypto.createCipher('aes192', str);
        let crypted = cipher.update(str, 'utf8', 'hex');
        crypted += cipher.final('hex');
        return crypted;
    }
};
