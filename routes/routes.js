var db = require('../models/database.js');
var url = require('url');
const { create_post } = require('../models/database.js');
var sha256 = require('js-sha256');

// TODO The code for your own routes should go here
/** updated by yueqi below */
var getSearch = function(req, res) {
	res.render('search.ejs',{items: null});
};

/** NEED 
 */
var postSearch = function(req, res){
	var keywords = req.body.input; //get search string
	var date = "2022-05-26";
	var tableName = "test";
    //NEED TO CHECK EMPTY INPUT
  	db.search(keywords, date, tableName, function(data) {
		res.render('search.ejs', {items: data});
	}); 
	
};

var postRank = function(req, res){
	var user = req.session.username; //get search string
	//var date = "2022-05-26";

    //NEED TO CHECK EMPTY INPUT
  	db.rank(user, function(data) {
		console.log(data);
		console.log(data.length);
		res.render('news_table.ejs', {items: data});
	}); 
	
};



/** updated by yueqi above */
var getLogin = function(req, res) {
	res.render('main.ejs', {});
  };

var getHomepage = function(req, res) {
	if (!req.session.username) {
		res.redirect('/');
	}
	console.log(req.session.username);

	//friends
	var username = req.session.username;
	var owner = req.params;

	db.get_homepage(username,owner, function(err,data) {
		if (err) {
			console.log("there was an error loading homepage");
		} else {
			console.log("homepage loaded");
			//console.log("data is" + JSON.stringify(data));
			//console.log(data);
			//res.send(data);
			//res.render('homepage2_notfinished.ejs', data);
			res.render('homepage3.ejs', data);
			//res.send("homepage!");
			//res.render('homepage2_notfinished.ejs', {friends: [{username: "a", isOnline:true},{username:"b",isOnline:false}],user:"b",posts:[]});
		}
	});
	
};

var refreshhome = function(req, res) {
	//query current friends list
	//query all current posts and comments with id
	
	/*var curr = {friends: [{username:{S: "aa"}, loggedOn:{BOOL:true}}, 
		{username:{S: "bb"}, loggedOn:{BOOL:false}},
		{username:{S: "c"}, loggedOn:{BOOL:false}}, {username:{S: "d"}, loggedOn:{BOOL:false}}], 
			posts:[{id: 1, content: "abc"},], 
			comments:[{id: 1, content: "def"},]};
	res.send(curr); */

	if (!req.session.username) {
		res.redirect('/');
	}
	console.log(req.session.username);

		//friends
		var username = req.session.username;
		var owner = req.params;
	
		db.get_homepage(username,owner, function(err,data) {
			if (err) {
				console.log("there was an error loading homepage");
			} else {
				//console.log("homepage loaded");
				//console.log("data is" + JSON.stringify(data));
				//console.log(data);

				res.send(data);
				//res.send("homepage!");
				//res.render('homepage2_notfinished.ejs', {friends: [{username: "a", isOnline:true},{username:"b",isOnline:false}],user:"b",posts:[]});
			}
		});


	
}

var wall = function(req, res) {
	console.log(req.params);
	var owner = req.params;
	//check if a user exists {res.send("no such user");}
	//[0.5999, 0.143898, 0.12930103, 0.2841084128];
	//[{id="0.5000199301" ,writer:"b", status:"good weather", timestamp: "100"}, {id="0.59104812" ,writer:"b", status:"watch a game", timestamp: "1000"}]
	//res.render("wall.ejs", {user: "b", posts:[{id: "1", content: "post1", comment: "good job", writer:"b"}], 
	//	comments:[{id:"2", commentator:"a", content:""}],
	//	owner:owner, current_status: "current", interests:["news"]});
	var username = req.session.username;

	if (!req.session.username) {
		res.redirect('/');
	}
	console.log(req.session.username);

	//friends
	var username = req.session.username;
	var owner = req.params;

	db.get_homepage(username,owner, function(err,data) {
		if (err) {
			console.log("there was an error loading homepage");
		} else {
			console.log("homepage loaded");
			//console.log("data is" + JSON.stringify(data));
			//console.log(data);
			//res.send(data);
			res.render('wall.ejs', data);
			//res.send("have fun!");
			//res.render('homepage2_notfinished.ejs', {friends: [{username: "a", isOnline:true},{username:"b",isOnline:false}],user:"b",posts:[]});
		}
	});

};

