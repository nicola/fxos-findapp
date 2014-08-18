# moz-findapp-b2g

Given a local `manifest.webapp`, it finds app installed on the FirefoxOS device or simulator

# Install

```
$ npm install --save moz-findapp-b2g
```

# Usage

```javascript
var findApp = require('moz-findapp-b2g');

findApp('./nicola/manifest.webapp', function(app) {
  console.log('my app remotely:', app)
});
```