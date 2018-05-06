require('env2')('.env')
var pump = require('pump')
var slack = require('slack')
var through = require('through2')
var hyperquest = require('hyperquest')
var websocket = require('websocket-stream')
var dictionary = require('dictionary-en-us')
var nspell = require('nspell')

var TOKEN = process.env.TOKEN
var me = process.env.ME
var id = 1

slack.rtm.connect({token: TOKEN}, function (err, rtm) {
  if (err) return console.log(err)
  var ws = websocket(rtm.url)
  var autocorrect = through(write)
  pump(ws, autocorrect, ws, function (err) {
    if (err) console.error(err)
  })
})

function write (buf, enc, next) {
  var row = JSON.parse(buf.toString())
  var isMeMessage = row.user === me && row.type === 'message'
  if (!isMeMessage) return next()
  dictionary(function (err, dict) {
    if (err) return console.error(err)
    var spell = nspell(dict)
    row.text.split(' ').forEach(function (word) {
      if (!spell.correct(word)) {
	var msg = {
	  id: id++,
	  type: 'message',
	  user: row.user,
	  channel: row.channel,
	  text: '*' + spell.suggest(word)[0],
	}
	var payload = JSON.stringify(msg)
	console.log(payload)
	next(null, payload)
      }
    })
  })
}

