#!/usr/bin/env node

var dnsd = require('dnsd')
var dgram = require('dgram')
var domains = require('./domains')
var dns = require('dns')
var getRecord = require('./getRecord')

var proxyServer = '8.8.8.8'

dnsd.createServer(function (req, res) {
  if (req.question && endsIn(req.question[0].name, '.butts')) {
    // console.log('intercepted', req.question)

      var domain = req.question[0].name.split('.')
      var type = req.question[0].type
      var start = domain[domain.length-2]+'.'+domain[domain.length-1]
      var name = domain.slice(0,domain.length-2).join('.') || '@'
      // console.log('resolving', domain, type, start, name)
      

      function resolveRecord(all, start, name, type) {
        console.log('r', start, name, type)
        if (!endsIn(start, '.butts')) { console.log('s',start); return null}
        try {
          var answer = all[start][type].filter(function (el) {
            return el.name === name
            }).slice(0,1)[0]
          cosnsole.log(start, name, type, answer)
        } catch (e) {}
          if (answer) {
            var x = [{
              name: (name == '@' ? '' : name + '.') + start,
              type: type,
              data: answer.ip || answer.alias,
              ttl: 900
            }]
            console.log('->', x)
            return x
          } else if (type === 'CNAME') {
            return null
          } else {
            var cname = resolveRecord(all, start, name, 'CNAME')[0]
            console.log('cname', cname)
            if (!cname) { return null }
            if (!endsIn(cname.data, '.butts.')) {
              // beyond our authority, delegate!
              return [cname]
            }
            return [cname].concat(
                resolveRecord(all, cname.data.substr(0, cname.data.length-1), '@', type)
              )
            // return resolveRecord(all, start, name,)
          }
      }

    domains(function (err, all) {
      if (err) {console.error(err); res.end() }
      // console.log(all[start][type])
      try {
        var answer = resolveRecord(all, start, name, type)
        
        if (!answer) {
          return res.end()
        }

        answer.forEach(function (response) {
          res.answer.push(response)
        })
        
        if (answer[answer.length-1].type === 'CNAME' && type !== 'CNAME') {
          // delegate to other server
          console.log('resolve', answer[answer.length-1].data, type)
          dns.resolve(answer[answer.length-1].data, type, function (err, result) {
            if (err) { console.error(err); return res.end() }
            console.log('resolved', result)
            result.forEach(function (response) {
              res.answer.push({type: 'A', name: answer[answer.length-1].data, data: response, ttl: 900})
            })
            res.end()

          })
        } else {
          return res.end()
        }


      } catch (e) {
        console.error(e)
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