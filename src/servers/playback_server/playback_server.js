var dgram = require('dgram');
var io = require('../node_modules/socket.io')(3000);
var redis = require('../node_modules/redis');

var DB_IP = '127.0.0.1';
var DB_PORT = 6379;
var ROOM_SERVER = {'ip': '127.0.0.1', 'port': 2004};

var db = redis.createClient(DB_PORT, DB_IP);
var roomServerSocket = dgram.createSocket('udp4');

/* Browser websocket communication  */
io.on('connection', function(socket) {
	
	socket.on('play', function(data) {
		
		// Sanitize data
			
		if(data.roomId) {
			db.hgetall('room:' + data.roomId, function(err, roomData) {
				if(!err) {
					socket.join(roomData.id);
				}
			});
		}
	});
	
	socket.on('disconnect', function() {
		// Decrement number of watchers
	});
	
	/*
	socket.on('join', function(data) {
		
		// Check if session id exists
		sessionDb.hgetall('s:' + data.sid, function(err, dbResult) {
			
			if(dbResult) {
				if(data.sid) {
					socket.join(data.sid);
					
					currentSession = data.sid;
					
					// Add a watcher
					sessionDb.hincrby('s:' + data.sid, 'nwatchers', 1, function(err, nwatchers) {
						msg = {'type': 'nwatchers', 'nwatchers': nwatchers, 'sid': currentSession};
						sendToSessionServer(msg);
						sendToListners(msg);
					});
				} else {
					socket.emit('status', 'error');
				}
				
			}
			
		});
		
	});

	
	socket.on('disconnect', function() {
		if(currentSession) {
			sessionDb.hincrby('s:' + currentSession, 'nwatchers', -1, function(err, nwatchers) {
				msg = {'type': 'nwatchers', 'nwatchers': nwatchers, 'sid': currentSession};
				sendToSessionServer(msg);
				sendToListners(msg);
				
				currentSession = null;
			});
		}
	});
	*/
});


/* Session server communication */

roomServerSocket.on('message', function(rawPacket, rinfo) {
	var msg = JSON.parse(rawPacket.toString('utf8'));
	io.to(msg['room']).emit('msg', JSON.stringify(msg));		
});

function sendToSessionServer(msg) {
	var msgBuffer = Buffer(JSON.stringify(msg), 'utf8');
	roomServerSocket.send(msgBuffer, 0, msgBuffer.length, ROOM_SERVER['port'], ROOM_SERVER['ip']);
}

roomServerSocket.bind(1988);
