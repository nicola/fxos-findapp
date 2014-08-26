var Q = require('q');
var start = require('fxos-start');
var FirefoxClient = require('firefox-client');
var fs = require('fs');
var path = require('path');

module.exports = findApp;

function findApp () {
  var args = arguments;
  var opts = {};
  var callback;

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

  return start(opts)
    .then(function(client) {
      opts.client = client;

      var manifestJSON = getManifest(opts.manifestURL);
      var webapps = getWebapps(client);
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

if (require.main === module) {
  (function() {

    findApp('/Users/mozilla/Desktop/nicola/manifest.webapp', function(err, result){
      console.log("Connected and disconnected", result);
    }).done();

  })();
}