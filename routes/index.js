var fs = require('fs');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var moment = require('moment');

var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';

var secret = require('../secret.js');

var auth = new googleAuth();
var oauth2Client = {
	isAuthed : false
};

var SCOPES = ['https://www.googleapis.com/auth/calendar'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'maaii-todo-tokens.json';

/******************** functions ********************/

function authorize(req, res, callback, gauth_callback){
	secret.getCredentials(function( credentials ){
		if( credentials ){
			var redirect_url = req.protocol+"://"+req.hostname;
			var port;
			if( port = (process.env.PORT || 3000) ){
				redirect_url += ":" + port;
			}
			redirect_url += "/gauth";

			oauth2Client = new auth.OAuth2(
				credentials.web.client_id, 
				credentials.web.client_secret, 
				redirect_url
			);

			fs.readFile(TOKEN_PATH, function(err, token) {
				if( err ){
					oauth2Client.isAuthed = false;
					gauth_callback && gauth_callback( res );
				} else {
					oauth2Client.isAuthed = true;

					oauth2Client.credentials = JSON.parse(token);

					callback(oauth2Client);
				}
			});
		}
	});
}

function gauth_callback( res ){
	var auth_url = oauth2Client.generateAuthUrl({
		access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token)
		scope: SCOPES // If you only need one scope you can pass it as string
	});

	res.redirect( auth_url );
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
function retrieveEvents( auth, req, res ) {
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
			req.flash('danger', 'Fail to retrieve events. There was an error contacting the Calendar service: ' + err);
			res.locals.messages = req.flash();
			res.redirect('/');
		}

		var events = response.items;

		var status = null,
			status_message = null;

		if( res.locals.messages ){
			for (var key in res.locals.messages) {
				status = key;
				status_message = res.locals.messages[key];
			}
		}

		return res.render( 'index', {
			title : 'Maaii Todo',
			moment : moment,
			isAuthed : auth.isAuthed,
			events : events,
			status: status, 
			status_message: status_message, 
		});
	});
}
/**
 * Create a new event 
 *
 */
function createEvent(auth, req, res) {
	var calendar = google.calendar('v3');

	var event = {
		'summary': req.body.summary ? req.body.summary : '',
		'description': req.body.description ? req.body.description : '',
		'start': {
			'dateTime': req.body.start_datetime ? moment(req.body.start_datetime).format("YYYY-MM-DDTHH:MM:SS.SSSZ") : '',
			'timeZone': 'Asia/Hong_Kong',
		},
		'end': {
			'dateTime': req.body.end_datetime ? moment(req.body.end_datetime).format("YYYY-MM-DDTHH:MM:SS.SSSZ") : '',
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
		req.flash('success', 'Insert a new event successfully');

		if (err) {
			req.flash('danger', 'Fail to create the event. There was an error contacting the Calendar service: ' + err);
		}

		res.locals.messages = req.flash();
		res.redirect('/');
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
			req.flash('danger', 'Fail to get the event. There was an error contacting the Calendar service: ' + err);
			res.locals.messages = req.flash();
			res.redirect('/');
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

	// check if the eventId is given or not
	if( req.body.id ){
		// form the request data object
		var event = {
			'summary': req.body.summary ? req.body.summary : '',
			'location': req.body.location ? req.body.location : '',
			'description': req.body.description ? req.body.description : '',
			'start': {
				'dateTime': req.body.start_datetime ? moment(req.body.start_datetime).format("YYYY-MM-DDTHH:MM:SS.SSSZ") : '',
				'timeZone': 'Asia/Hong_Kong',
			},
			'end': {
				'dateTime': req.body.end_datetime ? moment(req.body.end_datetime).format("YYYY-MM-DDTHH:MM:SS.SSSZ") : '',
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
			eventId: req.body.id,
			calendarId: 'primary',
			resource: event,
		}, function(err, updated_event) {
			req.flash('success', 'Update the event "'+req.body.summary+'" successfully');
			
			if (err) {
				req.flash('danger', 'Edit event fail. There was an error contacting the Calendar service: ' + err);
			}

			res.locals.messages = req.flash();
			res.redirect('/');
		});
	}else{
		// halt if eventId is missing
		req.flash('danger', 'Missing Event ID');
		res.locals.messages = req.flash();
		res.redirect('/');
		return;
	}
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

		req.flash('success', 'Delete the event successfully');
		res.locals.messages = req.flash();

		res.redirect('/');
	});
}

/******************** routes ********************/

exports.landing = function ( req, res, next ){
	res.render( 'landing', {
		title : 'Maaii Todo',
	});
};

exports.index = function ( req, res, next ){
	// Authorize a client with the loaded credentials, then call the Google Calendar API.
	authorize(req, res, function( auth ){
		retrieveEvents( auth, req, res );
	}, gauth_callback);
};

exports.gauth = function ( req, res, next ){
	if( req.param('code') ){
		// if a code is receieved, i.e. auth success and get the token
		oauth2Client.getToken(req.query.code, function(err, token) {
			if (err) {
				console.log('Error while trying to retrieve access token', err);
				return;
			}

			oauth2Client.credentials = token;
			
			storeToken(token);

			res.redirect('/');
		});
	} else {
		gauth_callback( res );
	}
};

exports.create = function ( req, res, next ){
	if (req.method.toLowerCase() == 'get') {
		// render to create if it's a GET request
		res.render( 'create', {
			title : 'Maaii Todo',
		});
	} else if (req.method.toLowerCase() == 'post') {
		authorize(req, res, function(auth){
			// if it's a POST request, insert the new event to Google Calendar
			createEvent( auth, req, res );
		}, gauth_callback);
	}
};

exports.edit = function( req, res, next ){
	if (req.method.toLowerCase() == 'get') {
		authorize(req, res, function(auth){
			// if it's a GET request, retrieve the specific event info from Google Calendar
			// and put in the edit form
			getEvent( auth, req, res );
		});
	} else if (req.method.toLowerCase() == 'post') {
		authorize(req, res, function(auth){
			// if it's a POST request, update the specific event info to Google Calendar
			editEvent( auth, req, res );
		});
	}
};

exports.destroy = function ( req, res, next ){
	authorize(req, res, function(auth){
		// if it's a POST request, remove the specific event from Google Calendar
		deleteEvent( auth, req, res );
	});
};

exports.logout = function( req, res, next ){
	authorize(req, res, function(auth){
		// log user out by delete the token file
		fs.unlink(TOKEN_PATH, function( err ) {
			if( err ){
				req.flash('danger', 'Fail to remove TOKEN file');
			}else{
				req.flash('success', 'TOKEN file is removed');
			}

			res.locals.messages = req.flash();
			res.redirect('/landing');
		});
	});
};