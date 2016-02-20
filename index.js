var path = require('path')

var debug = require('debug')('nedb-party')

var reuser = require('reuser')

var Datastore = require('nedb')

var MinimumRpc = require('minimum-rpc')

var promisify = require('any-promisify')

var stores = {}

function DatastoreProxy (options) {
  options = options || {}

  options.port = options.port || 40404

  if (options.autoload !== true) {
    debug('nedb-party requires autoload, so setting it to true')
    options.autoload = true
  }

  if (typeof options.filename !== 'string' || options.filename[0] !== '/')
    throw new Error('nedb-party requires filename to be an absolute filepath')

  var originalFilename = options.filename
  options.filename = path.normalize(options.filename)
  if (originalFilename !== options.filename) {
    debug('normalized filepath to %s', options.filename)
  }

  this._options = options

  this._useServer = reuser(startServer, stopServer, { teardownDelay: 1000 });

  function startServer(cb) {
    debug('setting up server');

    var app = require('http').createServer()
    var sio = require('socket.io')(app)

    app.listen(options.port, function (err) {
      if (err) return cb(err)

      var server = new MinimumRpc.Server(sio)

      Object.keys(Datastore.prototype).forEach(function (methodName) {
        debug('registring method %s as rpc target', methodName)

        server.set(methodName, function (options, args, cb) {
          debug('received call for %s with arguments %j on db %j', methodName, args, options)
          var store = loadStore(options)
          args.push(cb)
          store[methodName].apply(store, args)
        })
      })

      var cio = require('socket.io-client')
      var client = new MinimumRpc.Client(cio, {url: 'http://127.0.0.1:' + options.port})

      cb(null, {
        app: app,
        sio: sio,
        cio: cio,
        server: server,
        client: client
      })
    })
  }

  function stopServer(state, cb) {
    debug('tearing down server');

    try {
      state.client._socket.disconnect()
      state.sio.close()
      state.app.close()
      cb()
    } catch (e) {
      console.log('ERROR', e)
      cb(e)
    }
  }

}

Object.keys(Datastore.prototype).forEach(function (methodName) {
  if (methodName[0] === '_') return

  DatastoreProxy.prototype[methodName] = function () {
    var options = this._options
    var useServer = this._useServer

    var args = Array.prototype.slice.call(arguments, 0)

    var cb = args.pop()

    debug('sending rpc call to %s with args %j', methodName, args)

    useServer(function(state, cb) {
      state.client.send(methodName, options, args, cb)
    }).then(function(result) {
      cb(null, result)
      return result
    }).catch(cb)
  }
})

function loadStore (options) {
  var storeKey = JSON.stringify(options)
  var store = stores[storeKey]

  if (store) return store

  store = new Datastore(options)

  stores[storeKey] = store

  return store
}

module.exports = DatastoreProxy
