# fxos-findapp

Given a local `manifest.webapp`, it finds app installed on the FirefoxOS device or simulator

# Install

```
$ npm install --save fxos-findapp
```

# Usage

The way the library currently finds the app in remote is by finding an app with the same name

```javascript
var findApp = require('fxos-findapp');

findApp('./nicola/manifest.webapp', function(app) {
  console.log('my app remotely:', app)
});
```