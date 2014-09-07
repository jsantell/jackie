var AWS = require("aws-sdk");
var lift = require("when/node").nodefn.lift;

var EB_FUNCTIONS = [
  "createApplications",
  "describeApplications"
];

function ElasticBeanstalk (config) {
  var _this = this;
  this._ebInstance = new AWS.ElasticBeanstalk(config || {});

  // Promisfy and bind all functions on helper `eb` function
  this._eb = {};
  EB_FUNCTIONS.forEach(function (fn) {
    _this._eb[fn] = lift(_this._ebInstance[fn].bind(_this));
  });
}
module.exports = ElasticBeanstalk;

/**
 * Creates an application on AWS.
 *
 * @param {Object} params
 * - {String} ApplicationName
 * - {String} Description
 */

ElasticBeanstalk.prototype.createApplication = function createApplication (params) {
  return this.eb.createApplication(params || {});
};

/**
 * Returns description of Application on AWS.
 *
 * @param {Object} params
 * - {Array} ApplicationNames
 */
ElasticBeanstalk.prototype.describeApplications = function describeApplications (params) {
  return this.eb.describeApplications(params);
};
