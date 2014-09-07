var when = require("when");
var _ = require("underscore");
var fs = require("fs-promise");
var ElasticBeanstalk = require("./eb");
var Application = require("./application");

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
  this._eb = new ElasticBeanstalk(this.config);
  this._applications = [];
}

/**
 * Adds a definition for an application and it's environments to this Jackie instance.
 * Initializes the Application and tracks it internally.
 *
 * @param {Object} definition
 * @return {Promise->Application}
 */

Jackie.prototype.addApplication = function addApplication (definition) {
  var application = new Application(this.eb, definition);
  this._applications.push(application);
  return application.initialize();
};

/**
 * Removes an application and all running environments associated with it.
 *
 * @param {String} appName
 * @return {Promise}
 */

Jackie.prototype.removeApplication = function removeApplication (appName) {
  var apps = this._applications;
  var application = this.getApplication(appName);
  if (!application) {
    return when.resolve(null);
  }

  return application.remove().then(function () {
    for (var i = 0; i < apps.length; i++) {
      if (apps[i].appName === appName) {
        apps.slice(i, 1);
      }
    }
  });
};

/**
 * Returns an Application instance by name.
 *
 * @params {String} appName
 * @return {Application}
 */

Jackie.prototype.getApplication = function (appName) {
  var apps = this._applications;
  for (var i = 0; i < apps.length; i++) {
    if (apps[i].appName === appName) {
      return apps[i];
    }
  }
  return null;
};
