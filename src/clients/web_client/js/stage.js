function Stage() {}

Stage.prototype.load = function() {
	
	var thisObj = this;
	var roomId = window.location.pathname.substring(1);
	
	this.reset();
	
	$.ajax({
		url: 'http://data1.djam.io/get_room?id=' + roomId,
		method: 'GET',
		dataType: 'json',
		success: function(res) {
			if(!res.error) {
				room = res;
				network.connectPlayback();
				
				var playersObj = {};
				for(var i=0; i<room.players.length; i++) {
					playersObj[room.players[i]] = {
						'id': room.players[i],
						'name': '???',
						'position': i
					};
				}
				room.players = playersObj;
				
				$('#stage .room404').hide();
				// Setup Infos
				$('#infos .room-name .name').html(room.name);
				$('#infos .lurkers').html(room.nLurkers);
				$('#infos .console').html('Press a key on your MIDI instrument to join');
			} else $('#stage .room404').show();
		}
	});
}

Stage.prototype.reset = function() {
	if(room) {
		room = null;
	}
	
	if(network.roomServerSocket) {
		network.roomServerSocket.disconnect();
		network.roomServerSocket = null;
	}
	
	if(network.playbackServerSocket) {
		network.playbackServerSocket.disconnect();
		network.playerbackServerSocket = null;
	}
	
	$('#infos .room-name .name').html('');
	$('#infos .lurkers').html('');
	$('#infos .console').html('');
	$('#players li').not('.localplayer').remove();
	$('#players .localplayer').css('border-bottom', '2px solid #FFF');
}

Stage.prototype.messageHandler = function(msg) {
	if(msg.type == 'midi') {
		// Check if we've seen this player, if not, update the local room
		if(!room.players[msg.playerId]) {
			this.addPlayer(msg.playerId, msg.playerName);
		}
		audio.instruments['Piano'].playMidi(msg.midi);
		viz.stageViz.midiInput(msg);
	} else if(msg.type == 'leave') {
		// A player has left
		this.removePlayer(msg.playerId);
	} else if(msg.type == 'theend') {
		// The session has ended
		$('#stage .room-name').html('');
		$('#stage .room404').show();
		room = null;
	}
}

Stage.prototype.addPlayer = function(playerId, playerName) {
	var newPlayer = {
		'id': playerId,
		'name': playerName,
		'position': Object.keys(room.players).length
	};
	
	room.players[playerId] = newPlayer;
	room.nPlayers++;
	
	if(playerId != player.id) {
		$('#players').append('<li data-playerid="' + newPlayer.id + '"><div class="name">' + newPlayer.name + '</div></li>');
	}
	
	this.assignColors();
	viz.stageViz.setup();
}

Stage.prototype.removePlayer = function(playerId) {
	if(room && playerId != player.id) {
		$('#players li[data-playerid="' + playerId + '"]').remove();
		delete room.players[playerId];
		room.nPlayers--;
	}
}

Stage.prototype.assignColors = function() {
	$('#players li').each(function(i, li) {
		if(room.players[$(li).attr('data-playerid')]) {
			$(li).css('border-bottom', '2px solid rgb(' + viz.stageViz.KEY_COLORS[i] + ')');
		}
	});
}


/*
 * Init
 */

function initStage() {
	stage = new Stage();
}


