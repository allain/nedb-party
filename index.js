var path = require('path')
var http = require('http')

var debug = require('debug')('nedb-party')

var Datastore = require('nedb')

var stores = {}

var listening = false

var server = http.createServer(function handleRequest (request, response) {
  readAll(request, function(err, data) {
    var payload = JSON.parse(data)

    var options = payload.storeOptions
    var methodName = payload.methodName
    var args = payload.args

    debug('received call for %s with arguments %j on db %j', methodName, args, options)

    var storeKey = JSON.stringify(options)
    var store = stores[storeKey] = stores[storeKey] || new Datastore(options)

    args.push(function (err, result) {
      if (err) {
        response.writeHead(500, { 'Content-Type': 'application/json' })
        response.end({error: err.message})
      } else {
        response.writeHead(200, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify(result))
      }
    })

    store[methodName].apply(store, args)
  })
})

function startServer (cb) {
  if (listening)
    return cb(null, server)

  server.listen(40404, function (err) {
    listening = !err

    return cb(err, listening ? server : null)
  })
}

function DatastoreProxy (options) {
  options = options || {}

  if (options.autoload !== true) {
    // TODO: decide if this is true, or just preferable
    debug('nedb-party requires autoload, so setting it to true')
    options.autoload = true
  }

  if (!options.filename)
    throw new Error('nedb-party needs filename to work')

  options.filename = path.resolve(path.normalize(options.filename))

  debug('using db file %s', options.filename)

  this._options = options
}

Object.keys(Datastore.prototype).forEach(function (methodName) {
  if (methodName[0] === '_') return

  DatastoreProxy.prototype[methodName] = function () {
    var options = this._options
    var useServer = this._useServer

    var args = Array.prototype.slice.call(arguments, 0)
    var cb = args.pop()

    startServer(function (err, server) {
      if (server) {
        debug('performing nedb operation directly on database')

        // This is the master, so just do it directly
        var storeKey = JSON.stringify(options)
        var store = stores[storeKey] = stores[storeKey] || new Datastore(options)
        args.push(function (err, result) {
          // server.close(function(err2) {
          cb(err, result)
        // })
        })
        store[methodName ].apply(store, args)
        return
      }

      debug('sending rpc call to %s with args %j', methodName, args)

      var body = JSON.stringify({
        methodName: methodName,
        storeOptions: options,
        args: args
      })

      var request = new http.ClientRequest({
        hostname: '127.0.0.1',
        port: 40404,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      })

      request.on('response', function (response) {
        response.setEncoding('utf8')

        readAll(response, function(err, data) {
          var payload = JSON.parse(data)
          if (response.statusCode === 200) {
            return cb(null, payload)
          } else {
            return cb(new Error(payload.error))
          }
        })
      })

      request.end(body)
    })
  }
})


function readAll(stream, cb) {
  var data = []
  stream.on('data', function (chunk) {
    data.push(chunk)
  })
  stream.once('end', function () {
    cb(null, data.join(''));
    cb = function() {}
  })
  stream.once('error', function(err) {
    cb(err);
    cb = function() {}
  })
}

module.exports = DatastoreProxy
