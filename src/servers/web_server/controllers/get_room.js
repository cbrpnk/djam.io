var url = require('url');

function handler(req, res, db, parameters) {
	
	// Sanitize parameters
	
	if(parameters.id) {
		getRoom(db, parameters.id, function(err, room) {
			var response = null;
			
			if(!err) {
				response = room
			} else {
				response = {'error': 'Cannor find room'};
			}
			
			res.writeHead(200, {'Content-Type': 'application/json'});
			res.end(JSON.stringify(response));
		});
	}
	
}


function getRoom(db, roomId, callback) {
	
	db.hgetall('room:' + roomId, function(err, room) {
		if(!err && room) {
			db.smembers('room_players:' + roomId, function(err, players) {
				if(!err && players) {
					room['players'] = players;
					callback(false, room);
				} else {
					callback(true);
				}
			});
		} else {
			callback(true);
		}

	});
}

exports.handler = handler;
