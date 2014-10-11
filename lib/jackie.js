var when = require("when");
var _ = require("underscore");
var ElasticBeanstalk = require("./eb");
var ElasticBeanstalkMock = require("./eb-mock");
var Application = require("./application");

/**
 * Expose `Jackie`.
 */
module.exports = Jackie;

/**
 * `Jackie` constructor. Takes the follow configuration options:
 *
 * @param {Object} config
 */

function Jackie (config) {
  if (!(this instanceof Jackie)) {
    return new Jackie(config);
  }

  this.config = _.extend({}, config);
  this.mock = !!config.mock;
  this._eb = this.mock ? new ElasticBeanstalkMock(this.config) : new ElasticBeanstalk(this.config);
}

/**
 * Creates an application instance of AWS and returns the corresponding
 * Application object.
 *
 * @param {Object} definition
 * - {String} name
 * - {String} description
 * @return {Promise->Application}
 */

Jackie.prototype.createApplication = function createApplication (appName) {
  var application = new Application(this._eb, appName);
  return application.initialize();
};

/**
 * Removes an application and all running environments associated with it.
 *
 * @param {String} appName
 * @return {Promise}
 */

Jackie.prototype.removeApplication = function removeApplication (appName) {
  return this.getApplication(appName).then(function (app) {;
    if (!app) {
      return when.resolve(null);
    }

    return app.remove();
  });
};

/**
 * Queries AWS and returns an Application instance for every application
 * currently on AWS.
 *
 * @return {Promise->[Application]}
 */

Jackie.prototype.getApplications = function getApplications () {
  var jackie = this;
  return this._eb.describeApplications().then(function (desc) {
    return when.all(desc.Applications.map(function (app) {
      return new Application(jackie._eb, app.ApplicationName);
    }));
  });
};

/**
 * Returns an Application instance by name by querying AWS.
 *
 * @params {String} appName
 * @return {Promise->Application|null}
 */

Jackie.prototype.getApplication = function (appName) {
  return this.getApplications().then(function (apps) {
    for (var i = 0; i < apps.length; i++) {
      if (apps[i].appName === appName) {
        return apps[i];
      }
    }
    return null;
  });
};
