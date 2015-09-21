function handler(req, res, queryString, sessionDb) {
	if(queryString.sid) {
		sessionDb.multi()
			.hgetall('s:' + queryString.sid)
			.smembers('p:' + queryString.sid)
			.exec(function(err, data) {
				if(data[0]) {
					data[0]['players'] = data[1];
				}
				res.writeHead(200);
				res.end(JSON.stringify(data[0]));
			});
	}
}

exports.handler = handler;
