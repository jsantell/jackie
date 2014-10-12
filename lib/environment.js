var assert = require("assert");
var util = require("util");
var EventEmitter = require("events").EventEmitter;
var _ = require("underscore");
var when = require("when");
var utils = require("./utils");
var DEPLOY_HEALTH_CHECK_TIMEOUT = 1000 * 60 * 10; // 10 minutes?

/**
 * Expose `Environment`
 */

module.exports = Environment;

/**
 * `Environment` constructor -- takes an ElasticBeanstalk instance, application name,
 * and environment name.
 *
 * @param {ElasticBeanstalk} eb
 * @param {String} appName
 */

function Environment (eb, appName, envName) {
  this._eb = eb;

  this.appName = appName;
  this.envName = envName;

  assert(this.envName);
  assert(this.appName);
}

/**
 * Inherits from `EventEmitter`.
 */

util.inherits(Environment, EventEmitter);

/**
 * Queries the associated object on AWS and returns the EnvironmentDescription
 * object for this environment.
 * http://docs.aws.amazon.com/elasticbeanstalk/latest/api/API_EnvironmentDescription.html
 *
 * @return {Promise->Object}
 */

Environment.prototype.info = function info () {
  return this._eb.describeEnvironments({ EnvironmentNames: [this.envName], ApplicationName: this.appName }).then(function (data) {
    return data.Environments.length ? data.Environments[0] : null;
  });
};

/**
 * Creates and/or updates the environment based off the `params`. If environment already exists,
 * update it based off of the `params` values (same as `update` method). Otherwise, create the
 * environment with the config in `params`.
 *
 * @param {Object} params
 * @return {Promise->Environment}
 */

Environment.prototype.initialize = function initialize (params) {
  var env = this;

  return this.info().then(function (data) {
    var modParams = _.extend({}, params, {
      EnvironmentName: env.envName,
      ApplicationName: env.appName
    });

    // If environment doesn't exist, create it
    if (!data) {
      return env._create(modParams);
    }
    // Otherwise, update everything in the params
    else {
      // Delete parameters used only for creation
      delete modParams.ApplicationName;
      delete modParams.SolutionStackName;
      return env._update(modParams);
    }
  }).then(function () {
    return env;
  });
};

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
  return this.info().then(function (info) {
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
 * Returns a promise that resolves when the Environment
 * has a status matching `goalStatus`. Rejects if it takes longer than `timeout`.
 *
 * @param {String} goalStatus
 * @param {Number} timeout
 *
 * @return {Promise->String}
 */

Environment.prototype.waitUntilStatus = function waitUntilStatus (goalStatus, timeout) {
  return utils.waitForEnvironmentState(this._eb, this.envName, "status", goalStatus, timeout || DEPLOY_HEALTH_CHECK_TIMEOUT);
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
  return utils.waitForEnvironmentState(this._eb, this.envName, "health", goalHealth, timeout || DEPLOY_HEALTH_CHECK_TIMEOUT);
};

/**
 * Creates the environment on AWS. Returns an EnvironmentDescription
 * object upon success. Will cause "ready" to be emitted on the Environment
 * object once status is "Ready".
 *
 * @param {String} version
 *
 * @return {Promise->EnvironmentDescription}
 */

Environment.prototype._create = function create (params) {
  var env = this;
  var deferred = when.defer();
  
  this._eb.createEnvironment(params).then(function (desc) {
    deferred.resolve(desc);
    return env.waitUntilStatus("Ready");
  }).then(function () {
    // Emit event "ready" when finished
    env.emit("ready");
  });

  return deferred.promise;
};

/**
 * Updates the environment on AWS. Returns an EnvironmentDescription
 * object upon success. Will cause "ready" to be emitted on the Environment
 * object once status is "Ready".
 *
 * @param {String} version
 *
 * @return {Promise->EnvironmentDescription}
 */

Environment.prototype._update = function update (params) {
  var env = this;
  var deferred = when.defer();
  
  this._eb.updateEnvironment(params).then(function (desc) {
    deferred.resolve(desc);
    return env.waitUntilStatus("Ready");
  }).then(function () {
    // Emit event "ready" when finished
    env.emit("ready");
  });

  return deferred.promise;
};
