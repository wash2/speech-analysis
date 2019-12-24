const CopyWebpackPlugin = require('copy-webpack-plugin')

function addPlugin(webpackConfig, plugin) {
    webpackConfig.plugins.push(plugin);
}

function findRule(webpackConfig, callback) {
    const rules = webpackConfig.module.rules[2].oneOf;
    const index = rules.findIndex(callback);
    if (index === -1) throw Error('Loader not found');
    return rules[index]
}

function findRules(webpackConfig, callback) {
    const rules = webpackConfig.module.rules[2].oneOf;
    return rules.filter(callback);
}

function addRule(webpackConfig, rule) {
    const rules = webpackConfig.module.rules[1].oneOf || [];
    rules.splice(rules.length - 1, 0, rule); // add before exclude rule

    webpackConfig.module.rules[1].oneOf = rules;
}

function findBabelRule(webpackConfig, plugins) {
    // find babel rule
    const babelRule = findRule(webpackConfig, (rule) => {
        return ('' + rule.test === '' + /\.(js|mjs|jsx|ts|tsx)$/)
    });
    return babelRule;
}

module.exports = function(webpackConfig, isDevelopment) {

    addPlugin(webpackConfig, new CopyWebpackPlugin([
      {from: 'public/js', to: 'static/js'}
    ]));

};
