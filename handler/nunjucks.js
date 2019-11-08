
const
    path = require('path'),
    fs = require('fs'),
    defaultSettings = {
        ext: 'html',
        path: '',
        functionName: 'render',
        nunjucksConfig: {},
        configureEnvironment: null
    };
function njk(config = {}) {
    let nunjucks = require('nunjucks');
    let { defaults, difference, merge } = require('lodash');
    defaults(config, defaultSettings);
    let configKeysArr = Object.keys(config);
    let knownConfigKeysArr = Object.keys(defaultSettings);
    if (configKeysArr.length > knownConfigKeysArr.length) {
        let unknownConfigKeys = difference(configKeysArr, knownConfigKeysArr);
        throw new Error('Unknown config option: ' + unknownConfigKeys.join(', '));
    }
    config.path = Array.isArray(config.path)
        ? config.path.map(item => path.resolve(process.cwd(), item))
        : path.resolve(process.cwd(), config.path);
    config.ext = config.ext ? '.' + config.ext.replace(/^\./, '') : '';
    let env = nunjucks.configure(config.path, config.nunjucksConfig);
    if (typeof config.configureEnvironment === 'function')
        config.configureEnvironment(env);
    return async (ctx, next) => {
        if (ctx[config.functionName])
            throw new Error(`ctx.${config.functionName} is already defined`);
        /**
         * @param {string} view
         * @param {!Object=} context
         * @returns {string}
         */
        ctx[config.functionName] = async (view, context) => {
            const mergedContext = merge({}, ctx.state, context);
            view += config.ext;
            ctx.body = env.render(view, mergedContext);
            ctx.type = 'html';
        };
        await next();
    };
}
exports.handler = class {
    constructor(i) {
        this.db = i.db;
        this.lib = i.lib;
        this.cfg = i.cfg;
    }
    async init() {
        this.cfg.ui_path = path.resolve(this.cfg.ui_path);
        console.log('Using ui folder: ', this.cfg.ui_path);
        if (!fs.existsSync(this.cfg.ui_path)) throw new Error('No UI files found!');
        return njk({
            path: path.join(this.cfg.ui_path, 'templates'),
            nunjucksConfig: {
                trimBlocks: true
            }
        });
    }
};
exports.depends = [];
exports.id = 'nunjucks';
