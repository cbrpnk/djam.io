var CHAT_MESSAGE_MAX_LENGTH = 70;

function Stage() {
	this.chatBuffer = '';
	this.chatFadeoutTimers = {};
}


Stage.prototype.build = function() {
	// Session name
	var thisObj = this;
	
	$.ajax({
		'method': 'GET',
		'url': 'http://data1.djam.io/get_session_data?sid=' + window.location.pathname.slice(1),
		'dataType': 'json',
		'mimeType': 'application/json',
		'success': function(res) {
			session = res;
			
			if(session) {
				$('#controls .name a').html(session.name);
				
				for(i in session.players) {
					thisObj.addPlayer(session.players[i]);
				}
			}
			
			session.active = true;
			network.playRepeater();
		}
	});
}


Stage.prototype.destroy = function() {
	network.stopRepeater();
	network.leaveSession();
	
	$('#controls .name a').html();
	
	// Remove players
	if(session) {
		for(i in session.players) {
			stage.removePlayer(session.players[i]);
		}
		
		session = null;
	}
}

Stage.prototype.updatePlayers = function(msg) {
	if(msg.type != 'bye') {
		// If the player is not already in the session let's add it
		this.addPlayer(msg.username);
	} else {
		this.removePlayer[msg.username];
	}
}


Stage.prototype.addPlayer = function(username) {
	if(session.players.indexOf(username) == -1) {
		session.players.push(username);
	}
	
	// This is done is a separate if because a player can be in the array but still not display like when the page is loaded
	if($('#players li[data-username="' + username + '"]').length == 0) {
		// Display player
		$('#players').append('<li data-username="' + username + '"><div class="chat"><div class="content"></div></div><div class="username">' + username + '</div></li>');
		
		$('#players').css('marginTop', -1 * $('#players').outerHeight());
		
		viz.stageViz.setup();
		
		if(username == user.username) {
			$('#controls .join').hide();
			$('#controls .leave').show();
		}
			
		// If maxplyer is reached remove the join button
	}
}


Stage.prototype.removePlayer = function(username) {
	if(session['players'].indexOf(username) != -1) {
		delete session['players'][username];
	}
	
	if($('#players li[data-username="' + username  + '"]').length == 1) {
		$('#stage #players li[data-username="' + username + '"]').remove();
		
		$('#players').css('marginTop', -1 * $('#players').outerHeight());
		
		viz.stageViz.setup();
		
		if(username == user.username) {
			$('#controls .leave').hide();
			$('#controls .join').show();
		}
		
		// If the max players is not reached, make sure the join button is visible
	}
}

Stage.prototype.switchInstrument = function() {
	var newInst = null
	
	// Choose Instrument
	if(user['inst'] == 'Piano') {
		user.inst = 'Drum';
	} else {
		user.inst = 'Piano';
	}
	
	// Send update to the midi client
	network.sendMessage({'type': 'newInst', 'inst': user.inst});
}


// Network messages
$(document).on('msg_hello', function(e, msg) {
	stage.updatePlayers(msg);
});

$(document).on('msg_bye', function(e, msg) {
	stage.removePlayer(msg['username']);
});

$(document).on('msg_midi', function(e, msg) {
	stage.updatePlayers(msg);
	if(audio.instruments[msg.inst])
		$('#players li[data-username="' + msg.username + '"] .instrument').html(msg.inst);
});

$(document).on('msg_chat', function(e, msg) {
	stage.chat(msg['username'], msg['msg']);
});

$(document).on('msg_nwatchers', function(e, msg) {
	$('#controls .watchers').html(msg['nwatchers']);
});

$(document).on('click', '#controls .join', function() {
	network.enterSession(function(err) {
		if(!err) {
			network.stopRepeater();
		}
	});
});

$(document).on('click', '#controls .leave', function() {
	network.leaveSession();
	network.playRepeater();
});


$(document).on('click', '#controls .mute', function() {
	$('#controls .mute').hide();
	$('#controls .unmute').show();
	audio.mute = true;
});

$(document).on('click', '#controls .unmute', function() {
	$('#controls .unmute').hide();
	$('#controls .mute').show();
	audio.mute = false;
});

$(document).on('click', '#controls .viz-off', function() {
	$('#controls .viz-off').hide();
	$('#controls .viz-on').show();
	viz.stop();
});

$(document).on('click', '#controls .viz-on', function() {
	$('#controls .viz-on').hide();
	$('#controls .viz-off').show();
	viz.play('stage');
});

$(document).on('click', '#controls .next', function() {
	//network.leaveSession();
	//network.stopRepeater();
	stage.destroy();
	app.play();
});

// Change instrument
$(document).on('click', '#players>li', function() {
	if($(this).attr('data-username') == user['username']) {
		stage.switchInstrument();
	}
});


/*
 * Init
 */

function initStage() {
	stage = new Stage();
}


