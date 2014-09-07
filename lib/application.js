var assert = require("assert");
var _ = require("underscore");

function Application (eb, config) {
  this._eb = eb;
  this._config = config;
  this.appName = config.name;

  assert(this.appName);
}
exports.Application = Application;

/**
 * Checks to see if Application exists on AWS; creates it if it does not exist, and
 * updates the information accordingly.
 *
 * @return {Promise->Application}
 */
Application.prototype.initialize = function initialize () {
  var params = _.pick(this._config, ["name", "description"]);
  var application = this;

  return this._eb.describeApplications({ ApplicationNames: [this.appName] }).then(function (desc) {
    // If application exists, ensure that the details are up to date
    assert.equal(desc.Applications.length, 1, "One application description returned from describeApplication");
    var appDesc = desc.Applications[0];

    if (appDesc.Description !== params.description) {
      return application._update(params);
    }
  }, function (err) {
    // If application doesn't exist, create it
    return application._eb.createApplication(params);
  }).then(function (description) {
    // Application should be good to go and sync'd at this point.
    return application;
  });
};

Application.prototype.info = function info () {

};

/**
 * Creates an ApplicationVersion of an app from S3 into this ElasticBeanstalk
 * Application.
 *
 * @param {Object} params
 * - {String} version
 * - {String} description
 * - {String} bucket
 * - {String} key
 *
 * @return {Promise->ApplicationVersionDescription}
 */

Application.prototype.addVersion = function addVersion (params) {
  params = params || {};
  var p = {
    ApplicationName: this.appName,
    Description: params.description,
    VersionLabel: params.version,
    AutoCreateApplication: false, // Application should already be created
    SourceBundle: {
      S3Bucket: params.bucket,
      S3Key: params.key
    }
  };
  return this._eb.createApplicationVersion(p);
};

/**
 * Updates Application description.
 * @param {Object} params
 * - {String} description
 *
 * @return {Promise->ApplicationDescription}
 */

Application.prototype._update = function update (params) {
  params = _.extend({}, params, { ApplicationName: this.appName });
  return this._eb.updateApplication(params);
};

/**
 * Returns an array of EnvironmentDescription objects.
 * All data returned can be found:
 * http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ElasticBeanstalk.html#describeEnvironments-property
 *
 * @return {Promise->[EnvironmentDescription]}
 */
Application.prototype.getEnvironments = function getEnvironments () {
  return this._eb.describeEnvironments({ ApplicationName: this.appName });
};

/**
 * Returns an EnvironmentDescription object of specified environment by EnvironmentName
 * All data returned can be found:
 * http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ElasticBeanstalk.html#describeEnvironments-property
 *
 * @return {Promise->EnvironmentDescription}
 */

Application.prototype.getEnvironment = function getEnvironment (envName) {
  return this.getEnvironments().then(function (res) {
    var environments = res.Environments;
    for (var i = 0; i < environments.length; i++) {
      if (environments[i].EnvironmentName === envName) {
        return environments[i];
      }
    }
    return null;
  });
};

/**
 * Creates a new temporary environment with the new application version,
 * runs the environment, runs a smoke screen, and transitions CNAMEs over
 * from previous environment (blue-green deployment). If environment isn't
 * currently running, just deploys without a temporary environment.
 *
 * @param {Object} params
 * - {String} environment
 * - {String} version
 */

Application.prototype.deploy = function deploy (params) {
  params = params || {};
  this.getEnvironment(params.environment).then(function (environment) {
    if (environment) {
      return this._updateEnvironment(params);
    }
    return this._createEnvironment(params);
  }).then(function () {
    
  });
};

/**
 * Removes this application from AWS.
 *
 * @return {Promise}
 */

Application.prototype.remove = function remove () {
  return this._eb.removeApplication({ ApplicationName: this.appName, TerminateEnvByForce: true });
};

Application.prototype._createEnvironment = function createEnvironment (envName) {

};

Application.prototype._updateEnvironment = function updateEnvironment (envName) {

};

