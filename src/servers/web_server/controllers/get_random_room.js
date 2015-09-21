var url = require('url');

function handler(req, res, db, parameters) {
	
	getRandomRoom(db, parameters.exclude, function(err, room) {
		var response = {'error': 'Could not get room'};
		
		if(!err && room)
			response = {'roomId': room};
		
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify(response));
	});
	
	
}

function getRandomRoom(db, exclude, callback) {
	db.smembers('rooms', function(err, rooms) {
		
		if(!err && rooms.length > 0) {
			
			if(exclude)
				rooms.splice(rooms.indexOf(exclude), 1);
			
			if(rooms.length > 0) {
				callback(false, rooms[Math.floor(Math.random() * rooms.length)]);
			} else callback(true);
		
		} else {
			callback(true);
		}
	
	});
}

exports.handler = handler;
