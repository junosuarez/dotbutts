#!/usr/bin/env node

var dnsd = require('dnsd')
var dgram = require('dgram')
var domains = require('./domains')

var proxyServer = '8.8.8.8'

dnsd.createServer(function (req, res) {
  if (req.question && endsIn(req.question[0].name, '.butts')) {
    // console.log('intercepted', req.question)

      var domain = req.question[0].name.split('.')
      var type = req.question[0].type
      var start = domain[domain.length-2]+'.'+domain[domain.length-1]
      var name = domain.slice(0,domain.length-2).join('.') || '@'
      // console.log('resolving', domain, type, start, name)
      

    domains(function (err, all) {
      if (err) {console.error(err); res.end() }
      // console.log(all[start][type])
      try {
        var answer = all[start][type].filter(function (el) {
          return el.name === name
        }).slice(0,1)[0] || {}
       
        if (answer.ip) { return res.end(answer.ip) }
        if (answer.alias) { return res.end(answer.alias) }
        res.end()

      } catch (e) {
        console.log(e)
        return res.end()
      }
    })

  } else {
    proxy(req, res)
  }


}).listen(53)
console.log('.butts dns proxy is running')
console.log('set your dns server to localhost to resolve .butts domains')

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