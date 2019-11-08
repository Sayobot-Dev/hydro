const
    path = require('path'),
    fs = require('fs');
exports.lib = class LOCALE {
    constructor(that) {
        this.locales = {};
        const yaml = require('js-yaml');
        let locales = fs.readdirSync(path.resolve(that.cfg.ui_path, 'locales'));
        for (let i of locales) {
            let locale = yaml.safeLoad((fs.readFileSync(path.resolve(that.cfg.ui_path, 'locales', i))));
            let name = i.split('.')[0];
            this.locales[name] = locale;
        }
        that.locales = this.locales;
    }
    getter(language) {
        if (this.locales[language]) return str => this.locales[language][str] || str;
        else return str => str;
    }
};
exports.id = 'i18n';
exports.type = 'class';
exports.depends = [];