var visualizer = function(req, res) {
	if (!req.session.username) {
		res.redirect('/');
	}
	console.log(req.session.username);

	//friends
	var username = req.session.username;

	db.get_visualizer(username, function(err,data) {
		if (err) {
			console.log("there was an error loading visualizer");
		} else {
			console.log("visualizer loaded");
			console.log("data is" + JSON.stringify(data));
			console.log(data);

			res.send(data);
			//res.send("homepage!");
		}
	});
	
};

var getChildren = function(req, res) {

	console.log(req.params.user);

	//friends
	var username = req.params.user;

	db.get_visualizer(username, function(err,data) {
		if (err) {
			console.log("there was an error loading visualizer");
		} else {
			console.log("visualizer loaded");
			console.log("data is" + JSON.stringify(data));
			console.log(data);

			res.send(data);

		}
	});
};

var demo = function(req, res) {
	// if (!req.session.username) res.redirect('/');
	//console.log(req.params);
	//query friends list
	//query all posts and comments with ID
	res.render('demo.ejs', {friends: [{username:{S: "a"}, loggedOn:{BOOL:true}}, {username:{S: "b"}, loggedOn:{BOOL:false}}], user: "b"});
};

var friends = async function(req, res) {
	
	//res.render('friends.ejs', {friends: [{username:{S: "a"}, loggedOn:{BOOL:true}}, {username:{S: "b"}, loggedOn:{BOOL:false}}], user: "b"});
	var username = req.session.username;
	var friend = "random";
	var friendsMap = new Map();

	await db.check_add_friend_input(username,friend,function(err, data) {
		if (err || data.Items.length === 0) {
			//username doesn't match
			console.log("username error")
		}
		  else {
			console.log("callback was called with data lol");
			res.send("friends");
	/*		console.log(friend);
			console.log(data.Items[0].friends.S)
			
			var friendsString = data.Items[0].friends.S.split(",");
			friendsString.reverse();
			friendsString.pop();
			friendsString.pop();
			friendsString.reverse();
			console.log("~~~~~~~~~~~~~~FRIENDS~~~~~~~~~~~~~~~");
			console.log(friendsString);
			console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
			
			//var boo = "yo";
			for (let i = 0, p = Promise.resolve(); i < friendsString.length; i++) {
				p = p.then(_ => new Promise(resolve =>
					setTimeout(function () {
					 	boo = isOnline(friendsString[i]);
						//friendsMap.set(friendsString[i], boo);
						//console.log(friendsMap);
						resolve();
					}, Math.random()*1000)
					));
				
			}; */
			


		}
	});
};

var isOnline = async function(username, req,res) {

	//var username = "nchennm"

		fr = username;
		console.log("checking! " + fr);
		await db.check_loggedOn(fr, function(err,data) {

			if (err || data.Items.length == 0) {
				//could not find username in table
				console.log("friend username not found");
			} else {
				if(data.Items[0].loggedOn.BOOL) {
					console.log(fr + " is loggedOn");
					console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
					//console.log(fr);
					return true;
					
					
				} else {
					console.log(fr + " is not loggedOn");
					console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
					return false;
					
				}
				
			}
			
		});
};

