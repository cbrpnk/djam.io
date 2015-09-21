BASE_64 = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 
'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
'0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '/',];

$(document).ready(function() {
	
	browserCompatible = false;
	/* Check browser compatibility */
	if(true) {
		browserCompatible = true;
	}
	
	/* Init modules  */
	if(browserCompatible) {
		initAudio();
		initNetwork();
		initMidi();
		initStage();
		initViz();
		initApp();
		
		main();
	}
});


function main() {
	
	// Check if we are in a room
	app.load(window.location.pathname);
	
	app.setupPlayer();
	
	//Hijack Browser functions
	$(document).on('click', 'a, li', function(e) {
		e.preventDefault();
		var href = $(this).attr('href');
		var func = $(this).attr('data-func');
		
		if(href)
			app.load(href);
		else if(func)
			window['app'][func]();
	});
	
	// Browser back button
	$(window).on('popstate', function(e) {
		app.load(window.location.pathname, false);
	});
	
	// Resize
	$(window).on('resize', function() {
		viz.resize();
	});
	
	// Tooltip
	$(document).on('mouseover mouseout', 'li', function(e) {
		if($(this).attr('data-tip'))
			app.tip($(this));
	});
	
	// Chnage playername
	var nameInput = $('#players .localplayer .name');
	nameInput.on('blur', function() {app.changePlayerName(); });
	nameInput.on('keypress', function(e) {
		if(e.keyCode == '13') {
			e.preventDefault();
			return false;
		}
	});
	
	nameInput.on('paste', function(e) {
		e.preventDefault();
		return false;
	});
}


function App() {}

App.prototype.load = function(uri) {
	if(uri != window.location.pathname) window.history.pushState(null, uri, "http://djam.io" + uri);
	
	if(uri != '/') {
		$('#title').hide();
		$('#stage').show();
		$('#room .random').fadeIn();
		stage.load();
		viz.play('stage');
	} else {
		stage.reset();
		$('#stage').hide();
		$('#title').show();
		$('#room .random').fadeOut();
		viz.play('ts');
	}
}

App.prototype.setupPlayer = function() {
	var id = localStorage.getItem('playerId');
	var name = localStorage.getItem('playerName');
	
	if(!id || !name) {
		// Setup new player
		id = '';
		while(id.length < 64) {
			id += BASE_64[Math.floor(Math.random() * BASE_64.length)];
		}
		name = 'Player' + Math.round(Math.random() * 100000);
		
		// Save new player
		localStorage.setItem('playerId', id);
		localStorage.setItem('playerName', name);
	}
	
	player = {};
	player.id = id;
	player.name = name;

	$('#players .localplayer').attr('data-playerid', id);
	$('#players .localplayer .name').html(name);
}

App.prototype.play = function() {
	
	var thisObj = this;
	
	$('#title').fadeOut(function() {
		$('#stage').fadeIn();
		viz.play('stage');
		thisObj.joinRandomRoom();
	});
}

App.prototype.joinRandomRoom = function() {
	var thisObj = this;
	var data = {};
	
	if(room && room.name) {
		data['exclude'] = room.name;
	}
	
	$.ajax({
		url: 'http://data1.djam.io/get_random_room',
		method: 'GET',
		dataType: 'json',
		data: data,
		success: function(res) {
			if(!res.error) {
				thisObj.load('/' + res.roomId);
			} else {
				console.log('no more playable sessions');
			}
		}
	});
}

App.prototype.newRoom = function() {
	console.log('New Room');
}

App.prototype.changePlayerName = function() {
	var newName = $('#players .localplayer .name').html();
	player.name = newName;
	localStorage.setItem('playerName', newName);
}

function initApp() { app = new App(); }
