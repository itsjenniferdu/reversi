
/* functions for general use */
/* This function returns the value associated with ‘whichParam’ on the URL */

function getURLParameters(whichParam)
{
	var pageURL = window.location.search.substring(1);
	var pageURLVariables = pageURL.split('&');
	for(var i = 0; i < pageURLVariables.length; i++){
		var parameterName = pageURLVariables[i].split('=');
		if(parameterName[0] == whichParam){
			return parameterName[1];
		}
	}

}
var username = getURLParameters('username');
if('undefined' == typeof username || !username){
	username = 'Anonymous_'+Math.random();
}
$('#messages').append('<h4>'+username+'</h4>');


/* one_room to game_id */

var chat_room = getURLParameters('game_id');
if('undefined' == typeof chat_room || !chat_room){
	chat_room = 'lobby';
}


/* Connect to the socket server */
var socket = io.connect();

/* what to do when server sends me a log message */

socket.on('log',function(array){
	console.log.apply(console,array);
});


/* what to do when server responds that someone joined a room */
socket.on('join_room_response',function(payload){
	if(payload.result == 'fail'){
		alert(payload.message);
		return;
	}

/* if we are being notified that we joined the room, ignore it */
	if(payload.socket_id == socket.id){
		return;
	}

/* if someone joined, add new row to lobby table (id attributes with players) */
	var dom_elements = $('.socket_'+payload.socket_id);

/* if we don't already have an entry for this person */
if(dom_elements.length == 0){
	var nodeA = $('<div></div>');
	nodeA.addClass('socket_'+payload.socket_id);

	var nodeB = $('<div></div>');
	nodeB.addClass('socket_'+payload.socket_id);

	var nodeC = $('<div></div>');
	nodeC.addClass('socket_'+payload.socket_id);

	nodeA.addClass('w-100');

	nodeB.addClass('col-9 text-right');
	nodeB.append('<h4>'+payload.username+'</h4>');

	nodeC.addClass('col-3 text-left');
	var buttonC = makeInviteButton(payload.socket_id);
	nodeC.append(buttonC);

	nodeA.hide();
	nodeB.hide();
	nodeC.hide();
	$('#players').append(nodeA,nodeB,nodeC);
	nodeA.slideDown(1000);
	nodeB.slideDown(1000);
	nodeC.slideDown(1000);
}

/* if we have seen the person who just joined (something weird happened) */
else{
	uninvite(payload.socket_id);
	var buttonC = makeInviteButton(payload.socket_id);
	$('.socket_'+payload.socket_id+' button').replaceWith(buttonC);
		dom_elements.slideDown(1000);
}

/* manage message that new player has joined */

	var newHTML = '<p> '+payload.username+' just entered the lobby</p>';
	var newNode = $(newHTML);
	newNode.hide();
	$('#messages').append(newNode);
	newNode.slideDown(1000);
	});

/*this gets hidden at 14:48 reversi part 11, setup 01
	$('#messages').append('<p>New user joined the room: '+payload.username+'</p>');
});
*/




/****DISCONNECTED**********/
/*********************/
/* what to do when server says that someone has left a room */
socket.on('player_disconnected',function(payload){
	if(payload.result == 'fail'){
		alert(payload.message);
		return;
	}

/* if we are being notified that we left the room, ignore */
	if(payload.socket_id === socket.id){
		return;
	}

/* if someone left, animate out all their content */
	var dom_elements = $('.socket_'+payload.socket_id);

/* if something exists */
if(dom_elements.length != 0){
	dom_elements.slideUp(1000);
}

/* manage message that a player has left */
	var newHTML = '<p>' +payload.username+' has left the lobby</p>';
	var newNode = $(newHTML);
	newNode.hide();
	$('#messages').append(newNode);
	newNode.slideDown(1000);
	});

/* invitation capability (lobby pt. 2) */
/* Send an INVITE message to the server */
function invite(who){
  var payload = {};
  payload.requested_user = who;

  console.log('*** Client Log Message: \'invite\' payload: '+JSON.stringify(payload));
  socket.emit('invite',payload);
}