var addfriend = function(req, res) {
	//get the username info, current session user
	//check it in the db
	//if not in the db, send an error, otherwise send "", add it to the friends of the user
	//res.send("error");
	var username = req.session.username;
	//modify w front-end
	var friend = req.body.content;
	var message = "default";
	db.check_create_account_input(friend, function(err, data) {
		var invalid = false;
		if (err || data.Items.length == 0) {
			//could not find username in table
			if(invalid) {
				return false;
			}
			console.log("friend username not found");
			res.send("friend username not found!");
			invalid = true;
			

		} else {
			//show warning that user exists
			if(invalid) {
				//res.send("outer most function reran");
				return false;
			}
			console.log("check_create_account passed, existing username found");
			db.check_add_friend_input(username,friend,function(err, data) {
				if(invalid) {
				//	res.send("error2!");
					return false;
				}
				
				if (err || data.Items.length === 0) {
					if(invalid) {
						//res.send("error!");
						return false;
					}
					//username doesn't match
					console.log("username error");
					res.send("username error!");
					//message = "trouble querying friendlist of user";
					//res.send(message);
					invalid = true;
					//return;
				}
				  else {

					if(invalid) {
						//res.send("error3!");
						return false;
					}
					console.log(friend);
					console.log(data.Items[0].friends.S)
					
					var friendsString = data.Items[0].friends.S.split(",");
					console.log("friends array: " + friendsString);
					console.log(friendsString.includes(friend));
					
					

					if(friendsString.includes(friend)) {
						if(invalid) {
							//res.send("error4!");
							return false;
						}
						//friend found
						console.log("friend already exists!");
						res.send("friend already exists!");
						invalid = true;

					} else {
						if(invalid) {
							//res.send("error5!");
							return false;
						}
						friendsString.push(friend);
						newFriends = friendsString.toString();
						console.log("newfriends: " + newFriends);
						console.log(newFriends);
						console.log("adding friend...");
						db.add_friend(username,newFriends,function(err, data) {
							
							
							if (err) {
								if(invalid) {
									//res.send("error6!");
									return false;
								}
								console.log("add friend error");
								invalid = true;
								//res.send("add friend error!");
							
								
							} else {
								//if(invalid) {
								//	res.send("error7!");
								//	return false;
								//}
								console.log("friend updated!");

								
								res.send("friend added!");
								invalid = true;
								//console.log(friendsString);
								
								//return;
								
							}
							invalid = true;
							return;
						});
						invalid = true;	
					} return;
					//invalid = true;  
					
				} return;

			});
			//invalid = true;
		}return;
	});

};


var deletefriend = function(req, res) {
	//get the username info, current session user
	//check it in the db
	//if not in the db, send an error, otherwise send "", add it to the friends of the user
	//res.send("error");
	var username = req.session.username;
	//modify w front-end
	var friend = req.body.content;
	
	db.check_create_account_input(friend, function(err, data) {
		var invalid = false;
		if (err || data.Items.length == 0) {
			//could not find username in table
			if(invalid) {
				return false;
			}
			console.log("friend username not found");
			res.send("friend username not found!");
			invalid = true;
			

		} else {
			//show warning that user exists
			if(invalid) {
				//res.send("outer most function reran");
				return false;
			}
			console.log("check_create_account passed, existing username found");
			db.check_add_friend_input(username,friend,function(err, data) {
				if(invalid) {
				//	res.send("error2!");
					return false;
				}
				
				if (err || data.Items.length === 0) {
					if(invalid) {
						//res.send("error!");
						return false;
					}
					//username doesn't match
					console.log("username error");
					res.send("username error!");
					//message = "trouble querying friendlist of user";
					//res.send(message);
					invalid = true;
					//return;
				}
				  else {

					if(invalid) {
						//res.send("error3!");
						return false;
					}
					console.log(friend);
					console.log(data.Items[0].friends.S)
					
					var friendsString = data.Items[0].friends.S.split(",");
					console.log("friends array: " + friendsString);
					console.log(friendsString.includes(friend));
					
					

					if(friendsString.includes(friend)) {
						if(invalid) {
							//res.send("error4!");
							return false;
						}
						//friend found
						var index = friendsString.indexOf(friend);
						console.log("index is:" + index);
						friendsString.splice(index,1);

						//friendsString.push(friend);
						newFriends = friendsString.toString();
						console.log("newfriends: " + newFriends);
						console.log(newFriends);
						console.log("deleting friend...");
						db.delete_friend(username,newFriends,friend,function(err, data) {
							
							
							if (err) {
								if(invalid) {
									//res.send("error6!");
									return false;
								}
								console.log("delete friend error");
								invalid = true;
								//res.send("add friend error!");
							
								
							} else {
								//if(invalid) {
								//	res.send("error7!");
								//	return false;
								//}
								console.log("friend deleted!");

								
								res.send("friend deleted!");
								invalid = true;
								//console.log(friendsString);
								
								//return;
								
							}
							invalid = true;
							return;
						});

						invalid = true;

					} else {
						if(invalid) {
							//res.send("error5!");
							return false;
						}
						console.log("friend already exists!");
						res.send("not your friend!");
						invalid = true;	
					} return;
					//invalid = true;  
					
				} return;

			});
			//invalid = true;
		}return;
	});

};


