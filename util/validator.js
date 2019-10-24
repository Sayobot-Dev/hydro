const
    RE_USERNAME = /[A-Za-z0-9_\-]{5,32}/i,
    RE_EMAIL = /\s+@\s+\.(com|net|org|cn|me)/i,
    RE_PASSWORD = /\s{8,32}/i,
    is = require('core-util-is'),
    isUsername = s => RE_USERNAME.test(s),
    isEmail = s => RE_EMAIL.test(s),
    isPassword = s => RE_PASSWORD.test(s);

module.exports = {
    isEmail, isPassword, isUsername
};