/* Handle a response after sending an invite message to the server */
socket.on('invite_response',function(payload){
    if(payload.result == 'fail'){
        alert(payload.message);
        return;
    }
    var newNode = makeInvitedButton(payload.socket_id);
    $('.socket_'+payload.socket_id+' button').replaceWith(newNode);
});

/* Handle a notification that we have been invited */
socket.on('invited',function(payload){
    if(payload.result == 'fail'){
        alert(payload.message);
        return;
    }
    var newNode = makePlayButton(payload.socket_id);
    $('.socket_'+payload.socket_id+' button').replaceWith(newNode);
});


/* Send an UNINVITE message to the server */
function uninvite(who){
  var payload = {};
  payload.requested_user = who;

  console.log('*** Client Log Message: \'uninvite\' payload: '+JSON.stringify(payload));
  socket.emit('uninvite',payload);
}

/* Handle a response after sending an uninvite message to the server */
socket.on('uninvite_response',function(payload){
    if(payload.result == 'fail'){
        alert(payload.message);
        return;
    }
    var newNode = makeInviteButton(payload.socket_id);
    $('.socket_'+payload.socket_id+' button').replaceWith(newNode);
});

/* Handle a notification that we have been uninvited */
socket.on('uninvited',function(payload){
    if(payload.result == 'fail'){
        alert(payload.message);
        return;
    }
    var newNode = makeInviteButton(payload.socket_id);
    $('.socket_'+payload.socket_id+' button').replaceWith(newNode);
});


/* Send a game start message to the server */
function game_start(who){
  var payload = {};
  payload.requested_user = who;

  console.log('*** Client Log Message: \'game_start\' payload: '+JSON.stringify(payload));
  socket.emit('game_start',payload);
}

/* Handle a notification that we have been engaged */
socket.on('game_start_response',function(payload){
    if(payload.result == 'fail'){
        alert(payload.message);
        return;
    }
    var newNode = makeEngagedButton(payload.socket_id);
    $('.socket_'+payload.socket_id+' button').replaceWith(newNode);

/*Jump to a new page */
    window.location.href = 'game.html?username='+username+'&game_id='+payload.game_id;
});


function send_message(){
    var payload = {};
    payload.room = chat_room;
    payload.message = $('#send_message_holder').val();
    console.log('*** Client Log Message: \'send_message\' payload: '+JSON.stringify(payload));
    socket.emit('send_message',payload);
}




/* send message response */
function send_message (){
	var payload = {};
	payload.room = chat_room;
	payload.message = $('#send_message_holder').val();
	console.log('*** Client Log Message: \'send_message\' payload: '+JSON.stringify(payload));
	socket.emit('send_message',payload);
}

socket.on('send_message_response',function(payload){
	if(payload.result == 'fail'){
		alert(payload.message);
		return;
	}
	var newHTML = '<p><b>'+payload.username+' says:</b> '+payload.message+'</p>';
	var newNode = $(newHTML);
	newNode.hide();
	$('#messages').append(newNode);
	newNode.slideDown(1000);
});





function makeInviteButton(socket_id){

	var newHTML = '<button type=\'button\' class=\'btn btn-outline-primary\'>Invite</button>';
	var newNode = $(newHTML);
	newNode.click(function(){
		invite(socket_id);
	});
	return(newNode);
}

function makeInvitedButton(socket_id){

	var newHTML = '<button type=\'button\' class=\'btn btn-primary\'>Invited</button>';
	var newNode = $(newHTML);
	newNode.click(function(){
		uninvite(socket_id);
	return(newNode);
}

function makePlayButton(socket_id){

	var newHTML = '<button type=\'button\' class=\'btn btn-success\'>Play</button>';
	var newNode = $(newHTML);
	newNode.click(function(){
		game_start(socket_id);
	return(newNode);
}


function makeEngagedButton(){

	var newHTML = '<button type=\'button\' class=\'btn btn-danger\'>Engaged</button>';
	var newNode = $(newHTML);
	return(newNode);
}



$(function(){
	var payload = {};
	payload.room = chat_room;
	payload.username = username;

	console.log('*** Client Log Message: \'join_room\' payload: '+JSON.stringify(payload));
	socket.emit('join_room',payload);
});