var addComment = function(req, res) {
	//var postid = req.body.postid
	var postid = "12345";
	var creator = req.session.username;
	var comment = "this is a comment" + " madeBy" + creator;
	console.log(comment.split("madeBy")); 

	db.get_post_by_id(postid, function(err, data) {
		if (err || data.Items.length == 0) {
			//could not find post in table
			console.log("post not found");
		} else {
			//show warning that post exists
			console.log("post found");

			console.log(data.Items[0].comments.S);

			var commentsList = data.Items[0].comments.S.split(",");
			console.log("commentsList: " + commentsList);

			commentsList.push(comment);
			var newComments = commentsList.toString();
			console.log("newComments: " + newComments);
			console.log(newComments);
			console.log("adding new comment...");
			db.add_comment(postid,newComments,function(err, data) {
				if (err) {
					console.log("add comment error");
				} else {
					console.log("comments updated!");
					res.send("comment added");
				}

			});			
		}
	});

};



var logOut = function(req, res) {
	var userName = req.session.username;
	db.set_offline(userName, function(err,data) {
		if(err) {
			console.log("error logging out" +userName);
		}
		if(data) {
			console.log("successfully logged out" + userName);
		}
	});
	req.session.username = null; 
	res.redirect('/');
};

var signUp = function(req, res) {
	res.render('signup.ejs', {});
};
	
var updateAccountPage = function(req, res) {
	if (!req.session.username) {
		res.redirect('/');
	}
	console.log(req.session.username);
	res.render('update_account.ejs', {});
};
	
var checkLoginInput = function(req, res) {
	  var userName = req.body.username;
	  var password = req.body.password;
	  password = sha256(password);
	  console.log("Username: " + userName + "; Password: " + password);
	  db.check_login_input(userName, password, function(err, data) {
		if (err || data.Items.length === 0) {
			//tell the user that the user name and password didn't work
			//res.render('errorLogin.ejs', {});
			res.redirect('/');
		}
		  else {
			console.log(password);
			console.log(data.Items[0].password.S)  
			if(data.Items[0].password.S === password) {
				//sign them in
				req.session.username = userName; 
				//redirect to restaurants
				db.set_online(userName, function(err,data) {
					if(err) {
						console.log("error logging in" +userName);
					}
					if(data) {
						console.log("successfully logged in" + userName);
					}
				});
				res.redirect('/homepage');
			} else {
				console.log("password wrong");
				res.redirect('/');
			}
			  
		  }
	  });

};

var createAccount = function(req, res) {

	var username = req.body.username;
	var password = req.body.password;
	var fullname = req.body.fullname;
	var interests = req.body.interests.toString();
	var loggedOn = req.body.loggedOn;
	var email = req.body.email;
	var affiliation = req.body.affiliation;
	var birthday = req.body.birthday;

	//console.log(interests);
	//const { username, password, fullname, interestsString, loggedOn } = req.body;
	//console.log(interests.toString());
	var fullName = req.body.fullName;
	console.log("Username: " + username + "; Password: " + password + "; Full Name: " + fullName);

	db.check_create_account_input(username, function(err, data) {
		if (err || data.Items.length == 0) {
			//could not find username in table
			console.log("username available");
			//req.session.username = username; 			
			console.log("creating account...");
			db.create_account(username, password, fullname, interests, loggedOn, email, affiliation, birthday, function(err, data) {
				if (err) {
					//res.render('errorSignup.ejs', {});
					console.log(err)
				} else {
					//sign them in
					  req.session.username = username; 
					  console.log("new Username: " + username);
					//redirect to restaurants
					res.redirect('/homepage');
				}
			});
		} else {
			//show warning that user exists
			console.log("check_create_account passed, existing username found");
			res.redirect('/signup');
			
		}
	});
	
};

