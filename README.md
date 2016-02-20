# nedb-party
A library for making nedb multi-process capable.

Basically, it'll check to see if another process has the db locked, if it does, it'll send requests to that 
process, through rpc, to perform change operations.

**Note: Only methods that receive callbacks are supported. It does not yet support event methods `.on`, etc.**

This idea is inspired heavily by substack's level-party npm package.

## Installation

```bash
npm install --save nedb-party
```

## Example Usage

```js
var Datastore = require('nedb-party')

var options = {filename: __dirname + '/example.db'}

var db1 = new Datastore(options)

// in the same process or not
var db2 = new Datastore(options)

db1.insert({hello: "World"), function(err, newDoc) {
  console.log('inserted doc:', newDoc)
});

db1.insert({hello: "Moon"), function(err, newDoc2) {
  console.log('inserted doc:', newDoc2)
});
```
