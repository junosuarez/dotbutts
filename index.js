#!/usr/bin/env node

var dnsd = require('dnsd')
var dgram = require('dgram')
var getDomains = require('./domains')
var dns = require('dns')
var getRecord = require('./getRecord')

var proxyServer = '8.8.8.8'

var server = dnsd.createServer(handler)
server.zone('butts', 'ns.dotbutts.biz', 'jden@jden.us', 'now', '2h', '30m', '2w', '10m')
server.listen(53)
console.log('.butts dns proxy is running')
console.log('set your dns server to localhost to resolve .butts domains')


function handler(req, res) {
  if (!req.question || !endsIn(req.question[0].name, 'butts')) {
    return proxy(req, res)
  }
  // console.log('intercepted', req.question)

  var question = req.question[0]
  
  return getDomains(function (err, domains) {
    if (err) {console.error('wtf', err, req.question); res.end() }

    getRecord(domains, question.name, question.type, function (err, answer) {
      // console.log('answer', answer)
      if (!answer || !answer[0]) {
        return proxy(req, res)
      }

      answer.forEach(function (response) {
        if (!response) return
        response.ttl = 5
        // response data has to be singular
        // for now we only support the first answer
        // for a given record type
        response.type = response.type.toUpperCase()
        response.data = response.data[0]
        res.answer.push(response)
      })

      if (res.answer[res.answer.length-1].type === 'CNAME'
            && question.type !== 'CNAME') {
        // delegate to other server
        try {
          dns.resolve(res.answer[res.answer.length-1].data, question.type, function (err, result) {
            if (err) { console.error('wtf', err, req.question); return res.end() }
            result.forEach(function (response) {
              res.answer.push({type: 'A', name: res.answer[res.answer.length-1].data, data: response, ttl: 900})
            })
            res.end()

          })
        } catch (e) {
          console.error('wtf', e, req.question)
          return res.end()
        }
      } else {
        return res.end()
      }


    })
  })

}

function endsIn(str, suffix) {
  return str.substr(str.length - suffix.length) === suffix
}
require('assert')(endsIn('foo.butts','.butts'))



function proxy(req, res) {
  // hats off to mafintosh's dnsjack
  // console.log('proxying', req.question)
  var sock = dgram.createSocket('udp4')
  var message = req.toBinary()
  sock.send(message, 0, message.length, 53, proxyServer)
  sock.on('error', console.error)
  sock.on('message', function(response) {
    res.end(response)
    sock.close()
  })
}