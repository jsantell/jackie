var DEFAULT_POLLING_TIMER = 10000;
var when = require("when");

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
  }, []);
}
exports.createOptionSettings = createOptionSettings;

function waitUntilStatus (eb, envName, status, timer, waitTimeout) {
  return waitForEnvironmentState(eb, envName, "Status", status, timer, waitTimeout);  
}
exports.waitUntilStatus = waitUntilStatus;

function waitUntilHealth (eb, envName, status, timer, waitTimeout) {
  return waitForEnvironmentState(eb, envName, "Health", status, timer, waitTimeout);  
}
exports.waitUntilHealth = waitUntilHealth;

/**
 * Takes an array of EnvironmentDescriptions from AWS
 * and a CNAME, and returns the matching EnvironmentDescription
 *
 * @param {[EnvironmentDescription]} envDescriptions
 * @param {String} CNAME
 *
 * @return {EnvironmentDescription|null}
 */

function findEnvironmentByCNAME (envDescriptions, CNAME) {
  for (var i = 0; i < envDescriptions.length; i++) {
    if (envDescriptions[i].CNAME === CNAME) {
      return envDescriptions[i];
    }
  }
  return null;
}
exports.findEnvironmentByCNAME = findEnvironmentByCNAME;

/**
 * Generate a new environment name based off
 * the environment's base name, based off of time (unique enough).
 *
 * @param {String} envBaseName
 *
 * @return {String}
 */

function generateNewEnvironmentName (envNameBase) {
  return envNameBase + Date.now();
}
exports.generateNewEnvironmentName = generateNewEnvironmentName;

/**
 * Takes an ElasticBeanstalk instance, params for `describeEnvironments`
 * and an optional filter predicate. Returns an
 * array of EnvironmentDescriptions from AWS.
 *
 * @param {ElasticBeanstalk} eb
 * @param {Object} params
 * @param {Function} filter
 *
 * @return {[EnvironmentDescription]}
 */

function getEnvironmentsInfo (eb, params, filter) {
  return eb.describeEnvironments(params || {}).then(function (data) {
    var envs = data.Environments;
    return filter ? envs.filter(filter) : envs;
  });
}
exports.getEnvironmentsInfo = getEnvironmentsInfo;

/**
 * Takes an ElasticBeanstalk instance and an environment name
 * and returns the info found on AWS associated with it.
 *
 * @param {ElasticBeanstalk} eb
 * @param {String} envName
 *
 * @return {EnvironmentDescription|null}
 */

function getEnvironmentInfo (eb, envName) {
  return getEnvironmentsInfo(eb, { EnvironmentNames: [envName] }).then(function (envs) {
    return envs.length ? envs[0] : null;
  });
}
exports.getEnvironmentInfo = getEnvironmentInfo;

/**
 * Polls an environment until the environment's `field` state matches
 * the `goalState`. `timer` is a polling duration, whereas `waitTimeout`
 * will reject the promise if it has not been resolved by then.
 *
 * @param {ElasticBeanstalk} eb
 * @param {String} envName
 * @param {String} field
 * @param {String} goalState
 * @param {Number} timer
 * @param {Number} waitTimeout
 *
 * @return {Promise->String|null}
 */

function waitForEnvironmentState (eb, envName, field, goalState, timer, waitTimeout) {
  var deferred = when.defer();
  var timeout;
  timer = timer || DEFAULT_POLLING_TIMER;

  if (waitTimeout) {
    timeout = setTimeout(function () {
      deferred.reject(null);
    }, waitTimeout);
  }

  // Execute first immediately
  poll();

  function poll () {
    getEnvironmentInfo(eb, envName).then(function (env) {
      if (env && env[field] && env[field] === goalState) {
        if (timeout) {
          clearTimeout(timeout);
        }
        deferred.resolve(goalState);
      }
      else {
        setTimeout(poll, timer);
      }
    });
  }
  return deferred.promise;
}
exports.waitForEnvironmentState = waitForEnvironmentState;
