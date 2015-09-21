var http = require('http');
var url = require('url');
var redis = require('../node_modules/redis');

var getRoom = require('./controllers/get_room.js');
var getRandomRoom = require('./controllers/get_random_room.js');

var IP = '127.0.0.1';
var PORT = 8080;
var DB_IP = '127.0.0.1';
var DB_PORT = 6379;

var db = redis.createClient(DB_PORT, DB_IP);

http.createServer(function(req, res) {
	if(req.method == 'GET') {
		
		// Get pathname & query string
		urlParts = url.parse(req.url, true);
		
		if(urlParts.pathname == '/get_room') {
			getRoom.handler(req, res, db, urlParts.query);
		} else if(urlParts.pathname == '/get_random_room') {
			getRandomRoom.handler(req, res, db, urlParts.query);
		}
		
	} else if(req.method == 'POST') {
		var postData = '';
		
		req.on('data', function(data) {
			postData += data;
		});
		
		req.on('end', function() {
			parsePostData(postData, function(data) {
				//if(req.url == '/play') {
				//	play.handler(req, res, data, sessionDb, db);
				//}
			});
		});
	}
}).listen(PORT, IP);


function parsePostData(data, callback) {
	callback(JSON.parse(data));	
}
