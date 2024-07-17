const routes = require("./routes/routes")

//////////////////////////////////////////////////////////////////////////
//This section of code is from the original routes.js
///////////////////////////////////////////////////////////////////////

var getMain = function (req, res) {
	res.render('main.ejs', {});
};

//checking login info
var checkLoginInput = function (req, res) {
	var userName = req.body.inputUsername;
	var password = req.body.inputPassword;
	console.log("Username: " + userName + "; Password: " + password);
	db.check_login_input(userName, password, function (err, data) {
		if (err || data.Items.length === 0) {
			//tell the user that the user name and password didn't work
			res.render('errorLogin.ejs', {});
		} else {
			//sign them in
			req.session.username = userName;
			//redirect to restaurants
			res.redirect('http://localhost:80/restaurants');
		}
	});

};

//sign up page
var signUp = function (req, res) {
	res.render('signup.ejs', { error: req.query.error });
};
//create a user
var createAccount = function (req, res) {
	const { username, password, fullname, interests, loggedOn } = req.body;
	db.addUser(username, password, fullname, interests, loggedOn, function (err) {
		res.redirect('/');
		/*	if (err) res.redirect(url.format({
				pathname: '/signup',
				query: {
					error: String(err)
				}
			})); */
	})
};

// restaurants page
var homepage = function (req, res) {
	// if (!req.session.username) res.redirect('/');
	res.render('homepage.ejs');
};



var logOut = function (req, res) {
	req.session.username = null;
	res.redirect('/');
};

//////////////////////////////////////////////////////////////////////////
//This section of code is from the original database.js
///////////////////////////////////////////////////////////////////////

//login
var myDB_login = function (userInput, userInputP, callback) {
	var docClient = new AWS.DynamoDB.DocumentClient();
	console.log('verifying: ' + userInput);

	var params = {
		TableName: "accounts",
		ProjectionExpression: "#U",
		KeyConditionExpression: "#U = :x",
		ExpressionAttributeNames: { "#U": "username" },
		ExpressionAttributeValues: {
			":x": userInput
		}
	};

	docClient.query(params, function (err, data) {
		if (err) {
			console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
			callback(err, null);
		} else {
			console.log("Query succeeded.");
			var params2 = {
				KeyConditions: {
					keyword: {
						ComparisonOperator: 'EQ',
						AttributeValueList: [{ S: userInputP }]
					}
				},
				TableName: "accounts",
				AttributesToGet: ['password']
			};
			db.query(params2, function (err, data) {
				if (err || data.Items.length == 0) {
					callback(err, null);
					console.log("password does not exist");
				} else {
					//items.push({"username": data.Items[i].username.S});
					//callback(err, data.Items[0].username.S);
					console.log("meep");

					if (data.Items[0].value.password.S == userInputP) {
						callback(err, data.Items[0].value.password.S);
						return;
					} else callback(err, null);
				}
			});
		}
	});
}
//create account
var myDB_addUser = function (username, password, fullname, interests, loggedOn, callback) {
	console.log('creating user: ' + username);

	var params = {
		Item: {
			"username": {
				S: username
			},
			"password": {
				S: password
			},
			"fullname": {
				S: fullname
			},
			"interests": {
				S: interests
			},
			"loggedOn": {
				BOOL: true
			}
		},
		ReturnConsumedCapacity: "TOTAL",
		TableName: "accounts"
	};
	db.putItem(params, function (err, data) {
		if (err) {
			console.log(err, err.stack);
			callback(err);
		} // an error occurred
		else {
			console.log(data);
			callback(err, data);
		}            // successful response
	})
}

///////////////////////////////////

// <%if (error) { %>
//     <p style="color: red;"><%= error %></p><p>
//   <% } %> 

//   <p>id="groupID" <%= groupID %></p>

///////////////////////////////////////

// var params = {
// 	ExpressionAttributeNames: {
// 		"#G": "groupID",
// 		"#Lu": "lastUsed",
// 		"#U": "users",
// 	},
// 	ProjectionExpression: "#G, #Lu, #U",
// 	TableName: "chatInfo"
// };

// db.scan(params, function (err, data) {
// 	if (err) {
// 		console.log(err);
// 		callback(err, null);u
// 	} else {
// 		callback(null, data);
// 	}
// });

// var getMessages = function (groupID, callback) {
// 	console.log("Retrieving previous messages...");

// 	var params = {
// 		ExpressionAttributeValues: {
// 			":groupID": {
// 				S: groupID
// 			}
// 		},
// 		KeyConditionExpression: "groupID = :groupID",
// 		TableName: "messages"
// 	};

// 	db.query(params, function (err, data) {
// 		if (err) {
// 			console.log(err);
// 			callback(err, null);
// 		} else {
// 			callback(null, data);
// 		}
// 	});
// };

// var leaveChatChatInfo = function (groupID, username, callback) {
// 	console.log("Removing " + username + " from group: " + groupID + " in chatInfo table.");

// 	var params = {
// 		ExpressionAttributeNames: {
// 		 "#U": "users", 
// 		}, 
// 		ExpressionAttributeValues: {
// 		 ":t": {
// 		   S: "I need to create this String"
// 		  }
// 		}, 
// 		Key: {
// 		 "groupID": {
// 		   S: groupID
// 		  }, 
// 		//  "SongTitle": {
// 		//    S: "Happy Day"
// 		//   }
// 		}, 
// 		TableName: "chatInfo", 
// 		UpdateExpression: "#U = :t"
// 	   };
// 	   dynamodb.updateItem(params, function(err, data) {
// 		 if (err) console.log(err, err.stack); // an error occurred
// 		 else     console.log(data);           // successful response

// 	   });
// };


// var getUsersInChat = function (groupID, callback) {
// 	console.log("Retrieving users in chat...");

// 	var params = {
// 		ExpressionAttributeValues: {
// 			":groupID": {
// 				S: groupID
// 			}
// 		},
// 		KeyConditionExpression: "groupID = :groupID",
// 		TableName: "chatInfo"
// 	};

// 	db.query(params, function (err, data) {
// 		if (err) {
// 			console.log(err);
// 			callback(err, null);
// 		} else {
// 			callback(null, data);
// 		}
// 	});
// };



// //This function adds the new user to the CHATINFO table in the database
// var add_user_to_chatInfo = function (user, groupID, callback) {

// 	var params = {
// 		TableName: "chatInfo",
// 		Item: {
// 			groupID: { S: groupID.trim() },
// 			lastUsed: { S: '' + Date.now() },
// 			users: { S: users.trim() },
// 		}
// 	};

// 	console.log("Adding a new item...", params);

// 	db.putItem(params, function (err, data) {
// 		if (err) {
// 			console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
// 			callback();
// 		} else {
// 			console.log("Added item:", JSON.stringify(data, null, 2));
// 			callback();
// 		}
// 	});

// }

// //this simple query checks if a user exists and returns true if it does and false if it does not
// var checkForUser = function(userName, callback) {
// 	console.log("Looking up: Username: " + userName); 

// 	var params = {
// 		TableName: "accounts",
// 		ProjectionExpression: "#U",
// 		KeyConditionExpression: "#U = :x",
// 		ExpressionAttributeNames: { "#U": "username" },
// 		ExpressionAttributeValues: {
// 			":x": userName
// 		}
// 	};

// 	db.query(params, function(err, data) {
// 		if (err) {
// 			console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
// 			callback(err, null);
// 		} else if(data.Items.length == 0) {
// 			console.log("Unable to query. item length 0");
// 			callback(null, false);
// 		} else {
// 			console.log("Query succeeded.");		
// 		  	callback(null, true);
// 	    }
// 	});
// };


