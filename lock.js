
/* From Node.js in Practice (https://github.com/alexyoung/nodeinpractice/tree/master/listings/file-system/locking) */

var fs = require('fs')
var hasLock = false
var lockDir = '.nedb.lock'

exports.lock = function (cb) {
  if (hasLock) return cb()
  fs.mkdir(lockDir, function (err) {
    if (err) return cb(err)

    fs.writeFile(lockDir+'/'+process.pid, 'lock', function (err) {
      if (err) return cb(err);
      hasLock = true
      return cb()
    })
  })
}

exports.unlock = function (cb) {
  if (!hasLock) return cb()
  fs.unlink(lockDir+'/'+process.pid, function (err) {
    if (err) return cb(err)

    fs.rmdir(lockDir, function (err) {
      if (err) return cb(err)
      hasLock = false
      cb()
    })
  })
}

function deleteLock() {
  if (hasLock) {
    fs.unlinkSync(lockDir+'/'+process.pid)
    fs.rmdirSync(lockDir)
    console.log('Removed lock')
  }
}

process.on('exit', function () {
  deleteLock()
})
