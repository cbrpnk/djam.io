function Network() {
	this.playbackServerSocket = null;
	this.roomServerSocket = null;
	this.peerNetwork = new PeerNetwork();
}


Network.prototype.connectPlayback = function() {
	
	var thisObj = this;
	this.playbackServerSocket = io.connect('http://playback.djam.io:80', {'force new connection': true});
	
	this.playbackServerSocket.on('connect', function() {
		thisObj.playbackServerSocket.emit('play', {'roomId': room.id});
	});
	
	this.playbackServerSocket.on('msg', function(msg) {
		msg = JSON.parse(msg);
		stage.messageHandler(msg);
	});
}

Network.prototype.connectRoom = function(callback) {
	var thisObj = this;
	
	this.roomServerSocket = io.connect('http://room.djam.io:80', {'force new connection': true});
	
	this.roomServerSocket.on('connect', function() {
		callback();
	});
	
	this.roomServerSocket.on('msg', function(msg) {
		msg = JSON.parse(msg);
		
		if(msg.type == 'peerOffer') {
			thisObj.peerNetwork.acceptPeer(msg);
		} else if(msg.type == 'peerAnswer') {
			thisObj.peerNetwork.connectAnswer(msg);
		} else if(msg.type == 'peerIceCandidate') {
			thisObj.peerNetwork.ice(msg);
		} else {
			stage.messageHandler(msg);
		}
	});
}

Network.prototype.disconnectRoom = function() {
	this.roomServerSocket.disconnect();
}

Network.prototype.sendMidi = function(msg) {
	
	// Send the first midi packet then restrict the range to playable notes for subsequent messages
	if(!room.players[player.id]) {
		var thisObj = this;
		
		if(this.playbackServerSocket) this.playbackServerSocket.disconnect();
		
		if(!this.roomServerSocket) this.connectRoom(function() {
			thisObj.sendToRoomServer(msg);
			
			// Connect to peers
			thisObj.peerNetwork.connect();
		});
		else thisObj.sendToRoomServer(msg);
	}
	
}

Network.prototype.sendToRoomServer = function(msg) {
	this.roomServerSocket.send(JSON.stringify(msg));
}





/* 
 * This class is risponsible for maintaining the direct UDP webrtc peer connections to the other players.
 * Only midi messages, which are latency sensitive should go through the webRTC data channels, every further
 * communication should go through the server.
 */


function PeerNetwork() {
	
	this.ICE_SERVERS = {
		iceServers: [{
			url: 'stun:stun.l.google.com:19302'
		}]
	};
	
	this.MEDIA_CONSTRAINTS = {
		optional: [],
		mandatory: {
			OfferToReceiveAudio: false,
			OfferToReceiveVideo: false
		}
	};
	
	this.OPTIONS = {
		optional: [{
			RtpDataChannels: true
		}]
	};

	this.RELIABLE = false; // We want to optimize for latency

	/*
	this.peers = {
		'playerId': {
			'peerConnection': obj,
			'dataChannel': obj,
		}
	};
	*/
	this.peers = {};
}


// Accepts an array of player Ids to connect to
PeerNetwork.prototype.connect = function() {
	
	for(playerId in room.players) {
		if(playerId != player.id && !this.peers[playerId]) {
			var thisObj = this;
			var offer = null;
			var offerMsg = null;
			
			// Create peer
			var peer = new webkitRTCPeerConnection(this.ICE_SERVERS, this.OPTIONS);
			
			var dataChannel = peer.createDataChannel('midiChannel', {
				reliable: this.RELIABLE
			});
			
			
			// ice candidate
			peer.onicecandidate = function(e) {
				if(!e || !e.candidate) return;
				network.sendToRoomServer({'type': 'peerIceCandidate', 'room': room.id, 'playerId': player.id, 'target': playerId, 'iceCandidate': e});
			}
			
			peer.createOffer(function(offerSessionDesc) {
				peer.setLocalDescription(offerSessionDesc);
				
				// Attach event listeners
				thisObj.setEventHandlers(dataChannel);
				
				// Send message
				network.sendToRoomServer({'type': 'peerOffer', 'room': room.id, 'playerId': player.id, 'target': playerId, 'offer': offerSessionDesc});
				
				// Store peer
				thisObj.peers[playerId] = {
					'peerConnection': peer,
					'dataChannel': dataChannel
				};
				
			}, null, this.MEDIA_CONSTRAINTS);
			
		}
	}
}

PeerNetwork.prototype.ice = function(msg) {
	this.peers[msg.playerId].peerConnection.addIceCandidate(new RTCIceCandidate(msg.iceCandidate));
}

// The peer we've tried to connect to sent us an answer
// This finalizes the connection
PeerNetwork.prototype.connectAnswer = function(answerMsg) {
	this.peers[answerMsg.playerId].peerConnection.setRemoteDescription(new RTCSessionDescription(answerMsg.answer));
}

// We've recieve a new offer from another peer
PeerNetwork.prototype.acceptPeer = function(offerMsg) {
	
	var thisObj = this;
	
	var peer = new webkitRTCPeerConnection(this.ICE_SERVERS, this.OPTIONS);
	
	var dataChannel = peer.createDataChannel('midiChannel', {
		reliable: this.RELIABLE
	});
	
	// ice candidate
	peer.onicecandidate = function(e) {
		if(!e || !e.candidate) return;
		network.sendToRoomServer({'type': 'peerIceCandidate', 'room': room.id, 'playerId': player.id, 'target': offerMsg.playerId, 'iceCandidate': e});
	}
	
	peer.setRemoteDescription(new RTCSessionDescription(offerMsg.offer));
	peer.createAnswer(function(answerSessionDesc) {
		peer.setLocalDescription(answerSessionDesc);
		
		// Set event handlers
		thisObj.setEventHandlers(dataChannel);
		dataChannel.onopen = function() {console.log('open');}
		
		// Send message
		var msg = {'type': 'peerAnswer', 'room': room.id, 'playerId': player.id, 'target': offerMsg.playerId, 'answer': answerSessionDesc};
		network.sendToRoomServer(msg);
		
		// Store peer
		thisObj.peers[offerMsg.playerId] = {
			'peerConnection': peer,
			'dataChannel': dataChannel
		};
		
		
	}, null, this.MEDIA_CONSTRAINTS);
}


PeerNetwork.prototype.setEventHandlers = function(dataChannel) {
		
	dataChannel.onopen = function(e) {
		console.log('Connected');
	}
	
	dataChannel.onmessage = function(e) {
		console.log(e);
	}
	
}


PeerNetwork.prototype.sendToPeers = function(msg) {
	
}


PeerNetwork.prototype.removePeer = function(playerId) {
	
}


// Remove every peers
PeerNetwork.prototype.reset = function() {
	
}


/*
 * Init
 */

function initNetwork() {
	network = new Network();
}
