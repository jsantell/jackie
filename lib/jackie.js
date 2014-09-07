var when = require("when");
var _ = require("underscore");
var fs = require("fs-promise");
var ElasticBeanstalk = require("./eb");
var Application = require("./application");

/**
 * `Jackie` constructor. Takes the follow configuration options:
 *
 * @param {Object} config
 * - applicationManifest {String}
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
 * Initializes Jackie and creates Applications defined in `applicationManifest` config
 * on AWS if not previously created.
 *
 * @return {Promise->[Applications]}
 */

Jackie.prototype.initialize = function init () {
  var jackie = this;
  return fs.readDir(this.config.applicationManifest).then(function (files) {
    return when.all(files.map(jackie._addApplication.bind(jackie)));
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
}

/**
 * Adds a new Application to Jackie, initializes it, and tracks it internally.
 *
 * @return {Promise->Application}
 */

Jackie.prototype._addApplication = function (config) {
  var application = new Application(this.eb, config);
  this._applications.push(application);
  return application.initialize();
};

