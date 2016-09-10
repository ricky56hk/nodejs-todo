var fs = require('fs');

module.exports = {
	getCredentials: function( callback ){
		fs.readFile('private/client_secret.json', function processClientSecrets(err, content) {
			if (err) {
				console.log('Error loading client secret file: ' + err);

				callback({});
				return;
			}

			callback( JSON.parse( content ) );
		});
	}
}