var updateAccount = function(req, res) {
	var username = req.session.username;
	
	function generate_id() { 
		var id = Math.ceil(Math.random()*10);
		var idstr = "";
		for (var i = 0; i < id; i++) {
			idstr += Math.ceil(Math.random()*10)
		}
		
		var id_ch = Math.ceil(Math.random()*10);
		for (var i=0; i<id_ch; i++) {
			var ranNum = Math.ceil(Math.random()*25);
			idstr += (String.fromCharCode(65 + ranNum));
		}	
		return idstr;
  }

	
	var postid = generate_id();


	var password = req.body.password;
	var fullname = req.body.fullname;
	var interests = req.body.interests;

	var email = req.body.email;
	var affiliation = req.body.affiliation;
	var birthday = req.body.birthday;

	//postid,content,timestamp, userName, password, fullname, 
	//interests, affiliation, birthday, email

	db.update_account(postid,username,password,fullname,interests,affiliation,birthday,email, function(err,data) {
		if (err) {
			//res.render('errorSignup.ejs', {});
			console.log("error updating account");
		} else {
			//sign them in
			  console.log("updated account for: " + username);
			  //res.send("updated account");
			//redirect to restaurants
			//res.redirect('/homepage');
		}
	});

	res.redirect('/homepage');
}

var getAttribute = async function(username, attribute, req,res) {

	//var attribute = "interests"; 
	//var username = req.session.username;

		fr = username;
		console.log("checking! " + fr);
		await db.get_attribute(fr,attribute, function(err,data) {

			if (err || data.Items.length == 0) {
				//could not find username in table
				console.log("username not found");
			} else {				
				switch (attribute) {
					case "password":
						attrib = data.Items[0].password.S;
						console.log("PASSWORD: " + attrib);
						break;
					case "interests":
						attrib = data.Items[0].interests.S;
						console.log("INTERESTS: " + attrib);
						break;
					case "loggedOn":
						attrib = data.Items[0].loggedOn.BOOL;
						console.log("LOGGEDON: " + attrib);
						break;
					case "friends":
						attrib = data.Items[0].friends.S;
						console.log("FRIENDS: " + attrib);
						break;
					case "affiliation":
						attrib = data.Items[0].affiliation.S;
						console.log("AFFILIATION: " + attrib);
						break;						
					case "username":
						attrib = data.Items[0].username.S;
						console.log("USERNAME: " + attrib);
						break;		
					case "email":
						attrib = data.Items[0].email.S;
						console.log("EMAIL: " + attrib);
						break;	
					case "fullname":
						attrib = data.Items[0].fullname.S;
						console.log("FULLNAME: " + attrib);
						break;
					case "birthday":
						attrib = data.Items[0].birthday.S;
						console.log("BIRTHDAY: " + attrib);
						break;																					
				};		
			}			
		});
};

var createPost = function(req, res) {
	var d = new Date();
	var postid = req.body.id;
	var creator = req.session.username;
	var receiver = req.body.receiver;
	var comments = "this is a comment"
	var content = req.body.content;
	var timestamp = d.getTime().toString();

	console.log("postid: " + postid + "; creator: " + creator + "; receiver: " + receiver
				+ "; comments: " + comments + "; content: " + content + "; time: " + timestamp);

	db.create_post(postid,comments,content,creator,receiver,timestamp, function(err, data) {
		if (err) {
			console.log("an error occured while creating post...")
		} else {
			//show warning that user exists
			console.log("post created");
			res.send("new post");
		}
	});
	
};

