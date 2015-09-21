var MIDI_CLIENT_PORT = 3154;


function Network() {
	var midiClientSocket = null;
	var repeaterSocket = null;
}

Network.prototype.playRepeater = function() {
	if(session && this.repeaterSocket == null) {
		this.repeaterSocket = io.connect('http://' + session['repeaters'] + '.djam.io:80', {'force new connection': true});
		var thisObj = this;
		
		this.repeaterSocket.on('connect', function() {
			thisObj.repeaterSocket.emit('join', {'sid': session.name});
			nwatchers = parseInt($('#stage .watchers').html()) + 1;
			$('#stage .watchers').html(nwatchers);
		});
		
		this.repeaterSocket.on('msg', function(data) {
			thisObj.triggerMessage(JSON.parse(data));
		});
	}
}

Network.prototype.stopRepeater = function() {
	if(user['usid'] && this.repeaterSocket != null) {
		this.repeaterSocket.disconnect();
		this.repeaterSocket = null;
		nwatchers = parseInt($('#stage .watchers').html()) - 1;
		$('#stage .watchers').html(nwatchers);
	}
}

/* MIDI Client Link */
Network.prototype.connectMidiClient = function(callback) {
	// Check if the client is running
	if(!this.midiClientSocket && user.usid) {
		var thisObj = this;
		
		$.ajax({
			url: 'http://127.0.0.1:' + MIDI_CLIENT_PORT + '/',
			type: 'GET',
			crossDomain: true,
			error: function() {
				callback(true);
			},
			success: function(data) {
				thisObj.midiClientSocket = new WebSocket('ws://127.0.0.1:' + MIDI_CLIENT_PORT + '/ws');
				
				thisObj.midiClientSocket.onopen = function() {
					callback(false);
				}
				
				thisObj.midiClientSocket.onmessage = function(msg) {
					if(session) {
						msg = JSON.parse(msg.data);
						
						if(msg['type'] == 'midi' && msg.username == undefined) {
							// Assume local midi
							msg.inst = user.inst;
							msg.server = session.server;
							msg.sid = session.name;
							msg.username = user.username;
							msg.usid = user.usid;
						}
						
						// The server decided to kick us out, probably a timeout
						if(msg.type == 'bye' && msg.username == user.username) {
							thisObj.midiClientSocket.close();
							thisObj.playRepeater();
						}
						
						thisObj.triggerMessage(msg);
					}
				}
				
				thisObj.midiClientSocket.onclose = function() {
					thisObj.midiClientSocket = null;
					stage.removePlayer(user.username);
					thisObj.playRepeater();
				}
					
			}
		});
	} else {
		callback(false);
	}
}



Network.prototype.enterSession = function(callback) { 
	
	if(session) {
		
		// Check if the user is logged in
		
		// Check if the midi client is running
		
		var thisObj = this;
		this.connectMidiClient(function(err) {
			if(!err) {
				// Announce yourself
				user.inst = 'Piano';
				thisObj.sendMessage({'type': 'hello'});
				thisObj.sendMessage({'type': 'newInst', 'inst': user.inst});
			}
			callback(err);
		});
	}
}


Network.prototype.leaveSession = function() {
	if(session) {
		this.sendMessage({'type': 'bye'});
	}
}


Network.prototype.triggerMessage = function(msg) {
	$(document).trigger('msg_' + msg.type, msg);
}


Network.prototype.sendMessage = function(msg) {
	if(this.midiClientSocket && session && user.usid) {
		msg.server = session.server;
		msg.sid = session.name;
		msg.username = user.username;
		msg.usid = user.usid;
		
		this.midiClientSocket.send(JSON.stringify(msg));
	}
}

/*
 * Init
 */

function initNetwork() {
	network = new Network();
}
