var dgram = require('dgram');
var redis = require('../node_modules/redis');

var DB_IP = '127.0.0.1';
var DB_PORT = 6379;
var CHECK_USER_TIMEOUT = 30000 // 30 seconds
var MESSAGE_TYPES = ['hello', 'bye', 'midi', 'chat'];
var SERVER_NAME = 'ses1';
var SESSION_DB_IP = '127.0.0.1';
var SESSION_DB_PORT = 6379;

// This and the CHECK_USER_TIMEOUT are bound by what i think is some sort of socket timeout (roughly 2 min on the server)
var USER_SESSION_TIMEOUT = 60000; // 1 minute


// user cache
var userCache = {};

// Repeater cache
var repeaterCache = [
	{
		'ip': '127.0.0.1', 
		'port': '1988'
	}
];

// Session cache
var sessionCache = {};

// Db connections
var db = redis.createClient(DB_PORT, DB_IP);
var sessionDb = redis.createClient(SESSION_DB_PORT, SESSION_DB_IP);

// Sockets
var clientSocket = dgram.createSocket('udp4');
var repeaterSocket = dgram.createSocket('udp4');


// Clean data that could have been left out previously by the server
// after being killed




// Incomming from client
clientSocket.on('message', function(msg, rinfo) {
	msg = JSON.parse(msg.toString('utf8'));
	
	checkSession(msg, function(err) {
		if(!err) {
			checkUser(msg, rinfo, function(err) {
				if(!err) {
					checkUserInSession(msg, function(err) {
						if(!err) {
							checkMessage(msg, function(err) {
								if(!err) {
									stampTime(msg, function(err) {
										if(!err) {
											broadcastMessage(msg);
										}
									});
								} else {
									console.log('error in checkMessage');
								}
							});
						} else {
							console.log('error in checkUserInSession');
						}
					});	
				} else {
					console.log('error in checkUser');
				}
			});
		} else {
			console.log('error in checkSession');
		}
	});
});

function checkSession(msg, callback) {
	getSession(msg['sid'], function(err, session) {
		callback(err);
	});
}


function getSession(sid, callback) {
	session = sessionCache[sid];
	if(session == undefined) {
		sessionDb.hgetall('s:' + sid, function(err, session) {
			if(!err && session) {
				sessionDb.smembers('p:' + sid, function(err, players) {
					sessionCache[sid] = session;
					sessionCache[sid]['players'] = players;
					sessionCache[sid]['maxplayers'] = parseInt(sessionCache[sid]['maxplayers']);
					sessionCache[sid]['nplayers'] = parseInt(sessionCache[sid]['nplayers']);
					sessionCache[sid]['nwatchers'] = parseInt(sessionCache[sid]['nwatchers']);
					callback(false, session);
				});
			} else {
				callback(true, session);
			}
		});
	} else {
		callback(null, session);
	}
}


function checkUser(msg, rinfo, callback) {
	getUser(msg['username'], function(err, user) {
		if(!err && user && msg['usid'] == user['usid']) {
			
			// Add user to the cache
			if(!userCache[msg['username']]) {
				userCache[msg['username']] = user;
			}
			
			if(user['ip'] != rinfo['address'] || user['port'] != rinfo['port']) {
				userCache[msg['username']]['ip'] = rinfo['address'];
				userCache[msg['username']]['port'] = rinfo['port'];
			}
			
			callback(err);
		} else {
			callback(true);
		}
	});
}


function getUser(username, callback) {
	user = userCache[username];
	if(user == undefined) {
		db.hgetall('u:' + username, function(err, user) {
			callback(err, user);
		});
	} else callback(null, user);
}


function checkUserInSession(msg, callback) {
	session = sessionCache[msg['sid']];
	
	if(session['players'].indexOf(msg['username']) != -1) {
		// The user is already in the session
		callback(false);
	} else if(session['nplayers'] < session['maxplayers']) {
		// Add the user to the session
		sessionDb.multi()
			.sadd('p:' + session['name'], msg['username'])
			.hincrby('s:' + session['name'], 'nplayers', 1)
			.exec(function(err, res) {
				sessionCache[session['name']]['players'].push(msg['username']);
				sessionCache[session['name']]['nplayers']++;
				
				// Add session to the user
				db.hset('u:' + msg['username'], 'sid', msg['sid'], function(err, res) {
					userCache[msg['username']]['sid'] = msg['sid'];
					callback(false);
				});
				
			});
	} else {
		// Don't transmit the message
		callback(true);
	}
}


function checkMessage(msg, callback) {
	
	// More checks should be implemented in ther future
	// For instance check the size of the message
	// Make sure the user is not transmitted flawed data
	
	if(MESSAGE_TYPES.indexOf(msg['type']) != -1) {
		callback(false);
	} else {
		callback(true);
	}
}


function stampTime(msg, callback) {
	if(msg['type'] != 'bye') {
		userCache[msg['username']]['lastseen'] = new Date().getTime();
	}
	callback(false);
}


function broadcastMessage(msg) {
	if(msg['type'] == 'bye')
		console.log(msg);
	session = sessionCache[msg['sid']];
	
	// Remove sensible information from message
	delete msg['usid'];
	msgBuffer = Buffer(JSON.stringify(msg), 'utf8');
	
	// Send to clients/players
	if(session && session['players'].length > 0) {
		for(i in session['players']) {
			playerName = session['players'][i];
			// Don't send midi messages back to the sender
			if(((msg['type'] == 'midi' || msg['type'] == 'chat') && playerName != msg['username']) || (msg['type'] != 'midi' && msg['type'] != 'chat')) {
				clientSocket.send(msgBuffer, 0, msgBuffer.length, userCache[playerName]['port'], userCache[playerName]['ip']);
			}
		}
		
		// If the message didn't come from a repeater
		// Send it to them
		if(msg['type'] != 'nwatchers') {
			for(i in repeaterCache) {
				repeaterSocket.send(msgBuffer, 0, msgBuffer.length, repeaterCache[i]['port'], repeaterCache[i]['ip']);
			}
		}
		
		if(msg['type'] == 'bye') {
			leaveSession(msg['username'], msg['sid']);
		}
	}
}


function leaveSession(username, sid) {
	// Remove user from user cache
	delete userCache[username];
	
	// Remove user from session cache
	delete sessionCache[sid]['players'].splice(sessionCache[sid]['players'].indexOf(username), 1);
	
	// Remove user from session in the db
	sessionDb.multi()
		.srem('p:' + sid, username)
		.hincrby('s:' + sid, 'nplayers', -1)
		.exec(function(err, res) {
			// Remove session from user
			db.hdel('u:' + username, 'sid', function(err, res) { 
				sessionCache[sid]['nplayers']--;
				if(sessionCache[sid]['nplayers'] <= 0) {
					endSession(sid);
				}
			});
		});
}


function endSession(sid) {
	// To implement, since I'm a lazy dev I don't want to recreate a new session each time I
	// want to test something nor to I feel like baking in a dev mode
}


// User session timeout
// The session does not need to be timed out because when the last user times out the sessions automatically ends
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


/* Recieve mesages from repeaters  */
repeaterSocket.on('message', function(msg, rinfo) {
	msg = JSON.parse(msg.toString('utf8'));
	if(msg['type'] == 'nwatchers') {
		broadcastMessage(msg);
	}
});

clientSocket.bind(1509);
repeaterSocket.bind(2004);
