var Q = require('q');
var Connect = require('fxos-connect');
var FirefoxClient = require('firefox-client');
var fs = require('fs');
var path = require('path');
var __ = require('underscore');

module.exports = findApp;

function findApp () {
  var args = arguments;
  var opts = {};
  var callback;

  /* Overloading */

  // findApp(manifestURL [, client])
  if (typeof args[0] == 'string') {
    opts.manifestURL = args[0];
    if (args[1] instanceof FirefoxClient) {
      opts.client = args[1];
    }
  }
  // findApp({manifestURL: manifest_path[, client: firefox_client]})
  else if (typeof args[0] == 'object') {
    opts = args[0];
  }

  // findApp(..., callback)
  if (typeof args[args.length-1] == 'function') {
    callback = args[args.length-1];
  }

  /* Options*/
  var keepAlive = opts.client ? true : false;

  var simulator;
  return Connect(__.extend(opts, {connect: true}))
    .then(function(sim) {
      simulator = sim;
      var manifestJSON = getManifest(opts.manifestURL);
      var webapps = getWebapps(simulator.client);
      var apps = webapps.then(getInstalledApps);

      var appManifest = Q.all([manifestJSON, apps]).spread(findAppManifest);
      var appActor = appManifest.then(function(app) {
        return webapps.then(getApp(app.manifestURL));
      });

      // Fulfilling the appManifest means that the app is installed
      // Fulfilling the appActor means that the app is running
      var result = Q.allSettled([appManifest, appActor])
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
        });

      return result;
    })
    .then(function(styles) {
      if (!keepAlive) {
        simulator.client.disconnect();
      }
      if (callback) callback(null, styles);
      return styles;
    });
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