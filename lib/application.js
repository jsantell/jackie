var assert = require("assert");
var _ = require("underscore");
var when = require("when");
var utils = require("./utils");
var Environment = require("./environment");
/**
 * Expose `Application`.
 */
module.exports = Application;

/**
 * `Application` constructor. Takes an `ElasticBeanstalk` wrapper instance.
 */

function Application (eb, appName, description) {
  this._eb = eb;
  this.appName = appName;

  this._cachedDescription = description;
  assert(this.appName);
}

/**
 * Queries the associated object on AWS and returns the ApplicationDescription
 * object for this application.
 * http://docs.aws.amazon.com/elasticbeanstalk/latest/api/API_ApplicationDescription.html
 *
 * @return {Promise->Object}
 */

Application.prototype.info = function info (options) {
  var app = this;
  if (options && options.cached && this._cachedDescription) {
    return when.resolve(this._cachedDescription);
  }
  return this._eb.describeApplications({ ApplicationNames: [this.appName] }).then(function (data) {
    var data = data.Applications.length ? data.Applications[0]: null;
    app._cachedDescription = data;
    return data;
  });
}

/**
 * Checks to see if Application exists on AWS; creates it if it does not exist, and
 * updates the information accordingly.
 *
 * @param {Object} definition
 * - {String} Description
 * @return {Promise->Application}
 */

Application.prototype.initialize = function initialize (definition) {
  var application = this;
  var params = _.extend({}, definition, { ApplicationName: this.appName });

  return this.info().then(function (appDesc) {
    // If application doesn't exist, create it
    if (!appDesc) {
      return application._eb.createApplication(params);
    }
    // If application description does not match, update it
    else if (appDesc.Description !== params.Description) {
      return application.update(params);
    }
  }).then(function (description) {
    // Application should be good to go and sync'd at this point.
    return application;
  });
};

/**
 * Creates a new Environment object within this application and starts it on AWS.
 *
 * @param {String} envName
 * @param {Object} params
 * @return {Promise->Environment}
 */

Application.prototype.createEnvironment = function createEnvironment (envName, params) {
  var env = new Environment(this._eb, this.appName, envName);
  return env.initialize(params);
};

/**
 * Creates an ApplicationVersion of an app from S3 into this ElasticBeanstalk
 * Application.
 *
 * @param {Object} params
 * - {String} VersionLabel
 * - {String} Description
 * - {Object} SourceBundle
 *   - {String} S3Bucket
 *   - {String} S3Key
 *
 * @return {Promise->ApplicationVersionDescription}
 */

Application.prototype.createVersion = function createVersion (params) {
  var params = _.extend({}, params, {
    ApplicationName: this.appName,
    AutoCreateApplication: false // Application should already be created
  });

  return this._eb.createApplicationVersion(params).then(function (version) {
    return version.ApplicationVersion; 
  });
};

/**
 * Updates Application description.
 * @param {Object} params
 * - {String} Description
 *
 * @return {Promise->ApplicationDescription}
 */

Application.prototype.update = function update (params) {
  params = _.extend({}, params, { ApplicationName: this.appName });
  return this._eb.updateApplication(params);
};

/**
 * Returns all environments associated with this application.
 *
 * @return {Promise->[Environment]}
 */

Application.prototype.getEnvironments = function getEnvironments () {
  var app = this;
  return this._eb.describeEnvironments({ ApplicationName: this.appName }).then(function (desc) {
    return desc.Environments.map(function (env) {
      return new Environment(app._eb, app.appName, env.EnvironmentName);
    });
  });
};

/**
 * Returns the environment associated with this application by
 * `envName`.
 *
 * @param {String} envName
 * @return {Promise->Environment|null}
 */

Application.prototype.getEnvironment = function getEnvironment (envName) {
  return this.getEnvironments().then(function (envs) {
    for (var i = 0; i < envs.length; i++) {
      if (envs[i].envName === envName) {
        return envs[i];
      }
    }
    return null;
  });
};

/**
 * Deploys `version` on `envName` environment. Environment creates and updates
 * the AWS resources as necessary.
 *
 * @param {String} envName
 * @param {String} version
 *
 * @return {Promise->Environment}
 */
/*
Application.prototype.deploy = function deploy (envName, version) {
  var env = this.getEnvironment(envName);
  if (!env) {
    return when.resolve(null);
  }

  return env.deploy(version);
};
*/

/**
 * Removes this application from AWS.
 *
 * @return {Promise}
 */

Application.prototype.remove = function remove () {
  return this._eb.deleteApplication({ ApplicationName: this.appName, TerminateEnvByForce: true }).then(function () {
    return null;
  });
};
