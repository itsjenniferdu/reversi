/*********************************************/
/*      Set up the static file server        */
/* Include the static file webserver library */
var static = require('node-static');

/* Include the http server library */
var http = require('http');

/* Assume that we are running on Heroku */
var port = process.env.PORT;
var directory = __dirname + '/public';

/* If we aren't on Heroku, then we need to readjust the port and directory
 * information and we know that because port won't be set */
if (typeof port == 'undefined' || !port){
	directory = './public';
	port = 8080;
}

/* Set up a static web-server that will deliver files from the filesystem */
var file = new static.Server(directory);

/* Construct an http server that get files from the file server */
var app = http.createServer(
	function(request,response) {
		request.addListener('end',
			function() {
				file.serve(request,response);
			}
		).resume();
	}
	).listen(port);

console.log('The Server is running');

/**********************************************/
/*      Set up the web socket  server     */


/*   register of socket_ids and player information     */
var players = [];


var io = require('socket.io').listen(app);

io.sockets.on('connection', function(socket) {

	log('Client connection by '+socket.id);

	function log(){
		var array = ['*** Server Log Message: '];
		for(var i = 0; i < arguments.length; i++){
			array.push(arguments[i]);
			console.log(arguments[i]);
		}
		socket.emit('log', array);
		socket.broadcast.emit('log',array);
	}



	/* join_room command */
	/* payload:
	{
	 	'room': room to join,
	 	'username' : username of person joining
	}
	join_room_response: {
		'result': 'success',
		'room' : room joined,
		'socket_id': the socket id of the person that joined
		'username' : username that joined,
		'membership' : number of people in the room including the new one
	}
	or
	{
		'result': 'fail',
		'message' : failure message
	}
	*/



	socket.on('join_room',function(payload){
		log('\'join_room\' command',+JSON.stringify(payload));

		/* check that client sent a payload */
		if(('undefined' === typeof payload) || !payload){
		   var error_message = 'join_room had no payload, command aborted';
			log(error_message);
			socket.emit('join_room_response', {
				result:'fail',
				message: error_message
			});
			return;
		}


		/* check that payload has room to join */
		var room = payload.room;
		if (('undefined' === typeof room) || !room) {
			var error_message = 'join_room didn\'t specify a room, command aborted';
			log(error_message);
			socket.emit('join_room_response', {
				result: 'fail',
				message: error_message
			});
			return;
		}

		/* check that username has been provided */
		var username = payload.username;
		if (('undefined' === typeof username) || !username) {
			var error_message = 'join_room didn\'t specify a username, command aborted';
			log(error_message);
			socket.emit('join_room_response', {
				result: 'fail',
				message: error_message
			});
			return;
		}


		/* store info about this new player */
		players[socket.id] = {};
		players[socket.id].username = username;
		players[socket.id].room = room;


		/* Actually have the user join the room */
		socket.join(room);


		/* get the room object */
		var roomObject = io.sockets.adapter.rooms[room];


		/* announce to the room someone has joined */
		var numClients = roomObject.length;
		var success_data = {
			result: 'success',
			room: room,
			username: username,
			socket_id: socket.id,
			membership: numClients
		};
		io.in(room).emit('join_room_response',success_data);

		for(var socket_in_room in roomObject.sockets){
			var success_data = {
				result: 'success',
				room: room,
				username: players[socket_in_room].username,
				socket_id: socket_in_room,
				membership: numClients
		};
		socket.emit('join_room_response',success_data);
		}

		log('join_room success');
	});




	/* disconnect message */


	socket.on('disconnect', function(){
		log('Client disconnected '+JSON.stringify(players[socket.id]));

		if('undefined' !== typeof players[socket.id] && players[socket.id]){
			var username = players[socket.id].username;
			var room = players[socket.id].room;
			var payload = {
				username: username,
				socket_id: socket.id
				};
				delete players[socket.id];
				io.in(room).emit('player_disconnected',payload);
		}

	});

	/* send_message command */
	/* payload:
		{
	 	'room': room to join,
	 	'message' : the message to send
		}
	send_message_response:
		{
		'result': 'success',
		'username' : username of the person that spoke,
		'message' : the message spoken
		}
	or
		{
		'result': 'fail',
		'message' : failure message
		}
	14:45 on video
	*/

	socket.on('send_message', function(payload){
		log('server received a command', 'send_message', payload);
		if(('undefined' === typeof payload) || !payload){
		   var error_message = 'send_message had no payload, command aborted';
			log(error_message);
			socket.emit('send_message_response', {
				result:'fail',
				message: error_message
			});
			return;
		}

		var room = payload.room;
		if (('undefined' === typeof room) || !room) {
			var error_message = 'send_message didn\'t specify a room, command aborted';
			log(error_message);
			socket.emit('send_message_response', {
				result: 'fail',
				message: error_message
			});
			return;
		}

		var username = players[socket.id].username;
		if (('undefined' === typeof username) || !username) {
			var error_message = 'send_message didn\'t specify a username, command aborted';
			log(error_message);
			socket.emit('send_message_response',
			{
				result: 'fail',
				message: error_message
			});
			return;
		}

		var message = payload.message;
		if (('undefined' === typeof message) || !message) {
			var error_message = 'send_message didn\'t specify a message, command aborted';
			log(error_message);
			socket.emit('send_message_response', {
				result: 'fail',
				message: error_message
			});
			return;
		}

		var success_data = {
			result: 'success',
			room: room,
			username: username,
			message: message
		};
		io.in(room).emit('send_message_response',success_data);
		log('Message sent to room ' + room + ' by ' + username);
	});





	/* invite command */
	/* payload:
		{
	 	'request_user' : the socket id of the person to be invited,
		}
	invite_response:
		{
		'result': 'success',
		'socket_id' : the socket id of the person being invited,
		}
	or
		{
		'result': 'fail',
		'message' : failure message
		}
	invited:
		{
		'result': 'success',
		'socket_id' : the socket id of the person being invited,
		}
	or
		{
		'result': 'fail',
		'message' : failure message
		}

	*/

	socket.on('Invite', function(payload){
		log('invite with '+JSON.stringify(payload));

	/* check to make sure that a payload was sent */
		if(('undefined' === typeof payload) || !payload){
		   var error_message = 'invite had no payload, command aborted';
			log(error_message);
			socket.emit('invite_response', {
				result:'fail',
				message: error_message
			});
			return;
		}


	/* check to make sure that the message can be traced to a username */

		var username = players[socket.id].username;
		if (('undefined' === typeof username) || !username) {
			var error_message = 'invite can\'t identify who sent the message';
			log(error_message);
			socket.emit('invite_response', {
				result: 'fail',
				message: error_message
			});
			return;
		}

		var requested_user = payload.requested_user;
		if (('undefined' === typeof requested_user) || !requested_user) {
			var error_message = 'invite didn\'t specify requested_user, command aborted';
			log(error_message);
			socket.emit('invite_response', {
				result: 'fail',
				message: error_message
			});
			return;
		}


		var room = players[socket.id].room;
		var roomObject = io.sockets.adapter.rooms[room];

		/*make sure the user being invited is in the room */
		if(!roomObject.sockets.hasOwnProperty(requested_user)){
			var error_message = 'invite requested a user that wasn\'t in the room, command aborted';
			log(error_message);
			socket.emit('invite_response', {
				result: 'fail',
				message: error_message
			});
			return;
		}

		/* if everything is okay respond to the inviter that it was successful */
		var success_data = {
			result: 'success',
			socket_id: requested_user
		};
		socket.emit('invite_response', success_data);

		/* tell the invitee that they have been invited */
		var success_data = {
			result: 'success',
			socket_id: socket.id
		};
		socket.to(requested_user).emit('invited', success_data);

		log('invite successful');
	});

	/* uninvite command */
	/* payload:
	                {
	                  'requested_user' : the socket id of the person to be uninvited
	                }
	                uninvite_response:
	                {
	                  'result': 'success',
	                  'socket_id' : the socket id of the person being uninvited
	                }
	                or
	                {
	                  'result': 'fail',
	                  'message' : failure message
	                }
	                uninvited:
	                {
	                  'result': 'success',
	                  'socket_id' : the socket id of the person doing the uninviting
	                }
	                or
	                {
	                  'result': 'fail',
	                  'message' : failure message
	                }
	      */


	      socket.on('uninvite',function(payload){
	          log('uninvite with '+JSON.stringify(payload));

	          /* Check to make sure that a payload was sent */
	          if(('undefined' === typeof payload) || !payload){
	            var error_message = 'uninvite had no payload, command aborted';
	            log(error_message);
	            socket.emit('uninvite_response',   {
	                                                    result: 'fail',
	                                                    message: error_message
	                                                });
	            return;
	          }


	          /* Check that the message can be traced to a username */
	          var username = players[socket.id].username;
	          if(('undefined' === typeof username) || !username){
	            var error_message = 'uninvite can\'t identify who sent a message';
	            log(error_message);
	            socket.emit('uninvite_response',   {
	                                                    result: 'fail',
	                                                    message: error_message
	                                                });
	            return;
	        }

	        var requested_user = payload.requested_user;
	        if(('undefined' === typeof requested_user) || !requested_user){
	          var error_message = 'uninvite didn\'t specify a requested_user, command aborted';
	          log(error_message);
	          socket.emit('uninvite_response',   {
	                                                  result: 'fail',
	                                                  message: error_message
	                                              });
	          return;
	        }

	        var room = players[socket.id].room;
	        var roomObject = io.sockets.adapter.rooms[room];
	        /* Make sure the user being invited is in the room */
	        if(!roomObject.sockets.hasOwnProperty(requested_user)){
	          var error_message = 'invite requested a user that wasn\'t in the room, command aborted';
	          log(error_message);
	          socket.emit('invite_response',   {
	                                                  result: 'fail',
	                                                  message: error_message
	                                              });
	          return;
	        }

	        /* If everything is okay respond to the uninviter that it was successful */

	        var success_data = {
	                              result: 'success',
	                              socket_id: requested_user
	                            };

	        socket.emit('uninvite_response', success_data);

	        /* Tell the uninvitee that they have been uninvited*/
	        var success_data = {
	                              result: 'success',
	                              socket_id: socket.id
	                            };

	        socket.to(requested_user).emit('uninvited', success_data);

	        log('uninvite successful');
	      });

/* game start command */
/* payload:
				                     {
				                        'requested_user' : the socket id of the person to play with
				                      }
				                      game_start_response:
				                      {
				                        'result': 'success',
				                        'socket_id' : the socket id of the person you are playing with
				                        'game_id' : id of the game session
				                      }
				                      or
				                      {
				                        'result': 'fail',
				                        'message' : failure message
				                      }
				            */


				            socket.on('game_start',function(payload){
				                log('game_start with '+JSON.stringify(payload));

				                /* Check to make sure that a payload was sent */
				                if(('undefined' === typeof payload) || !payload){
				                  var error_message = 'game_start had no payload, command aborted';
				                  log(error_message);
				                  socket.emit('game_start_response',   {
				                                                          result: 'fail',
				                                                          message: error_message
				                                                      });
				                  return;
				                }


				                /* Check that the message can be traced to a username */
				                var username = players[socket.id].username;
				                if(('undefined' === typeof username) || !username){
				                  var error_message = 'game_start can\'t identify who sent a message';
				                  log(error_message);
				                  socket.emit('game_start_response',   {
				                                                          result: 'fail',
				                                                          message: error_message
				                                                      });
				                  return;
				              }

				              var requested_user = payload.requested_user;
				              if(('undefined' === typeof requested_user) || !requested_user){
				                var error_message = 'uninvite didn\'t specify a requested_user, command aborted';
				                log(error_message);
				                socket.emit('uninvite_response',   {
				                                                        result: 'fail',
				                                                        message: error_message
				                                                    });
				                return;
				              }

				              var room = players[socket.id].room;
				              var roomObject = io.sockets.adapter.rooms[room];
				              /* Make sure the user being invited is in the room */
				              if(!roomObject.sockets.hasOwnProperty(requested_user)){
				                var error_message = 'game_start requested a user that wasn\'t in the room, command aborted';
				                log(error_message);
				                socket.emit('game_start_response',   {
				                                                        result: 'fail',
				                                                        message: error_message
				                                                    });
				                return;
				              }

				              /* If everything is okay respond to the game_starter that it was successful */
				              var game_id = Math.floor((1+Math.random()) *0x10000).toString(16).substring(1);
				              var success_data = {
				                                    result: 'success',
				                                    socket_id: requested_user,
				                                    game_id: game_id
				                                  };

				              socket.emit('game_start_response', success_data);

				              /* Tell the other player to play*/
				              var success_data = {
				                                    result: 'success',
				                                    socket_id: socket.id,
				                                    game_id: game_id
				                                  };

				              socket.to(requested_user).emit('game_start_response', success_data);

				              log('game_start successful');
				            });


});
