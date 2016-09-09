var utils    = require( '../utils' );

var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

var moment = require('moment');
var flash = require('express-flash');

// Set the permission scope that requires to manage the Google Calendar
var SCOPES = ['https://www.googleapis.com/auth/calendar'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';


/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
	var clientSecret = credentials.installed.client_secret;
	var clientId = credentials.installed.client_id;
	var redirectUrl = credentials.installed.redirect_uris[0];
	var auth = new googleAuth();
	var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

	// Check if we have previously stored a token.
	fs.readFile(TOKEN_PATH, function(err, token) {
		if (err) {
			getNewToken(oauth2Client, callback);
		} else {
			oauth2Client.credentials = JSON.parse(token);
			callback(oauth2Client);
		}
	});
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
	var authUrl = oauth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES
	});

	console.log('Authorize this app by visiting this url: ');
	console.log( authUrl );

	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	rl.question('Enter the code from that page here: ', function(code) {
		rl.close();

		oauth2Client.getToken(code, function(err, token) {
			if (err) {
				console.log('Error while trying to retrieve access token', err);
				return;
			}

			oauth2Client.credentials = token;
			storeToken(token);
			callback(oauth2Client);
		});
	});
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
	try {
		fs.mkdirSync(TOKEN_DIR);
	} catch (err) {
		if (err.code != 'EEXIST') {
			throw err;
		}
	}

	fs.writeFile(TOKEN_PATH, JSON.stringify(token));
	console.log('Token stored to ' + TOKEN_PATH);
}

/**	
 * Lists the next 20 events on the user's primary calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function retrieveEvents(auth, res) {
	var calendar = google.calendar('v3');

	calendar.events.list({
		auth: auth,
		calendarId: 'primary',
		timeMin: (new Date()).toISOString(),
		maxResults: 20,
		singleEvents: true,
		orderBy: 'startTime'
	}, function(err, response) {
		if (err) {
			console.log('[retrieveEvents] The API returned an error: ' + err);
			return;
		}

		var events = response.items;

		return res.render( 'index', {
				title : 'Maaii Todo',
				moment : moment,
				events : events,
				created_event : null,
				created_error : null,
				updated_event : null,
				updated_error : null,
				deleted_event : null,
				deleted_error : null
		});
	});
}

/**
 * Retrieve a single event with specific eventId
 *
 */
function getEvent(auth, req, res){
	var calendar = google.calendar('v3');

	calendar.events.get({
		auth: auth,
		calendarId: 'primary',
		eventId: req.params.id
	}, function(err, response) {
		if (err) {
			console.log('[getEvent] The API returned an error: ' + err);
			return;
		}
		
		// render the response to edit view
		res.render( 'edit', {
			title : 'Maaii Todo',
			moment : moment,
			event : response
		});
	});
}

/**
 * Edit a single event with specific eventId
 *
 */
function editEvent(auth, req, res) {
	var calendar = google.calendar('v3');

	var data = req.body;

	// check if the eventId is given or not
	if( data.id ){
		// form the request data object
		var event = {
			'summary': data.summary ? data.summary : '',
			'location': data.location ? data.location : '',
			'description': data.description ? data.description : '',
			'start': {
				'dateTime': data.start_datetime ? moment(data.start_datetime).format("YYYY-MM-DDTHH:MM:SS.SSSZ") : '',
				'timeZone': 'Asia/Hong_Kong',
			},
			'end': {
				'dateTime': data.end_datetime ? moment(data.end_datetime).format("YYYY-MM-DDTHH:MM:SS.SSSZ") : '',
				'timeZone': 'Asia/Hong_Kong',
			},
			'recurrence': [
				
			],
			'attendees': [
				
			],
			'reminders': {
				'useDefault': false,
				'overrides': [
					{'method': 'email', 'minutes': 24 * 60},
					{'method': 'popup', 'minutes': 10},
				],
			},
		};

		calendar.events.update({
			auth: auth,
			eventId: data.id,
			calendarId: 'primary',
			resource: event,
		}, function(err, updated_event) {
			if (err) {
				console.log('There was an error contacting the Calendar service: ' + err);
				return;
			}

			// render the response to index view
			return res.render( 'index', {
				title : 'Maaii Todo',
				moment : moment,
				events: null,
				created_event : null,
				created_error : null,
				updated_event : updated_event,
				updated_error : null,
				deleted_event : null,
				deleted_error : null
			});
		});
	}else{
		// halt if eventId is missing
		console.log('missing Event ID');
		return;
	}
}

/**
 * Create a new event 
 *
 */
