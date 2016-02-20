var test = require('blue-tape')

var DatastoreProxy = require('..');

test('DatastoreProxy requires absolute filename', function(t) {
  try {
    new DatastoreProxy({filename: './test.db', autoload: true})

    t.fail('should throw exception when filename is not absolute path')
  } catch(e) {
    t.end()
  }
})

test('DatastoreProxy behaves like Datastore', function(t) {

  var dbPath = '/tmp/nedb-party-' + Date.now()

  var db = new DatastoreProxy({ filename: dbPath, autoload: true })

  db.insert({ hello: 'world' }, function(err, newDoc) {
    t.equal(typeof newDoc, 'object', 'inserted doc returns an object');
    t.ok(newDoc._id, 'expect new doc to be an object');
    t.end()
  });
});
