var io = require('../node_modules/socket.io')(1509);
var dgram = require('dgram');
var redis = require('../node_modules/redis');

var PLAYBACK_SERVER_PORT = 2004; // The year of love

var DB_IP = '127.0.0.1';
var DB_PORT = 6379;
var CHECK_USER_TIMEOUT = 30000 // 30 seconds

// This and the CHECK_USER_TIMEOUT are bound by what i think is some sort of socket timeout (roughly 2 min on the server)
var USER_SESSION_TIMEOUT = 60000; // 1 minute

// Repeater cache
var playbackServers = [
	{
		'ip': '127.0.0.1', 
		'port': '1988'
	}
];

// Key = roomId
var rooms = {};

// Db connections
var db = redis.createClient(DB_PORT, DB_IP);

// Socket to playback servers
var playbackServerSocket = dgram.createSocket('udp4');


// Load current rooms
/* 
	Since we use only one server for now, the most likely reason there are room in the db to be loaded
	is that the server shutdown abruptly. So we load the rooms back and hopefully the client didn't notice.
	If we ever have to use multiple room servers at once, make sure this rooms server loads only it's rooms
	and not the others.
*/
db.smembers('rooms', function(err, roomsResult) {
	for(i in roomsResult) {
		loadRoom(roomsResult[i], function() {});
	}
});


io.on('connection', function(socket) {
	
	var playerId = null;
	var room = null;
	
	socket.on('message', function(msg) {
		msg = JSON.parse(msg);
		
		// This is set when we get the first packet and should not change for the lifetime of the socket.
		if(!playerId) playerId = msg.playerId;
		
		checkRoom(msg.room, function(err) {
			if(!err) {
				
				checkPlayer(playerId, msg.room, msg.playerId, function(err) {
					if(!err) {
						
						// We have to recieve a leave message(wich sets the room to null) before allowing a user in a new room
						if(!room) {
							room = msg.room;
							socket.join(room);
						} else msg.room = room;
						
						stampTime(msg, function(err) {
							
							if(!err) {
								dispatchMessage(socket, msg);
							}
							
						});
					}
				});
			}
		});
		
	});
	
	// The send leave message to everyone
	socket.on('disconnect', function() {
		leaveRoom(socket, playerId, room);
	});
	
});


function checkRoom(roomId, callback) {
	if(!rooms[roomId]) {
		loadRoom(roomId, function(err) {
			callback(err);
		});
	} else callback(null);
}


function loadRoom(roomId, callback) {
	db.hgetall('room:' + roomId, function(err, room) {
		if(!err && room) {
			rooms[roomId] = room;
			db.smembers('room_players:' + roomId, function(err, players) {
				if(!err && players) {
					rooms[roomId].players = players;	
					rooms[roomId].lastActive = new Date().getTime();
				}
				callback(err);
			});
		} else callback(err);
	});	
}


function checkPlayer(playerId, room, msgPlayerId, callback) {
	if(playerId == msgPlayerId) {
		if(rooms[room].players.indexOf(playerId) != -1) {
			callback(false);
		} else if(rooms[room].nPlayers < rooms[room].maxPlayers) {
			
			// Add player to the room
			rooms[room].players.push(playerId);
			rooms[room].nPlayers++;
			
			db.sadd('room_players:' + room, playerId, function(err) {
				if(!err) {
					db.hincrby('room:' + room, 'nPlayers', 1, function(err) {
						callback(err);
					});
				} else callback(err);
			});
			
		} else callback(true);
	} else callback(true);
}


function stampTime(msg, callback) {
	rooms[msg.room].lastActive = new Date().getTime();
	callback(null);
}


function leaveRoom(socket, playerId, roomId, callback) {
	// Remove from local player list
	var index = rooms[roomId].players.indexOf(playerId);
	if(index != -1) {
		rooms[roomId].players.splice(index, 1);
	}
	
	// Remove from db
	db.srem('room_players:' + roomId, playerId, function(err) {
		if(!err) {
			rooms[roomId].nPlayers--;
			db.hincrby('room:' + roomId, 'nPlayers', -1, function(err, nPlayers) {
				
				dispatchMessage(socket, {'type': 'leave', 'room': roomId, 'playerId': playerId}, function(err) {
	
					if(!err && nPlayers == 0) {
						dispatchMessage(socket, {'type': 'theend', 'room': roomId});
					}
				});
			});
		}
	});
}


function dispatchMessage(socket, msg, callback) {
	var msgToPlayers = ['leave', 'midi', 'theend', 'peerOffer', 'peerAnswer', 'peerIceCandidate'];
	var msgToPlayback = ['leave', 'midi', 'theend'];
	
	// Send to other players
	if(msgToPlayers.indexOf(msg.type) != -1) {
		socket.broadcast.to(msg.room).emit('msg', JSON.stringify(msg));
	}
	
	// Send to playback servers
	if(msgToPlayback.indexOf(msg.type) != -1) {
		sendToPlaybackServers(msg);
	}

	if(callback) callback();
}


function sendToPlaybackServers(msg) {
	var msgBuffer = Buffer(JSON.stringify(msg), 'utf8');
	for(i in playbackServers) {
		playbackServerSocket.send(msgBuffer, 0, msgBuffer.length, playbackServers[i]['port'], playbackServers[i]['ip']);
	}
}



// User session timeout
// The session does not need to be timed out because when the last user times out the sessions automatically ends
/*
setInterval(function() {
	now = new Date().getTime();
	
	for(user in userCache) {
		userObj = userCache[user];
		if((now - userObj['lastseen']) > USER_SESSION_TIMEOUT) {
			// Timeout user
			broadcastMessage({'type': 'bye', 'username': userObj['username'], 'sid': userObj['sid'], 'server': SERVER_NAME});
		}
	}
}, CHECK_USER_TIMEOUT);
*/

/* Recieve mesages from repeaters  */
/*
repeaterSocket.on('message', function(msg, rinfo) {
	msg = JSON.parse(msg.toString('utf8'));
	if(msg['type'] == 'nwatchers') {
		broadcastMessage(msg);
	}
});
*/

playbackServerSocket.bind(PLAYBACK_SERVER_PORT);