function createEvent(auth, req, res) {
	var calendar = google.calendar('v3');

	var data = req.body;

	var event = {
		'summary': data.summary ? data.summary : '',
		'location': data.location ? data.location : '',
		'description': data.description ? data.description : '',
		'start': {
			'dateTime': data.start_datetime ? moment(data.start_datetime).format("YYYY-MM-DDTHH:MM:SS.SSSZ") : '',
			'timeZone': 'Asia/Hong_Kong',
		},
		'end': {
			'dateTime': data.end_datetime ? moment(data.end_datetime).format("YYYY-MM-DDTHH:MM:SS.SSSZ") : '',
			'timeZone': 'Asia/Hong_Kong',
		},
		'recurrence': [
			
		],
		'attendees': [
			
		],
		'reminders': {
			'useDefault': false,
			'overrides': [
				{'method': 'email', 'minutes': 24 * 60},
				{'method': 'popup', 'minutes': 10},
			],
		},
	};

	calendar.events.insert({
		auth: auth,
		calendarId: 'primary',
		resource: event,
	}, function(err, created_event) {
		if (err) {
			console.log('There was an error contacting the Calendar service: ' + err);
			return;
		}

		// render the response to index view
		return res.render( 'index', {
			title : 'Maaii Todo',
			moment : moment,
			events: null,
			created_event : created_event,
			created_error : null,
			updated_event : null,
			updated_error : null,
			deleted_event : null,
			deleted_error : null
		});
	});
}

/**
 * Delete a single event with specific eventId
 *
 */
function deleteEvent(auth, req, res) {
	var calendar = google.calendar('v3');

	calendar.events.delete({
		auth: auth,
		calendarId: 'primary',
		eventId: req.params.id
	}, function(err, deleted_event) {
		if (err) {
			console.log('There was an error contacting the Calendar service: ' + err);
			return;
		}

		// render the response to index view
		return res.render( 'index', {
			title : 'Maaii Todo',
			moment : moment,
			events: null,
			created_event : null,
			created_error : null,
			updated_event : null,
			updated_error : null,
			deleted_event : deleted_event ? false : true,
			deleted_error : null
		});
	});
}

/*************************************/

exports.index = function ( req, res, next ){
	// Load client secrets from a local file.
	fs.readFile('private/client_secret.json', function processClientSecrets(err, content) {
		if (err) {
			console.log('Error loading client secret file: ' + err);
			return;
		}

		// Authorize a client with the loaded credentials, then call the Google Calendar API.
		authorize(JSON.parse(content), function(auth){
			// retrieve a list of events from Google Calendar
			retrieveEvents( auth, res );
		});
	});
};

exports.create = function ( req, res, next ){
	if (req.method.toLowerCase() == 'get') {
		// render to create if it's a GET request
		res.render( 'create', {
			title : 'Maaii Todo',
		});
	} else if (req.method.toLowerCase() == 'post') {
		// Load client secrets from a local file.
		fs.readFile('private/client_secret.json', function processClientSecrets(err, content) {
			if (err) {
				console.log('Error loading client secret file: ' + err);
				return;
			}

			// Authorize a client with the loaded credentials, then call the Google Calendar API.
			authorize(JSON.parse(content), function(auth){
				// if it's a POST request, insert the new event to Google Calendar
				createEvent( auth, req, res );
			});
		});
	}
};

exports.destroy = function ( req, res, next ){
	// Load client secrets from a local file.
	fs.readFile('private/client_secret.json', function processClientSecrets(err, content) {
		if (err) {
			console.log('Error loading client secret file: ' + err);
			return;
		}

		// Authorize a client with the loaded credentials, then call the Google Calendar API.
		authorize(JSON.parse(content), function(auth){
			// if it's a POST request, remove the specific event from Google Calendar
			deleteEvent( auth, req, res );
		});
	});
};

exports.edit = function( req, res, next ){
	if (req.method.toLowerCase() == 'get') {
		// Load client secrets from a local file.
		fs.readFile('private/client_secret.json', function processClientSecrets(err, content) {
			if (err) {
				console.log('Error loading client secret file: ' + err);
				return;
			}

			// Authorize a client with the loaded credentials, then call the Google Calendar API.
			authorize(JSON.parse(content), function(auth){
				// if it's a GET request, retrieve the specific event info from Google Calendar
				// and put in the edit form
				getEvent( auth, req, res );
			});
		});
	} else if (req.method.toLowerCase() == 'post') {
		// Load client secrets from a local file.
		fs.readFile('private/client_secret.json', function processClientSecrets(err, content) {
			if (err) {
				console.log('Error loading client secret file: ' + err);
				return;
			}

			// Authorize a client with the loaded credentials, then call the Google Calendar API.
			authorize(JSON.parse(content), function(auth){
				// if it's a POST request, update the specific event info to Google Calendar
				editEvent( auth, req, res );
			});
		});
	}
};

// ** express turns the cookie key to lowercase **
exports.current_user = function ( req, res, next ){
	var user_id = req.cookies ?
			req.cookies.user_id : undefined;

	if( !user_id ){
		res.cookie( 'user_id', utils.uid( 32 ));
	}

	next();
};
