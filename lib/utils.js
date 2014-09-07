var _ = require("underscore");

/**
 * Converts an application definition, given a name of an environment,
 * into an object that the aws-sdk can use directly.
 *
 * @param {String} envName
 * @param {Object} config
 * @return {Object}
 */

function getEnvConfig (envName, config) {
  var env = _.findWhere(config.environments, { name: envName });
  var result = {
    ApplicationName: config.name,
    EnvironmentName: envName,
    CNAMEPrefix: env.CNAMEPrefix,
    Description: env.description,
    Tier { Name: env.tier },
    Tags: Object.keys(env.tags || {}).map(function (key) { return { Key: key, Value: env.tags[key] }; }),
    SolutionStackName: env.solutionStackName
  };

  result.OptionSettings = createOptionSettings(env);

  return result;
}
exports.getEnvConfig = getEnvConfig;

/**
 * Takes a specific environment definition and returns
 * its OptionSettings to be consumed via AWS.
 *
 * @param {Object} envConfig
 * @return {[Object]}
 */

function createOptionSettings (envConfig) {
  return Object.keys(envConfig).reduce(function (agg, key) {
    // Only affect "aws:*" keys
    if (!/^aws:/.test(key)) {
      return agg;
    }

    var options = envConfig[key];

    Object.keys(options).forEach(function (oKey) {
      agg.push({
        Namespace: key,
        OptionName: oKey,
        Value: options[oKey]
      });
    });
    return agg;
  }, []).
}
