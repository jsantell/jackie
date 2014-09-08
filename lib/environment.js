var assert = require("assert");
var utils = require("./utils");
var DEPLOY_HEALTH_CHECK_TIMEOUT = 1000 * 60 * 10; // 10 minutes?

/**
 * Expose `Environment`
 */

module.exports = Environment;

/**
 * `Environment` constructor -- takes an ElasticBeanstalk instance, application name,
 * and configuration manifest.
 *
 * @param {ElasticBeanstalk} eb
 * @param {String} appName
 * @param {Object} manifest
 */

function Environment (eb, appName, manifest) {
  this._eb = eb;
  this._manifest = manifest;
  // The manifest.name property is the prefix
  // for all environments managed by this instance
  this.envNameGlobal = manifest.name;

  this.CNAMEPrefix = manifest.CNAMEPrefix;
  this.appName = appName;

  // Track the current underlying AWS environment name
  // since this instance can represent more than one
  // AWS environment
  this._currentEnvName = null

  // Number of items polling
  this._waitingForStatusCount = 0;

  assert(this.envNameGlobal);
}

/**
 * Checks to see if Environment exists on AWS; creates it if it does not exist, and
 * updates the information accordingly, starting the application.
 * Return promise resolves upon Environment having "Ready" status.
 *
 * @param {String} version
 *
 * @return {Promise->Environment}
 */

Environment.prototype.deploy = function (version) {
  var env = this;
  this.info().then(function (info) {
    // If no matching Environments on AWS, create one
    if (!info) {
      return env._createOnAWS(version).then(function (desc) {
        // Save this environment name for tracking
        env._setCurrentName(desc.EnvironmentName);
      });
    }
   
    var oldEnvName, newEnvName;

    // Otherwise, deploy a new environment
    return env._createOnAWS(version).then(function (desc) {
      oldEnvName = env._getCurrentName();
      newEnvName = desc.EnvironmentName;
      return utils.waitUntilHealth(env._eb, newEnvName, "Green", null, DEPLOY_HEALTH_CHECK_TIMEOUT);
    }).then(function () {
      // New environment is "Green" health
      // so let's swap CNAMEs
      return utils.swapCNAMEs(env._eb, oldEnvName, newEnvName);
    }).then(function () {
      // Ensure new env on new CNAME is healthy
      return utils.getEnvironmentInfo(env._eb, newEnvName).then(function (desc) {
        if (desc.Health !== "Green") {
          throw new Error("New environment has " + desc.Health + " health after switching CNAMEs, rolling back.");
        }
      })
    }).then(function () {
      // Successfully switched, destroy old environment and set this environment
      // as the current name
      env._setCurrentName(newEnvName);

      // Don't wait for destruction of environment
      utils.destroyEnvironment(oldEnvName);
    }, function (err) {
      // Something went wrong, let's ensure new environment is destroyed
      // Don't wait for destruction of environment
      utils.destroyEnvironment(newEnvName);
    });
  }).then(function () {
    return env;
  });
};

/**
 * Returns the EnvironmentDescription object from AWS
 * for this Environment.
 *
 * @return {Promise->EnvironmentDescription|null}
 */

Environment.prototype.info = function () {
  var env = this;
  return utils.getEnvironmentsInfo(this._eb, this.appName, function (env) {
    return env.CNAME === env.CNAMEPrefix;
  }).then(function (envs) {
    if (envs.length) {
      env._setCurrentName(envs[0].EnvironmentName);
      return envs[0];
    }
    return null;
  });
};

/**
 * Remove and terminate environment from AWS.
 *
 * @return {Promise->EnvironmentDescription}
 */

Environment.prototype.remove = function remove () {
  var env = this;
  return this._getCurrentName().then(function (name) {
    var proc = utils.destroyEnvironment(env._eb, name);
    return env._doAndWaitUntil(proc, "Status", "Terminated");
  });
};

/**
 * Returns the manifest configuration
 * for this environment.
 *
 * @return {Object}
 */

Environment.prototype.getManifest = function getManifest () {
  return this._manifest;
};

/**
 * Returns a promise that resolves when the Environment
 * has a status matching `goalStatus`. Rejects if it takes longer than `timeout`.
 *
 * @param {String} goalStatus
 * @param {Number} timeout
 *
 * @return {Promise->String}
 */

Environment.prototype.waitUntilStatus = function waitUntilStatus (goalStatus, timeout) {
  return this.waitFor("status", goalStatus, timeout);
};

/**
 * Returns a promise that resolves when the Environment
 * has a health matching `goalHealth`. Rejects if it takes longer than `timeout`.
 *
 * @param {String} goalHealth
 * @param {Number} timeout
 *
 * @return {Promise->String}
 */

Environment.prototype.waitUntilHealth = function waitUntilHealth (goalHealth, timeout) {
  return this.waitFor("health", goalHealth, timeout);
};

/**
 * Utility method to wrap a promise and resolve it with the original
 * resolution value while waiting for a field ("Status", "Health") to be set
 * to some goal value.
 *
 * @param {Promise} p
 * @param {String} field
 * @param {String} goal
 *
 * @return {Promise}
 */

Environment.prototype._doAndWaitUntil = function doAndWaitUntil (p, field, goal) {
  var env = this;
  var retValue;

  return p.then(function (ret) {
    retValue = ret;
    return env._getCurrentName();
  }).then(function (name) {
    return utils.waitForEnvironmentState(env._eb, name, field, goal);
  }).then(function () {
    return retValue;
  });
};

/**
 * Fetches the current AWS environment name for this instance
 * either from cache or from AWS.
 *
 * @return {Promise->String}
 */

Environment.prototype._getCurrentName = function () {
  var env = this;

  // If already saved, used it
  if (this._currentEnvName) {
    return when(this._currentEnvName);
  }

  // info() sets `_currentEnvName` property
  return this.info().then(function () {
    return env._currentEnvName;
  });
};

/**
 * Saves the current AWS environment name associated
 * with this instance.
 *
 * @param {String} name
 */

Environment.prototype._setCurrentName = function (name) {
  this._currentEnvName = name;
};

/**
 * Creates the environment on AWS. Returns an EnvironmentDescription
 * object upon success.
 *
 * @param {String} version
 *
 * @return {Promise->EnvironmentDescription}
 */

Environment.prototype._createOnAWS = function createOnAWS (version) {
  var config = utils.getEnvConfig(this.appName, this._manifest);
  config.EnvironmentName = utils.generateNewEnvironmentName(this._manifest.name);
  config.VersionLabel = version;
  return this._doAndWaitUntil(this._eb.createEnvironment(config), "Status", "Ready");
};

/**
 * Updates the environment on AWS. Returns an EnvironmentDescription
 * object upon success.
 *
 * @param {String} version
 *
 * @return {Promise->EnvironmentDescription}
 */

Environment.prototype._updateOnAWS = function updateOnAWS (version) {
  var env = this;
  var config = utils.getEnvConfig(this.appName, this._manifest);
  config.VersionLabel = version;

  return this._getCurrentName().then(function (name) {
    config.EnvironmentName = name;
    return env._doAndWaitUntil(env._eb.updateEnvironment(config), "Status", "Ready");
  });
};
