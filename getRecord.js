function getRecord(records, domain, type, cb) {
  return getRecordSingle(records, domain, type, function (err, record) {
    if (err) { return cb(err) }
    if (type.toLowerCase() !== 'cname' && record.type === 'cname') {
      return getRecordSingle(records, record.data[0], type, function (err, record2) {
        if (err) { return cb(err)}
        // todo: support multiple RRs of same type
        return cb(err, [record, record2])
      })
    }
    
    return cb(err, [record])
 }) 
}

function getRecordSingle(records, domain, type, origDomain, cb) {
  if (!cb) {
    cb = origDomain
    origDomain = null
  }
  origDomain = serializeDomain(origDomain || domain)
  domain = parseDomain(domain)
  // console.log('l', domain)

  // traverse the domain hierarchy one level at a time
  var subdomain = domain.shift()
  if (!(subdomain in records)) {
    return cb(null, false)
  }
  var subrecords = records[subdomain]
  // console.log('x', subdomain, subrecords, domain.length)

  // if there are more levels to go
  if (domain.length) {
    // recurse
    return getRecordSingle(subrecords, domain, type, origDomain, cb)
  }

  // look up the record by type
  var typeKey = '@'+type.toLowerCase()
  if (typeKey in subrecords) {
    var data = subrecords[typeKey]

    return cb(null, {
      data: data,
      name: origDomain,
      type: serializeType(type)
    })
  }
  // the record does not exist
  else if (typeKey === '@cname'){
    // if they were looking up a cname and it's not there,
    // we got nothin'
  } else if ('@cname' in subrecords){
    // fall back to returning a cname if it exists
    var data = subrecords['@cname']
  
    return cb(null, {
      data: data,
      name: origDomain,
      type: serializeType('@cname')
    })
  }
  
  return cb(new Error('not found'))

  cb(null, [])
}

function serializeType(type) {
  return startsWith(type, '@')
            ? type.substr(1)
            : type
}

function serializeDomain(domain) {
  if (typeof domain === 'string') {
    return endsIn(domain,'.')
              ? domain
              : domain + '.'
  }
  return domain.slice().reverse().join('.') + '.'
}
require('assert')(serializeDomain('foo.bar') === 'foo.bar.')
require('assert')(serializeDomain(['bar','foo']) === 'foo.bar.')

function parseDomain(domain) {
  if (Array.isArray(domain)) { return domain }
  if (endsIn(domain, '.')) {
    domain = domain.substr(0, domain.length-1)
  }
  return domain.split('.').reverse()
}
require('assert')(parseDomain('foo.bar.').length === 2)
require('assert')(parseDomain('foo.bar.')[0] === 'bar')
require('assert')(parseDomain('foo.bar.')[1] === 'foo')

function endsIn(str, suffix) {
  return str.substr(str.length - suffix.length) === suffix
}

function startsWith(str, prefix) {
  return str.indexOf(prefix) === 0
}

module.exports = getRecord
module.exports.single = getRecordSingle