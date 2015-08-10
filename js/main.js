$(document).ready(function(){
  "use strict"

  var APP_ID = '750337081751649'
  if(location.hostname == 'localhost') {
    var APP_ID = '816315155153841'
  }
  var AUTH_URL = 'http://minou.blindr.me/auth';

  var messageTpl = _.template($('#message-tpl').text());
  var pictureTpl = _.template($('#picture-tpl').text());

  var isActive;
  var userName;
  var fb_token;
  var authId;

	window.onfocus = function () {
	  isActive = true;
	  document.title = 'minou';
	};

	window.onblur = function () {
	  isActive = false;
	};

  function new_connection(data) {
    userName = data.user_name
	authId = data.id;
    var connection = new autobahn.Connection({
      url: location.origin.replace(/^http/, 'ws') + '/ws',
      realm: 'minou',
      authmethods: ['wampcra'],
      authid: authId,
      onchallenge: function(session, method, extra){
        return autobahn.auth_cra.sign(data.secret, extra.challenge);
      }
    });

    connection.onopen = function(session){
      setInterval ( function (){session.publish('heartbeat', [], {}); }, 35000 );
      $('#input-box').removeAttr('disabled');

      var topic = 'minou.public.worldwide.canada.quebec.general';
      session.subscribe(topic, function(args, kwargs) {
        console.log(arguments);
        if(isActive === false){
          document.title = '* minou';
        }
        appendMessage(kwargs.from, kwargs.content, kwargs.user_name, kwargs.content_type);
      });

      session.call('plugin.history.fetch', [topic])
        .then(function(messages) {
          messages.forEach(function(message) {
            appendMessage(message.from, message.content, message.user_name, message.content_type);
          })
        })

      function appendMessage(from, content, user_name, type) {
        if(type == 'image/jpeg'){
          $('#messages').append(pictureTpl({from: user_name, picture: 'data:image/png;base64,' + content}));
        } else if(type == 'text/plain'){
          $('#messages').append(messageTpl({from: user_name, content: content}));
        }
      }
      
      function sendMessage(message) {
        var textType = 'text/plain';
        session.publish('minou.public.worldwide.canada.quebec.general', [], {from: authId, user_name: userName, content: message, content_type: textType});
        appendMessage('self', message);
      }

      $('#input-form').submit(function(event){
        event.preventDefault()
        sendMessage($('#input-box').val());
        $('#input-box').val('');
      });
    };

    return connection;
  }

  function fbStatusChangeCallback(response) {
    console.log('fbStatusChangeCallback', response);

    if(response.status == 'connected') {
      fb_token  = response.authResponse.accessToken;
      $.post(AUTH_URL, {fb_token: fb_token})
        .done(function(data){
          new_connection(data).open();
        })
        .fail(function(){
          console.error('Auth fail')
        });
    }
  }

  $.ajaxSetup({ cache: true });
  $.getScript('//connect.facebook.net/en_US/sdk.js', function(){
    FB.init({
      appId: APP_ID,
      version: 'v2.2'
    });

    FB.login(function(response){
      fbStatusChangeCallback(response);
    });
  });
})
