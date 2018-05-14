/* Include the static file webserver library */
var static = require('node-static');

/* Include the http server lbrary */
var http = require('http');

/* Assume that we are running on Heroku */
var port = process.env.PORT;
var directory = __dirname + '/public';


/* if we aren't on heroku, then we need to readjust the port and 
directory information. we know that bc port wont be set */
if(typeof port == 'undefined' || !port) {
	directory = './public';
	port = 8080;
}

/* set up static web server that will deliver files from file system */
var file = new static.Server(directory);

/*construct an http server that gets files from the file server */
var app = http.createServer(
	function(request,response){
		request.addListener('end',
			function () {
			file.serve(request,response);
			}
		).resume();
		}
	).listen(port);

console.log('The server is running');