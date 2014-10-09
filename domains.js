var request = require('request')
var tar = require('tar-stream').extract
var unzip = require('zlib').createUnzip
var package = require('./package.json')
var concat = require('concat-stream')
var memoize = require('memoizee')

function getTarball(repo) {
  var url = 'https://api.github.com/repos/' + repo + '/tarball/master'

  var first = true

  return request({
    url: url,
    headers: {
      'user-agent': package.name + '/'+package.version
    }
  })
  .pipe(unzip())
  .pipe(tar())

}

function _fetchDomains(cb) {
  var first = true
  var domains = {}
  getTarball('jden/registry.butts')
    .on('error', cb)
    .on('entry', function (header, data, next) {
      if (first) {
        first = false
        ref = header.name.match(/-([a-f0-9]{7})\//)[1]
      }
      var filePath = header.name.substr(header.name.indexOf('/'))
      if (header.type !== 'file' || !startsWith(filePath, '/domains/')) {
        return next()
      }
      var domain = filePath.substr('/domains/'.length)
      // console.log('domain:', domain)

      data.pipe(concat(function (buffer) {
        try {
          var json = parseZone(JSON.parse(buffer))
          domains[domain] = json
        } catch (e) {
          // console.error('could not parse', domain)
        }
        next()
      }))

    })
    .on('finish', function () {
      console.log('syncd with .butts registry')
      cb(null, domains)
    })
}

var fetchDomains = memoize(_fetchDomains, {
    maxAge: 900e3,
    async: true,
    prefetch: true
  })

function parseZone(json) {
  // force all keys to be capitalized
  Object.keys(json).forEach(function (key) {
    var upper = key.toUpperCase()
    if (upper === key) { return }
    json[upper] = json[key]
    delete json[key]
  })
  return json
}

fetchDomains(function (err, domains) {
  if (err) {console.error(err)}
  // console.log(domains)
})

module.exports = fetchDomains

function startsWith(str, prefix) {
  return str.indexOf(prefix) === 0
}
require('assert')(startsWith('foo.butts','foo'))