var createComment = function(req, res) {
	var d = new Date();
	var postid = req.body.id;
	var creator = req.session.username;
	var content = req.body.content;
	var timestamp = d.getTime().toString();

	//console.log(content.split("madeBy")); 
	//can always find creator by str.split finding last element!

	console.log("postid: " + postid + "; creator: " + creator
				+ "; content: " + content + "; time: " + timestamp);

	db.add_comment(postid,content, function(err, data) {
		if (err) {
			console.log("an error occured while creating post...")
		} else {
			//show warning that user exists
			console.log("comment created");
			res.send("new comment");
		}
	});
	
};


var getOwnedPost = async function(req,res) {
	var username = req.session.username;

	await db.get_owned_post(username, function(err, data) {
		if (err ||data.Items.length == 0) {
			console.log("an error occured while getting post...")
		} else {
			//show warning that user exists
			console.log("posts found.");
		}		
	});
};

var getReceivedPost = async function(req,res) {
	var username = req.session.username;

	await db.get_received_post(username, function(err, data) {
		if (err||data.Items.length == 0) {
			console.log("an error occured while getting post...")
		} else {
			//show warning that user exists
			console.log("posts found.");
			console.log("~~~~~~~~~~~~~~RECEIVED POSTS~~~~~~~~~~~~~~~");
			data.Items.forEach(function(post) {
				console.log(
					 "postid- " + post.postid + ": ",
					 "owner: "+post.owner, "- content:", post.content,
					 post.comments, "receiver: "+post.receiver,
					 "timestamp: " + post.timestamp);
			});
			console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"); 
		}		
	});
};

///////////////////////////////////////////////
///////////////////////////////////////////////

//Chat Routes

//chatMain is the page that let's the user start a new chat or enter previous chats
var getChatMain = function(req, res) {
	if (!req.session.username) {
		res.redirect('/');
	};
	//determine which chats the user is in
	db.get_chats_for_user(req.session.username, function(err, data) {
		if (err) {
			console.log(err);
		} else {
			//retrieve relevant info for each of these groups
			db.get_chat_info_for_groups(data.Items, function(err, data1) {
				if (err) {
					console.log(err);
				} else {
					res.render('chatMain.ejs', {data: {Items: data1}});
				}
			});
			
		}
	});
	
};

var startChat = function(req, res) {
	if (req.body.usernamesToChat === "") {
		res.send("Oops! Looks like you didn't input any usernames. Click back and try again!");
	} else {
		var names = req.body.usernamesToChat + "," + req.session.username;
		var peopleArray = names.split(',').sort();

		//trim each name
		for (var i = 0; i < peopleArray.length; i++) {
			peopleArray[i] = peopleArray[i].trim();
		}

		//confirm that each of these usernames is actually in the database
		db.check_for_users(peopleArray, function (err, data) {
			if (err) {
				console.log(err);
			} else if (!data) {
				console.log("One of the users did not exist.");
				res.send("One or more of the users did not exist. Go back and try again.");
			} else {
				//actually start the chat
				var groupID = "G" + Date.now();
				db.startChat(peopleArray, groupID, function (err, data) {
					if (err) {
						res.send("Something went wrong with your request. Try again!");
					} else {
						//render the specific chat page assigned to this group
						res.render('chatbox.ejs', { groupID: groupID, username: req.session.username });
					}
				});

			}
		});

	}

};

var sendMessage = function(req, res) {
	var text = req.body.text;
	var room = req.body.room;
	var sender = req.session.username; //req.body.sender also works
	
	db.send_message(text, room, sender, function (err, data) {
		if (err) {
			res.send("Something went wrong with your request. Try again!");
		} else {
			//render the specific chat page assigned to this group
			res.render('chatbox.ejs', {groupID: room, username: req.session.username}); 
		}
	});
	
};

//enter the chatbox for a chat you are already a part of
var joinChat = function(req, res) {
	console.log(req.params.gID);
	
	db.get_messages(req.params.gID, function(err, data) {
		if (err) {
			console.log(err);
		} else {
			console.log(req.session.username);
			res.render('chatboxOngoing.ejs', {groupID: req.params.gID, username: req.session.username, data: data});
		}
	});
	
};

