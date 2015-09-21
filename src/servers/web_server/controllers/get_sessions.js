
function handler(req, res, sessionDb) {
	sessionDb.smembers('sessions', function(err, sessions) {
					
		command = [];
		for(i=0; i<sessions.length; i++) {
			command.push(["hgetall", "s:" + sessions[i]]);
		}
		
		sessionDb.multi(command).exec(function(err, result) {
			res.writeHead('200');
			res.end(JSON.stringify(result));
		});
			
	});	
}

exports.handler = handler;
