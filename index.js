var Q = require('q');
var Connect = require('fxos-connect');
var FirefoxClient = require('firefox-client');
var fs = require('fs');
var path = require('path');
var __ = require('underscore');

module.exports = FindApp;

function FindApp (opts, callback) {

  opts = opts ? __.clone(opts) : {};

  var manifestJSON = getManifest(opts.manifestURL);
  var webapps = getWebapps(opts.client);
  var apps = webapps.then(getInstalledApps);

  var appManifest = Q.all([manifestJSON, apps]).spread(findAppManifest);
  var appActor = appManifest.then(function(app) {
    return webapps.then(getApp(app.manifestURL));
  });

  // Fulfilling the appManifest means that the app is installed
  // Fulfilling the appActor means that the app is running
  return Q.allSettled([appManifest, appActor])
    .spread(function(manifest, actor) {

      // No manifest means no app installed
      if (manifest.state == 'rejected') {
        throw manifest.reason;
      }

      var result = {};

      if (actor.state == 'fulfilled') {
        result = actor.value;
      }

      result.manifest = manifest.value;
      return result;
    })
    .nodeify(callback);
}

function getLocalPath(styleActor) {
  var matches = REMOTE_PATH.exec(styleActor.sheet.href);
  return matches[1];
}

function getApp (manifestURL) {
  return function(webapps) {
    return Q.ninvoke(webapps, 'getApp', manifestURL);
  };
}

function getWebapps(client) {
  return Q.ninvoke(client, 'getWebapps');
}

function getInstalledApps(webapps) {
  return Q.ninvoke(webapps, 'getInstalledApps');
}

function getManifest(manifestURL) {
  return Q.nfcall(fs.readFile, manifestURL, 'utf8')
    .then(function(file) {
      return JSON.parse(file);
    });
}

function findAppManifest(manifest, apps) {
  for (var i=0; i < apps.length; i++) {
    var app = apps[i];
    if (app.name == manifest.name) {
      return app;
    }
  }
  throw new Error("App not found");
}