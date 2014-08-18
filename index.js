var Q = require('q');
var startB2G = require('moz-start-b2g');
var FirefoxClient = require('firefox-client');
var fs = require('fs');
var path = require('path');

module.exports = findAppB2G;

function findAppB2G () {
  var args = arguments;
  var opts = {};
  var callback;

  // findAppB2G(manifestURL [, client])
  if (typeof args[0] == 'string') {
    opts.manifestURL = args[0];
    if (args[1] instanceof FirefoxClient) {
      opts.client = args[1];
    }
  }
  // findAppB2G({manifestURL: manifest_path[, client: firefox_client]})
  else if (typeof args[0] == 'object') {
    opts = args[0];
  }

  // findAppB2G(..., callback)
  if (typeof args[args.length-1] == 'function') {
    callback = args[args.length-1];
  }

  if (!opts.client) opts.disconnect = true;

  var reloaded =  startB2G(opts)
    .then(function(client) {
      opts.client = client;

      var manifest = getManifest(opts.manifestURL);
      var webapps = getWebapps(client);
      var apps = webapps.then(getInstalledApps);

      return Q.all([manifest, apps])
        .spread(findApp)
        .then(function(app) {
          return webapps.then(getApp(app.manifestURL));
        });
    });

    return reloaded
      .then(function(styles) {
        if (callback) callback(null, styles);
        if (opts.disconnect) opts.client.disconnect();
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

function findApp(manifest, apps) {
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

    findAppB2G('/Users/mozilla/Desktop/nicola/manifest.webapp', function(err, result){
      console.log("Connected and disconnected", result);
    });

  })();
}