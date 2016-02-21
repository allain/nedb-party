var test = require('tape')

var DatastoreProxy = require('..')

test('DatastoreProxy requires filename', function (t) {
  try {
    new DatastoreProxy({})

    t.fail('should throw exception when filename is not given')
  } catch(e) {
    t.end()
  }
})

test('DatastoreProxy behaves like Datastore', function (t) {
  var dbPath = '/tmp/nedb-party-' + Date.now()

  var db = new DatastoreProxy({ filename: dbPath, autoload: true })

  db.insert({ hello: 'world' }, function (err, newDoc) {
    t.error(err, 'expected no error')

    t.equal(typeof newDoc, 'object', 'inserted doc returns an object')
    t.ok(newDoc._id, 'expect new doc to be an object')
    t.end()
  })
})

test('Can. safely have two DatastoreProxies defined in the same Process', function (t) {
  var dbPath = '/tmp/nedb-party-' + Date.now()

  var db1 = new DatastoreProxy({ filename: dbPath, autoload: true })
  var db2 = new DatastoreProxy({ filename: dbPath, autoload: true })

  db1.insert({hello: 'world'}, function (err, newDoc1) {
    t.error(err, 'should not error')
    t.ok(newDoc1._id, 'id is generated on db1 doc')
    db2.insert({hello: 'world 2'}, function (err, newDoc2) {
      t.error(err, 'should not error')
      t.ok(newDoc2._id, 'id is generated on db2 doc')
      t.end()
    })
  })

})

test.onFinish(function () {
  process.exit(0)
})
