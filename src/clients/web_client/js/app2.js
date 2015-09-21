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
		initStage();
		initViz();
		initApp();
		
		main();
	}
});


function main() {
	
	var tmpUser = localStorage.getItem('user');
	if(tmpUser)
		user = JSON.parse(tmpUser);
	else
		user = {};
	
	app.logInterface();
		
	
	// Load the current page
	app.load(window.location.pathname);
	
	
	/* Hijack Browser functions */
	
	$(document).on('click', 'a, li', function(e) {
		e.preventDefault();
		var href = $(this).attr('href');
		var func = $(this).attr('data-func');
		
		if(href)
			app.load(href);
		else if(func)
			window['app'][func]();
	});
	
	// Keystroke 
	$(document).on('keydown keypress', function(e) {
		if($('input:focus').length == 0) {
			// Do chat
		} else if(e.which == 13) {
			var func = $('.popup .button').attr('data-func');
			window['app'][func]();
		}
	});
	
	// Browser back button
	$(window).on('popstate', function(e) {
		app.load(window.location.pathname, false);
	});
	
	// Window resize
	$(window).on('resize', function() {
		viz.resize();
	});
	
	// Tooltip
	$(document).on('mouseover mouseout', 'li', function(e) {
		if($(this).attr('data-tip'))
			app.tip($(this));
	});
	
}

function App() {
	
}


App.prototype.load = function(uri) {
	window.history.pushState(null, uri, "http://djam.io" + uri);
	
	// Hide popups
	this.popdown();
	
	// Call the controller
	var func = 'showTitleScreen';
	if(uri != '/')
		func = 'showStage';
	
	window['app'][func]();
}

App.prototype.logInterface = function() {
	if(user.usid) {
		$('#menu .username a').html(user.username);
		
		// Display logged in interface	
		$('*[data-anon="true"]').hide();
		$('*[data-anon="false"]').show();
	} else {
		// Display anonymous interface
		$('*[data-anon="false"]').hide();
		$('*[data-anon="true"]').show();
	}
}

/* Menu  */
App.prototype.toggleExtra = function() {
	if(!$('#menu .extra').is(':visible')) {
		$('#menu .extra').show();
		$('#menu > li:last-child a').html('Less');
	} else {
		$('#menu .extra').hide();
		$('#menu > li:last-child a').html('More');
	}
}

/* Popup */

App.prototype.popup = function(id) {
	var form = $('#' + id).clone();
	var popup = $('<div class="popup"><a class="close" data-func="popdown"></a><div class="content"></div></div>');
	
	if($('.popup').length > 0) {
		this.popdown(function() {
			open();
		});
	} else open();

	function open() {
		$('.content', popup).append(form);
		$('body').append(popup);
		popup.fadeIn('fast');
		$('.form input[type="text"]:first-child').focus();
	}
}

App.prototype.popdown = function(callback) {
	$('.popup').fadeOut('fast', function() {
		$('.popup').remove();
		if(callback)
			callback();
	});
}

/* Tooltip  */
App.prototype.tip = function(elem) {
	if($('.tip', elem).length > 0) {
		window.setTimeout(function() {
			$('.tip', elem).remove();
		}, 300);
	} else {
		var elemX = 0;
		if(elem.offset().left < 300) {
			elemX = $(elem).offset().left + $(elem).outerWidth() + 30;
		} else {
			elemX = $(elem).offset().left - 50;
		}
		var elemY = $(elem).offset().top;
		var tip = $('<div class="tip" style="top:' + elemY + 'px;left:' + elemX + 'px">' + elem.attr('data-tip') + '</div>');
		
		window.setTimeout(function() {
			if($(elem).is(':hover')) {
				$(elem).append(tip);
			}
		}, 600);
		
	}
}

App.prototype.showTip = function() {
	
}

/* Controllers */

App.prototype.showLogin = function() {
	this.popup('login');
}


App.prototype.doLogin = function() {
	var username = $('.popup #login input[data-name="username"]').val();
	var password = $('.popup #login input[data-name="password"]').val();
	
	var data = {'username': username, 'password': password};
	var thisObj = this;
	
	$.ajax({
		url: 'http://data1.djam.io/login',
		method: 'POST',
		dataType: 'json',
		data: JSON.stringify(data),
		success: function(res) {
			if(res.status) {
				user.username = res.username;
				user.usid = res.usid;
				localStorage.setItem('user', JSON.stringify(user));
				thisObj.popdown();
				thisObj.logInterface();
			} else {
				$('.popup #login .error').html(text[res.error]);
			}
		}
	});
}

App.prototype.logout = function() {
	
	var thisObj = this;
	
	network.leaveSession();
	network.stopRepeater();
	
	$.ajax({
      url: 'http://data1.djam.io/logout',
      method: 'POST',
      dataType: 'json',
      data: JSON.stringify({'username': user.username, 'usid': user.usid}),
      success: function(res) {
         user.username = null;
         user.usid = null;
         localStorage.setItem('user', JSON.stringify(user));
         thisObj.popdown();
			thisObj.logInterface();
      }
   });
}


App.prototype.showNew = function() {
	this.popup('new');
}

App.prototype.showOptions = function() {
	this.popup('options');
}

App.prototype.play = function() {
	// If play is true the server will try to add the user to the session
	var data = {'play': false};
	var thisObj = this;
	
	if(user.usid) {
		data.usid = user.usid;
		
		// Check if the midi client is running
		data['play'] = true;
	}
	
	if(session) {
		data['not'] = session.name;
	}
	
	$.ajax({
		url: 'http://data1.djam.io/play',
		method: 'POST',
		dataType: 'json',
		data: JSON.stringify(data),
		success: function(res) {
			if(res) {
				thisObj.load(res.path);
			} else {
				console.log('no more playable sessions');
			}
		}
	});
}


App.prototype.showSignup = function() {
	this.popup('signup');
}


App.prototype.showStage = function() {
	$('#stage').show();
	$('#title').hide();
	//viz.play('stage');
	stage.build();
}


App.prototype.showTitleScreen = function() {
	$('#stage').hide();
	$('#title').show();
	stage.destroy();
	//viz.play('ts');
}


/* Init  */
function initApp() {
	app = new App();
}
