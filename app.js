/**
 * Module dependencies.
 */

var express        = require( 'express' );
var http           = require( 'http' );
var path           = require( 'path' );
var engine         = require( 'ejs-locals' );
var favicon        = require( 'serve-favicon' );
var cookieParser   = require( 'cookie-parser' );
var bodyParser     = require( 'body-parser' );
var methodOverride = require( 'method-override' );
var logger         = require( 'morgan' );
var errorHandler   = require( 'errorhandler' );
var static         = require( 'serve-static' );

var session = require('express-session');
var flash = require('express-flash');

var app    = express();

// all environments
app.set( 'port', process.env.PORT || 3001 );
app.engine( 'ejs', engine );
app.set( 'views', path.join( __dirname, 'views' ) );
app.set( 'view engine', 'ejs' );
app.use( favicon( __dirname + '/public/favicon.ico' ) );
app.use( logger( 'dev' ) );
app.use( methodOverride() );
app.use( cookieParser() );
app.use( bodyParser.json() );
app.use( bodyParser.urlencoded({ extended : true }) );

app.use(session({
    cookie: { maxAge: 60000 },
    saveUninitialized: true,
    resave: 'true',
    secret: 'secret'
}));

app.use( flash() );

// Custom flash middleware -- from Ethan Brown's book, 'Web Development with Node & Express'
app.use(function(req, res, next){
    // if there's a flash message in the session request, make it available in the response, then delete it
    res.locals.sessionFlash = req.session.sessionFlash;
    delete req.session.sessionFlash;
    next();
});

app.use( static( path.join( __dirname, 'public' )) );

// development only
if( 'development' == app.get( 'env' )){
	app.use( errorHandler());
}

// Routes
var routes = require( './routes' );
app.get( '/',				routes.index );

app.get( '/landing', 		routes.landing );

app.get( '/create',			routes.create );
app.post( '/create',		routes.create );

app.get( '/edit/:id',		routes.edit );
app.post( '/edit',			routes.edit );

app.get( '/destroy/:id',	routes.destroy );

app.get( '/gauth', 			routes.gauth );

app.get( '/logout', 		routes.logout );

http.createServer( app ).listen( app.get( 'port' ), function (){
	console.log( 'Express server listening on port ' + app.get( 'port' ) );
});