//Leave a chat group permanently
var leaveChat = function(req, res) {
	
	//remove user from chats table
	db.leave_chat_chats(req.body.gID, req.session.username, function(err, data) {
		if (err) {
			console.log(err);
		} else {
			//determine which users should still be in chat
			var users = 'test';
			db.get_users_in_chat(req.body.gID.trim(), function (err, data1) {
				if (err) {
					console.log(err);
				} else {
					//console.log(data1);
					//console.log(data1.Items[0].users.S);
					users = data1.Items[0].users.S;
					users_array = users.split(",");
					updated_array = [];
					
					//weed out the unwanted username
					for (var i = 0; i < users_array.length; i++) {
						if (users_array[i].trim() !== req.session.username.trim()) {
							updated_array.push(users_array[i].trim());
						}
					}

					//reconstruct the string
					users_string = "";
					for (var i = 0; i < updated_array.length; i++) {
						users_string = users_string + updated_array[i];
						if (i !== updated_array.length - 1) {
							users_string = users_string + ", ";
						}
					}


					console.log("USERS: " + users_string);

					//remove user from chat info table
					db.update_row_chatInfo(req.body.gID, req.session.username, users_string, function (err, data) {
						if (err) {
							console.log(err);
						} else {
							console.log("We made it TO the final ELSE!");
						}
					});

					
				}
			});

			
		}
	});

	res.send("OK");
	
};

//Add a user to a group chat
var addUser = function (req, res) {
	var newUser = req.body.newUser;

	if (newUser !== "") {

		var users = [];
		users.push(newUser);

		db.check_for_users(users, function (err, data) {
			if (err) {
				console.log(err);
			} else if (!data) {
				console.log("One of the users did not exist.");
				res.send("One of the users did not exist. Go back and try again.");
			} else {
				console.log("All users exist. Adding to tables...");
				//add user to both tables: chat and chatInfo
				//start with chats table
				db.add_user_to_chats(newUser, req.body.gID, function (err, data) {
					if (err) {
						console.log(err);
					} else {
						console.log("Successfully added user: " + newUser + " to CHATS TABLE for chat: " + req.body.gID);
						console.log(data);
						//compile complete list of users currently in chat
						var users = 'test';
						db.get_users_in_chat(req.body.gID.trim(), function (err, data1) {
							if (err) {
								console.log(err);
							} else {
								console.log(data1);
								console.log(data1.Items[0].users.S);
								users = data1.Items[0].users.S.trim() + ", " + newUser;

								//add user to chatInfo table
								db.update_row_chatInfo(req.body.gID, newUser, users, function (err, data) {
									if (err) {
										console.log(err);
									} else {
										console.log("Successfully added user: " + newUser + " to CHATINFO TABLE for chat: " + req.body.gID);
										res.redirect('/chatmain');
									}
								});
							}
						});
					}
				});
			}
		});

	}

};


///////////////////////////////////////////////

var routes = {
	get_login: getLogin,
	check_login: checkLoginInput,
	sign_up: signUp,
	update_account_page: updateAccountPage,
	create_account: createAccount,
	get_user_attribute: getAttribute,
	
	update_account: updateAccount,
	get_homepage: getHomepage,
	refresh_home: refreshhome,
	demo: demo,
	friends: friends,
	is_online: isOnline,
	add_friend: addfriend,
	delete_friend: deletefriend,
	wall: wall,
	create_post: createPost,
	get_owned_post: getOwnedPost,
	get_received_post: getReceivedPost,
	create_comment: createComment,
	add_comment: addComment,
	visualizer: visualizer,
	getChildren: getChildren, 

	logout: logOut,
	get_chat_main: getChatMain,
	join_chat: joinChat,
	start_chat: startChat,
	send_message: sendMessage,
	leave_chat: leaveChat,
	add_user: addUser,
	//get_messages: getMessages
	
	send_message: sendMessage, 
	// chat_box: chatBox 
	get_search: getSearch,
	post_search: postSearch,
	post_rank: postRank  
};

module.exports = routes; 
