/* Some initialization boilerplate. Also, we include the code from
   routes/routes.js, so we can have access to the routes. Note that
   we get back the object that is defined at the end of routes.js,
   and that we use the fields of that object (e.g., routes.get_main)
   to access the routes. */

var express = require('express');
var routes = require('./routes/routes.js');
var app = express();
var session = require('express-session');
//app.engine('html', require('ejs').renderFile);
//app.set('view engine', 'html');

var bodyParser = require('body-parser')
var morgan = require('morgan')
var cookieParser = require('cookie-parser')
var session = require('express-session')
var serveStatic = require('serve-static')
var path = require('path')
app.use(bodyParser.urlencoded({ extended: false }));
app.use(morgan('combined'));
app.use(cookieParser());
app.use(serveStatic(path.join(__dirname, 'public')))


app.use(express.urlencoded());

app.use(session({
	  secret: 'secret',
	  resave: true,
	  saveUninitialized: true,
	  user: null
	}));


	const schedule = require('node-schedule');
	const cron = require('node-cron');
	
	/**function to help run absorption/livy job */
	function run(callback) {
		const {spawn} = require('child_process');
		const ls = spawn('java', ['-Xmx768M','-jar','livy.jar']);
		var result = "";
		ls.stdout.on('data', function(data) {
			 result += data;
		});
		ls.on('close', function(code) {
			return callback(result);
		});
	}
	
	/** To schedule algorithm run in the background every 30 mins
	NOTE: must have snapshot and livy.jar in same directory as app
	 */
	cron.schedule("*/1 * * * *",function(){
		run(function(result) {console.log("*******CRON AUTO REFRESHED ALGORITHM RESULT******" + result) });
	});
	


/* Below we install the routes. The first argument is the URL that we
   are routing, and the second argument is the handler function that
   should be invoked when someone opens that URL. Note the difference
   between app.get and app.post; normal web requests are GETs, but
   POST is often used when submitting web forms ('method="post"'). */

app.get('/', routes.get_login);
app.get('/signup', routes.sign_up);
app.get('/homepage', routes.get_homepage);
app.get('/wall/:owner',routes.wall);
app.get('/update_account', routes.update_account_page);

app.get('/visualizer', function(req, res) {
	res.render('friendvisualizer.ejs');
});


app.get('/logout', routes.logout);
app.post('/checkLogin', routes.check_login);
app.post('/createaccount', routes.create_account);
app.post('/updateaccountinfo', routes.update_account);

app.post('/addfriend', routes.add_friend);
app.post('/removefriend', routes.delete_friend);
app.post('/addhomepost', routes.create_post);
app.post('/updatestatus', routes.create_comment);
app.post('/refreshhome', routes.refresh_home);

//Gets and Posts for Chat

app.get('/chatmain', routes.get_chat_main);
app.post('/startchat', routes.start_chat);
app.post('/sendmessage', routes.send_message);
app.get('/joinchat/:gID', routes.join_chat);
app.get('/chatbox/:gID', routes.join_chat);
app.post('/leavechat', routes.leave_chat);
app.post('/adduser', routes.add_user);

//updated by rachel below!! 
app.get('/news', routes.get_search);
app.post('/searchnews', routes.post_search);
//updated by rachel above!!

app.get('/friendvisualization', routes.visualizer);
app.get('/getFriends/:user', routes.getChildren);
app.get('/news_recommendation', routes.post_rank);

// TODO You will need to replace these routes with the ones specified in the handout

/* Run the server */

console.log('Author: G12');
var server = app.listen(8080 || process.env.PORT);
console.log('Server running on port 8080. Now open http://localhost:8080/ in your browser!');

var socket = require("socket.io");
var io = socket(server);

/* Handle Socket */

io.on("connection", function (socket) {

console.log("Connected!");
console.log(' %s sockets connected', io.engine.clientsCount);

	socket.on("chat message", obj => {
		console.log(obj);
		io.to(obj.room).emit("chat message", obj);
		
	});
	
	socket.on("join room", room => {
		socket.join(room);
	});
	
	socket.on("leave room", room => {
		socket.leave(room);
   });
   
});

