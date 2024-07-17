
var AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
var db = new AWS.DynamoDB();

var async = require('async');
const { json } = require('body-parser');
const { create_account } = require('../routes/routes');
//methods below are for project!!!!!!!
var stemmer = require('stemmer');
/**Helper function: help identify stop words
 * return TRUE if is not stop word
 */
var filter = function(s) {
		var stopWords = ["a","all","any","but","the"]
		for (var i = 0; i < stopWords.length; i++) {
			if (s === stopWords[i]) {
				return false;
			}
		}
		return true;
};
/**
 * Search news by a string of keywords and Date (a String) 
 * @param keyword: a keyword typed by user. CHECK BEFOREHAND: it's not empty AND it's not stop words 
 * @param date: current date (must be in format: 2020-05-26)
 * @param tablename: table to query
 * @param callback error if failed; list of items with attributes date,
		url, keyword, and title if succeeded. Returned data format see below: 
 * output a list of list[counts, title, url]
 */
/* Output Format for myDB_search("adam artwork blast bag dog", "2022-05-26", "test");: 
[ [ 3,
    'Jim Carrey Blasts \'Castrato\' Adam Schiff And Democrats In New Artwork',
    'https://www.huffingtonpost.com/entry/jim-carrey-adam-schiff-democrats_us_5b0950e8e4b0fdb2aa53e675' ],
  [ 2,
    'Julianna Margulies Uses Donald Trump Poop Bags To Pick Up After Her Dog',
    'https://www.huffingtonpost.com/entry/julianna-margulies-trump-poop-bag_us_5b093ec2e4b0fdb2aa53df70' ],
  [ 1, 'earlier date', 'www.earlier' ] ]
*/
var myDB_search = function(string, date, name, callback) {
	var wordArray = string.split(" ");
	var promiseArray = [];
	for(var i = 0; i < wordArray.length; i++) {
		var word = wordArray[i];
		if (filter(word) && word !== " ") { //not stop or empty
			var wordlo = word.toLowerCase();
			var stemWord = stemmer(wordlo);
			console.log('[newsearch.js] start querying: ' + word + 'on or before date ' + date);
			
			var params = {
        		TableName: name, 
        		KeyConditionExpression: "keyword = :k and #time <= :d",
        		ExpressionAttributeValues:{
            		':k': {S: stemWord},
            		':d': {S: date}
        		},
				ExpressionAttributeNames:{
					"#time": "date"
				},
				ScanIndexForward: false //rank latest to oldest
    		};

   		 	var promise = db.query(params, function(err, data) {
        		if (err || data.Items.length == 0) {
            		console.log("[newsearch.js] query error: " + err);
					//callback(err, null);
        		} else {
        		}
    		}).promise();
			
			promiseArray.push(promise);
		}
	}
	var lookup = new Map();
	var count = {};
	//start processing
	Promise.all(promiseArray).then(
		function(values) {
			for (var i = 0; i < values.length; i++){
				var output = (values[i].Items);
				for (var j = 0; j < output.length; j++) {
					var title = output[j].title.S;
					var url = output[j].url.S;
					//console.log("title is: " + title + "with URL: " + url);
					//construct lookup map
					lookup.set(title, url);
					//construct count map
					if (count[title] == null) {
						count[title] = 1;
					} else {
						var num = count[title];
						count[title] = num + 1;
					}
				}
			}
			//output: list of list[counts, title, url]
			var output = Object.entries(count)
					.sort((a,b) => b[1]- a[1])
					.map(el=>[el[1], el[0], lookup.get(el[0])]);
			console.log(output);
			callback(output);
		}
		
	);
};

var myDB_queryID = function(username,callback){
	var params = {
		TableName: "rankNews", 
		KeyConditionExpression: "userid = :i",
		ExpressionAttributeValues:{
			':i': {S: username},
		}		
	};

	var promise = db.query(params, function(err, data) {
		if (err || data.Items.length == 0) {
			console.log("[rankNews table] query error: " + err);
			
		} else {

		}
	}).promise();

	promise.then(function(data){
		console.log("queried recommended news success");
		var stringNewsId = data.Items[0].news.S;
		myDB_rank(stringNewsId, "2022-05-26", function(data){
			console.log('FINALLY! queried success');
			callback(data);
		});
	})
};





/**
 * Helper function: given string of newsid, parse and then query news_store by each id
 * return 2d array of [[title, url]]
 * @param {*} string 
 * @param {*} date 
 * @param {*} callback 
 */
var myDB_rank = function(string, date, callback) {
	//parse string e.g. "1,0,3" -> String[] array = [1,0,3]
	var idArray = string.split(",");
	var promiseArray = [];
	
	for(var i = 0; i < idArray.length - 1 && i < 10; i++) {
		var id = idArray[i];
		console.log("start querying table [news_store] with id: " + id);
		
		var params = {
			TableName: "news_store", 
			KeyConditionExpression: "newsid = :i and #time <= :d",
			ExpressionAttributeValues:{
				':i': {N: id},
				':d': {S: date}
			},
			ExpressionAttributeNames:{
				"#time": "date"
			},
			
		};

		//store each query as a promise
		var promise = db.query(params, function(err, data) {
			if (err) {
				console.log("[newsearch.js] query error: " + err);
				//callback(err, null);
			} else {
				
			}
		}).promise();
		//console.log("the size of promise array is " + promiseArray.length);
		promiseArray.push(promise);
	}
	var out = new Array(10);
	
	//schedule all the queries
	Promise.all(promiseArray).then(
		function(values) {
			for (var i = 0; i < values.length; i++){
				var output = (values[i].Items);
				
				var title = output[0].title.S;
				var url = output[0].url.S;
				
				console.log("title is: " + title);
				var e = new Array(2);
				e[0] = title;
				e[1] = url;
				//console.table(e);
				out[i] = e;
				
				
			}
			//console.log("returned result from news_store is: " + JSON.stringify(out));
			callback(out);
		}		
	);
				
};





var sha256 = require('js-sha256');

//METHODS ABOVE ARE FOR PROJECT!!!!

var checkLoginInput = function(userName, password, callback) {
	password = sha256(password);
	console.log("Looking up: Username: " + userName + "; Password: " + password); 
	console.log(userName);
	var params = {
		KeyConditions: {
		  username: {
			ComparisonOperator: 'EQ',
			AttributeValueList: [ { S: userName } ]
		  }, 
		},
		TableName: "accounts",
		AttributesToGet: [ 'username', 'password' ]
	};

	db.query(params, function(err, data) {
	  if (err) { 
		  console.log(err);
		  callback(err, null);
	  } else {
		  console.log("query succeeded");
		  console.log(data);
		  console.log(data.Items[0].password.S);
		  if (data.Items[0].password.S == password) {
		    console.log("correct password!");
			callback(null, data);
			return;
		  } else {
			console.log("incorrect password!");  
			callback(null, data);
		  }
		  
	  }
	});
};

var setOnline = function(username, callback) {
	var docClient = new AWS.DynamoDB.DocumentClient();	

	console.log('logging on: ' + username);

	var params = {
		TableName: "accounts",
		Key: {
			"username": username
		},
		UpdateExpression: "set loggedOn = :f",
		ExpressionAttributeValues:{
			":f": true
		},
		ReturnValues:"UPDATED_NEW"
	};

    docClient.update(params, function(err, data) {
        if (err) {
			console.log(err, err.stack);
			callback(err, null);	 
		} else {
			console.log(data);
			callback(err, data);		
		}
    });
};

var setOffline = function(username, callback) {
	var docClient = new AWS.DynamoDB.DocumentClient();	

	console.log('logging off: ' + username);

	var params = {
		TableName: "accounts",
		Key: {
			"username": username
		},
		UpdateExpression: "set loggedOn = :f",
		ExpressionAttributeValues:{
			":f": false
		},
		ReturnValues:"UPDATED_NEW"
	};

    docClient.update(params, function(err, data) {
        if (err) {
			console.log(err, err.stack);
			callback(err, null);	 
		} else {
			console.log(data);
			callback(err, data);		
		}
    });
};

var checkCreateAccountInput = function(userName, callback) {
	var docClient = new AWS.DynamoDB.DocumentClient();	
	console.log("Looking up: Username: " + userName); 

	var params = {
		TableName: "accounts",
		ProjectionExpression: "#U",
		KeyConditionExpression: "#U = :x",
		ExpressionAttributeNames: { "#U": "username" },
		ExpressionAttributeValues: {
			":x": userName
		}
	};

	docClient.query(params, function(err, data) {
		if (err) {
			console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
			callback(err, null);
		} else if(data.Items.length == 0) {
			console.log("Unable to query. item length 0");
			callback(null, data);
		} else {
			console.log("Query succeeded.");
			console.log(data)
			console.log(data.Items.values);
			console.log(data.Items.length);
			console.log(data.Items[0]);			
		  	callback(null, data);
	    }
	});
};

var checkAddFriendInput = async function(userName, friend, callback) {
	console.log("Looking up friends for: " + userName + "; Checking: " + friend); 
//assuming friend username exists. check if friend is a friend of user
	var params = {
		KeyConditions: {
		  username: {
			ComparisonOperator: 'EQ',
			AttributeValueList: [ { S: userName } ]
		  }, 
		},
		TableName: "accounts",
		AttributesToGet: [ 'username', 'friends' ]
	};

	var p = db.query(params, function(err, data) {
	  if (err) { 
		  console.log(err);
		  callback(err, null);
	  } else {
		  console.log("query succeeded");
		  console.log(data);
		  console.log(data.Items[0].friends.S);
		  //TODO str.split array
		  
			callback(null, data);
		
		  
	  }
	}).promise();
	p.then(
		function(success) {
			var results = new Array();
			console.log(success.Items[0].friends);	
			var friendsString = success.Items[0].friends.S.split(",");
			console.log(friendsString);	
			friendsString.reverse();
			friendsString.pop();
			friendsString.pop();
			friendsString.reverse();
			console.log(friendsString);	

			for(friend of friendsString) {
				results.push(friend);
			};
			var results2 = new Array();
			for (userName of results) {
				console.log("checking loggedOn: Username: " + userName); 

				var params = {
					KeyConditions: {
					  username: {
						ComparisonOperator: 'EQ',
						AttributeValueList: [ { S: userName } ]
					  }, 
					},
					TableName: "accounts",
					AttributesToGet: [ 'username', 'password','fullname','interests','loggedOn','friends','affiliation','birthday','email' ]
				};
			
				var p2 = db.query(params, function(err, data) {
				  if (err) { 
					  console.log(err);
					  callback(err, null);
				  } else {
					  console.log("query succeeded");
					  console.log(data);
					  console.log(data.Items[0].loggedOn.BOOL);
					  
					  callback(null, data);
					  
				  }
				}).promise();
				results2.push(p2);
			}

			Promise.all(results2).then(
				success2 => {
					var results3 = new Array();
					for(elemt of success2) {
						for(item of elemt.Items) {
							var friendStatus = {
								user: item.username.S,
								fullname: item.fullname.S,
								interests: item.interests.S,
								isOnline: item.loggedOn.BOOL,
								friends: item.friends.S,
								affiliation: item.affiliation.S,
								birthday: item.birthday.S,
								email: item.email.S
							}
							results3.push(friendStatus);
						}
					}
					console.log("SUCCESS!");
					//THIS IS WHERE TO RES.SEND
					console.log(results3);
				},
				error2 => {
					console.log("error2");
				}
			);

		},
		function(error) {
			console.log("error1");
		}
	);

};
    

var checkLoggedOn = async function(userName, callback) {
	console.log("checking loggedOn: Username: " + userName); 

	var params = {
		KeyConditions: {
		  username: {
			ComparisonOperator: 'EQ',
			AttributeValueList: [ { S: userName } ]
		  }, 
		},
		TableName: "accounts",
		AttributesToGet: [ 'username', 'loggedOn' ]
	};

	db.query(params, function(err, data) {
	  if (err) { 
		  console.log(err);
		  callback(err, null);
	  } else {
		  console.log("query succeeded");
		  console.log(data);
		  console.log(data.Items[0].loggedOn.BOOL);
		  
		  callback(null, data);
		  
	  }
	});
};


var createAccount = function(username, password, fullname, interests, loggedOn, email, affiliation, birthday, callback) {
	console.log('creating user: ' + username);
	pass = sha256(password);
	console.log(pass);
	

	var params = {
		Item: {
			"username": {
				S: username
			},
			"password": {
				S: pass
			},
			"fullname": {
				S: fullname
			},
			"interests": {
				S: interests
			},
			"loggedOn": {
				BOOL: true
			},
			"email": {
				S: email
			},
			"affiliation": {
				S: affiliation
			},
			"birthday": {
				S: birthday
			},
			"friends": {
				S: "default,default"
			}			
		},
		ReturnConsumedCapacity: "TOTAL",
		TableName: "accounts"
	};
	db.putItem(params, function(err, data) {
		if (err) {
			console.log(err, err.stack);
			callback(err, null);
		} // an error occurred
		else {
			console.log(data);
			callback(err, data);
		}            // successful response
	})
};

var createPost = function(postid, comments, content, owner, receiver, timestamp, callback) {
	//console.log('creating post: ' + username);
	var params = {
		Item: {
			"postid": {
				S: postid
			},
			"comments": {
				S: "hey friend,leave a comment below!"
			},
			"content": {
				S: content
			},
			"owner": {
				S: owner
			},
			"receiver": {
				S: receiver
			},
			"timestamp": {
				S: timestamp
			}		
		},
		ReturnConsumedCapacity: "TOTAL",
		TableName: "posts"
	};
	db.putItem(params, function(err, data) {
		if (err) {
			console.log(err, err.stack);
			callback(err, null);
		} // an error occurred
		else {
			console.log(data);
			callback(err, data);
		}            // successful response
	})
};

var getHomepage = async function(owner,wallOwner, callback) {
	var docClient = new AWS.DynamoDB.DocumentClient();
	
	console.log("getting owned posts from: " + owner);
	var params = {
		TableName: "posts",
		ProjectionExpression: "#o, postid, comments, content, receiver, #timest",
		FilterExpression: "#o = :ownerr",
		ExpressionAttributeNames: {
			"#o": "owner",
			"#timest": "timestamp",
		},
		ExpressionAttributeValues: {
			":ownerr": owner
		}
	};

	console.log("Scanning posts table.");
	var pa = docClient.scan(params).promise();

	function onScan(err, data) {
		if (err) {
			console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
			callback(err, null);
		} else {
			// print all the posts
			console.log("Scan succeeded.");

			 
			// continue scanning if we have more movies, because
			// scan can retrieve a maximum of 1MB of data
			if (typeof data.LastEvaluatedKey != "undefined") {
				console.log("Scanning for more...");
				params.ExclusiveStartKey = data.LastEvaluatedKey;
				docClient.scan(params, onScan);
			}
			callback(null, data);


			console.log("~~~~~~~~~~~~~~OWNED POSTS~~~~~~~~~~~~~~~");
			
			var results = new Array();

			data.Items.forEach(function(post) {
				console.log(
					 "postid- " + post.postid + ": ",
					 post.owner, "- content:", post.content,
					 post.comments, "receiver: "+post.receiver,
					 "timestamp: " + post.timestamp);
			});
			console.log(data.Items);
			console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"); 
		}
	}

	pa.then(
		success => {
			ownedPosts = success.Items;

			console.log("getting received posts from: " + owner);
			var params = {
				TableName: "posts",
				ProjectionExpression: "#r, postid, comments, content, #o, #timest",
				FilterExpression: "#r = :receiverr",
				ExpressionAttributeNames: {
					"#r": "receiver",
					"#timest": "timestamp",
					"#o": "owner",
				},
				ExpressionAttributeValues: {
					":receiverr": owner
				}
			};
		
			console.log("Scanning posts table.");
			var pb = docClient.scan(params).promise();
		
			function onScan(err, data) {
				if (err) {
					console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
					callback(err, null);
				} else {
					// print all the posts
					console.log("Scan succeeded.");
		
					 
					// continue scanning if we have more movies, because
					// scan can retrieve a maximum of 1MB of data
					if (typeof data.LastEvaluatedKey != "undefined") {
						console.log("Scanning for more...");
						params.ExclusiveStartKey = data.LastEvaluatedKey;
						docClient.scan(params, onScan);
					}
					callback(null, data);
				}
			}
			pb.then(
				success2 => {
					wallPosts = success2.Items;
					var allRelatedPosts = {
						owned_posts: ownedPosts,
						wall_posts: wallPosts
					}
					console.log("POGGGGGGGGGGGGGGGG");
					//console.log(allRelatedPosts);



					var params = {
						KeyConditions: {
						  username: {
							ComparisonOperator: 'EQ',
							AttributeValueList: [ { S: owner } ]
						  }, 
						},
						TableName: "accounts",
						AttributesToGet: [ 'username', 'friends' ]
					};
					var p = db.query(params).promise();
					/* var p = db.query(params, function(err, data) {
					  if (err) { 
						  console.log(err);
						  callback(err, null);
					  } else {
						  console.log("query succeeded");
						  console.log(data);
						  console.log(data.Items[0].friends.S);
						  //TODO str.split array						  
							callback(null, data);				  
					  }
					}).promise(); */
					p.then(
						function(success) {
							var results = new Array();
							console.log(success.Items[0].friends);	
							var friendsString = success.Items[0].friends.S.split(",");
							console.log(friendsString);	
							friendsString.reverse();
							friendsString.pop();
							friendsString.pop();
							friendsString.reverse();
							console.log(friendsString);	
				
							for(friend of friendsString) {
								results.push(friend);
							};
							var results2 = new Array();
							for (userName of results) {
								console.log("checking loggedOn: Username: " + userName); 
				
								var params = {
									KeyConditions: {
									  username: {
										ComparisonOperator: 'EQ',
										AttributeValueList: [ { S: userName } ]
									  }, 
									},
									TableName: "accounts",
									AttributesToGet: [ 'username', 'password','fullname','interests','loggedOn','friends','affiliation','birthday','email' ]
								};
								var p2 = db.query(params).promise();
								/*var p2 = db.query(params, function(err, data) {
								  if (err) { 
									  console.log(err);
									  callback(err, null);
								  } else {
									  console.log("query succeeded");
									  console.log(data);
									  console.log(data.Items[0].loggedOn.BOOL);
									  
									  callback(null, data);
									  
								  }
								}).promise(); */
								results2.push(p2);
							}
				
							Promise.all(results2).then(
								success2 => {
									var results3 = new Array();
									for(elemt of success2) {
										for(item of elemt.Items) {
											var friendStatus = {
												username: item.username.S,
												fullname: item.fullname.S,
												interests: item.interests.S,
												isOnline: item.loggedOn.BOOL,
												friends: item.friends.S,
												affiliation: item.affiliation.S,
												birthday: item.birthday.S,
												email: item.email.S
											}
											results3.push(friendStatus);
										}
									}
									console.log("SUCCESS!");
									//THIS IS WHERE TO RES.SEND
									//console.log(results3);


									//get ALL POSTS:

									console.log("getting all posts");
									var params = {
										TableName: "posts",
										ProjectionExpression: "#r, postid, comments, content, #o, #timest",
										ExpressionAttributeNames: {
											"#r": "receiver",
											"#timest": "timestamp",
											"#o": "owner",
										},
									};
								
									console.log("Scanning posts table.");
									var ap = docClient.scan(params).promise();
								
									function onScan(err, data) {
										if (err) {
											console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
											callback(err, null);
										} else {
											// print all the posts
											console.log("Scan succeeded.");
								
											 
											// continue scanning if we have more movies, because
											// scan can retrieve a maximum of 1MB of data
											if (typeof data.LastEvaluatedKey != "undefined") {
												console.log("Scanning for more...");
												params.ExclusiveStartKey = data.LastEvaluatedKey;
												docClient.scan(params, onScan);
											}
											callback(null, data);
										}
									}
									ap.then(
										success3 => {
											var allPosts = success3.Items;
											
											//get ALL USERNAMES:

											console.log("getting all usernames");
											var params = {
												TableName: "accounts",
												ProjectionExpression: "#u",
												ExpressionAttributeNames: {
													"#u": "username",
												},
											};

											console.log("Scanning accounts table.");
											var userScan = docClient.scan(params).promise();
											
											userScan.then(
												success4 => {
													var allUsernames = success4.Items;
													
													var userName = owner;
													var params = {
														KeyConditions: {
														  username: {
															ComparisonOperator: 'EQ',
															AttributeValueList: [ { S: userName } ]
														  }, 
														},
														TableName: "accounts",
														AttributesToGet: [ 'username', 'password','fullname','interests','loggedOn','friends','affiliation','birthday','email' ]
													};
													var userAtt = db.query(params).promise();



													//console.log(userAtt);

													userAtt.then(
														success5 => {
															var userAttributes = success5.Items;

															console.log("SUCCESSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS!");
															var homepage = {
																user: owner,
																user_attributes: userAttributes,
																owner: wallOwner,
																friends: results3,
																owned_received_posts: allRelatedPosts,
																posts: allPosts,
																all_usernames_in_db: allUsernames
															}
															console.log("===============================================================================================");
															//DO RES.SEND HERE!!!
															//console.log(homepage);
															console.log("===============================================================================================");
															//res.send(homepage);


															var finalf = function(callb) {
																callb(null,homepage);
															}
															
															finalf(callbac);
				
															function callbac(err, data) {
																if (err) {
																	console.error("weird");
																	callback(err, null);
																} else {
																	// print all the posts
																	console.log("Scan POG.");
																	//callback(null, homepage);
														
																	
																	// continue scanning if we have more movies, because
																	// scan can retrieve a maximum of 1MB of data
																	callback(null, data);
																}
															}


														},
														error5 => {
															console.log("error5");
														}
													);									

													


												},
												error4 => {
													console.log("error4");
												}
											);

										},
										error3 => {
											console.log("error scanning for all posts");
										}
									);
								},
								error2 => {
									console.log("error2");
								}
							);
				
						},
						function(error) {
							console.log("error1");
						}
					);


				},
				error2 => {
					console.log("error2");
				}
			);
		},
		error => {
			console.log("error")
		}
	); 

};

var getVisualizer = async function(user, callback) {
	var docClient = new AWS.DynamoDB.DocumentClient();
	
	var params = {
		KeyConditions: {
		  username: {
			ComparisonOperator: 'EQ',
			AttributeValueList: [ { S: user } ]
		  }, 
		},
		TableName: "accounts",
		AttributesToGet: [ 'username', 'friends' ]
	};
	var p = db.query(params).promise();

	p.then(
		function(success) {
			var results = new Array();
			console.log(success.Items[0].friends);	
			var friendsString = success.Items[0].friends.S.split(",");
			console.log(friendsString);	
			friendsString.reverse();
			friendsString.pop();
			friendsString.pop();
			friendsString.reverse();
			console.log(friendsString);	

			for(friend of friendsString) {
				results.push(friend);
			};
			var results2 = new Array();
			for (userName of results) {
				//console.log("checking loggedOn: Username: " + userName); 

				var params = {
					KeyConditions: {
					  username: {
						ComparisonOperator: 'EQ',
						AttributeValueList: [ { S: userName } ]
					  }, 
					},
					TableName: "accounts",
					AttributesToGet: ['username','fullname','affiliation']
				};
				var p2 = db.query(params).promise();
		
				results2.push(p2);
			}

			Promise.all(results2).then(
				success2 => {
					var results3 = new Array();
					
					for(elemt of success2) {
						for(item of elemt.Items) {
							var affilArray = new Array();
							
							var affilObj = {
								id: item.affiliation.S,
								name: item.affiliation.S,
								children: []
							}
							affilArray.push(affilObj);
							var friendStatus = {	
								id: item.username.S,						
								name: item.fullname.S,
								children: [],
							}
							results3.push(friendStatus);
						}
					}
					console.log("SUCCESS!");
					
					console.log(results3);
							
					var userName = user;
					var params = {
						KeyConditions: {
						  username: {
							ComparisonOperator: 'EQ',
							AttributeValueList: [ { S: userName } ]
						  }, 
						},
						TableName: "accounts",
						AttributesToGet: ['fullname','affiliation']
					};
					var userAtt = db.query(params).promise();

					userAtt.then(
						success5 => {
							console.log(success5.Items[0]);
							//var userAttributes = success5.Items;
							var fullName = success5.Items[0].fullname.S;
							//var userAffil = success5.Items[0].affiliation.S;
							
							var userAffil = {
								id: success5.Items[0].affiliation.S,
								name: success5.Items[0].affiliation.S,
								children: []
							}
							results3.push(userAffil);

							console.log("SUCCESSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS!");
							var finalResult = {
								id: user,
								name: fullName,
								children: results3,
							}
							console.log("===============================================================================================");
							//DO RES.SEND HERE!!!
							console.log(finalResult);
							console.log("===============================================================================================");
							//res.send(homepage);


							var finalf = function(callb) {
								callb(null,finalResult);
							}
							
							finalf(callbac);

							function callbac(err, data) {
								if (err) {
									console.error("weird");
									callback(err, null);
								} else {
									// print all the posts
									console.log("Scan POG.");
									//callback(null, homepage);
						
									
									// continue scanning if we have more movies, because
									// scan can retrieve a maximum of 1MB of data
									callback(null, data);
								}
							}
						},
						error5 => {
							console.log("error5");
						}
					);	
							
				},
				error2 => {
					console.log("error2");
				}
			);

		},
		function(error) {
			console.log("error1");
		}
	);					

};


var getReceivedPost = async function(receiver, callback) {
	var docClient = new AWS.DynamoDB.DocumentClient();
	
	console.log("getting received posts from: " + receiver);
	var params = {
		TableName: "posts",
		ProjectionExpression: "#r, postid, comments, content, #o, #timest",
		FilterExpression: "#r = :receiverr",
		ExpressionAttributeNames: {
			"#r": "receiver",
			"#timest": "timestamp",
			"#o": "owner",
		},
		ExpressionAttributeValues: {
			":receiverr": receiver
		}
	};

	console.log("Scanning posts table.");
	docClient.scan(params, onScan);

	function onScan(err, data) {
		if (err) {
			console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
			callback(err, null);
		} else {
			// print all the posts
			console.log("Scan succeeded.");

			 
			// continue scanning if we have more movies, because
			// scan can retrieve a maximum of 1MB of data
			if (typeof data.LastEvaluatedKey != "undefined") {
				console.log("Scanning for more...");
				params.ExclusiveStartKey = data.LastEvaluatedKey;
				docClient.scan(params, onScan);
			}
			callback(null, data);
		}
	}
};

var getPostbyID = function(postID, callback) {
	console.log("Looking up postid: " + postID); 
	var params = {
		KeyConditions: {
		  postid: {
			ComparisonOperator: 'EQ',
			AttributeValueList: [ { S: postID } ]
		  }, 
		},
		TableName: "posts",
		AttributesToGet: [ 'postid', 'comments', 'content', 'owner', 'receiver', 'timestamp' ]
	};

	db.query(params, function(err, data) {
	  if (err) { 
		  console.log(err);
		  callback(err, null);
	  } else {
		  console.log("query succeeded");
		  console.log(data.Items[0]);		  
			callback(null, data);	
	  }
	});
};


var addFriend = function(username, friendString, callback) {
	var docClient = new AWS.DynamoDB.DocumentClient();	

	console.log('adding friendstring: ' + friendString);
	var frArray = friendString.split(",");
	var friend = frArray[frArray.length-1];
	console.log(frArray);
	console.log(frArray[frArray.length-1]);
	console.log("~~~~~~~~~~~~~~~~~~~~");

	var params = {
		TableName: "accounts",
		Key: {
			"username": username
		},
		UpdateExpression: "set friends = :f",
		ExpressionAttributeValues:{
			":f": friendString
		},
		ReturnValues:"UPDATED_NEW"
	};

	var addedFriend = docClient.update(params).promise();
	
	addedFriend.then(
		success1 => {
			console.log("promise" + success1.Items);
			var params2 = {
				KeyConditions: {
				  username: {
					ComparisonOperator: 'EQ',
					AttributeValueList: [ { S: friend } ]
				  }, 
				},
				TableName: "accounts",
				AttributesToGet: [ 'username', 'friends' ]
			};
		
			var friendFriends = db.query(params2).promise();

			friendFriends.then(
				success2 => {
					var friendsAr = success2.Items[0].friends.S.split(",");
					console.log(friendsAr);	
					friendsAr.push(username);
					var friendsStr = friendsAr.toString();
					console.log(friendsStr);

					var params3 = {
						TableName: "accounts",
						Key: {
							"username": friend
						},
						UpdateExpression: "set friends = :f",
						ExpressionAttributeValues:{
							":f": friendsStr
						},
						ReturnValues:"UPDATED_NEW"
					};
				
					docClient.update(params3, function(err, data) {
						if (err) { 
							console.log(err);
							callback(err, null);
						} else {
							console.log("updating friend's friendlist!");
		
							callback(null, data);
						  
							
						}
					  });

				},
				error2 => {
					console.log("error2");
				}
			);
		},
		error1 => {
			console.log("error1");
		}
	);
};

var deleteFriend = function(username, friendString, friend, callback) {
	var docClient = new AWS.DynamoDB.DocumentClient();	

	console.log('adding friendstring: ' + friendString);
	console.log('deleting: ' + friend);

	var params = {
		TableName: "accounts",
		Key: {
			"username": username
		},
		UpdateExpression: "set friends = :f",
		ExpressionAttributeValues:{
			":f": friendString
		},
		ReturnValues:"UPDATED_NEW"
	};

	var deletedFriend = docClient.update(params).promise();
	
	deletedFriend.then(
		success1 => {
			console.log("promise" + success1.Items);
			var params2 = {
				KeyConditions: {
				  username: {
					ComparisonOperator: 'EQ',
					AttributeValueList: [ { S: friend } ]
				  }, 
				},
				TableName: "accounts",
				AttributesToGet: [ 'username', 'friends' ]
			};
		
			var friendFriends = db.query(params2).promise();

			friendFriends.then(
				success2 => {
					var friendsAr = success2.Items[0].friends.S.split(",");
					console.log(friendsAr);	

					var index = friendsAr.indexOf(username);
					console.log("user index is:" + index);
					friendsAr.splice(index,1);

						//friendsString.push(friend);
					var newFriends = friendsAr.toString();

					//friendsAr.push(username);
					//var friendsStr = friendsAr.toString();
					console.log(newFriends);

					var params3 = {
						TableName: "accounts",
						Key: {
							"username": friend
						},
						UpdateExpression: "set friends = :f",
						ExpressionAttributeValues:{
							":f": newFriends
						},
						ReturnValues:"UPDATED_NEW"
					};
				
					docClient.update(params3, function(err, data) {
						if (err) { 
							console.log(err);
							callback(err, null);
						} else {
							console.log("updating friend's friendlist!");
		
							callback(null, data);
						  
							
						}
					  });

				},
				error2 => {
					console.log("error2");
				}
			);
		},
		error1 => {
			console.log("error1");
		}
	);
};


var addComment = function(postid, comment, callback) {
	var docClient = new AWS.DynamoDB.DocumentClient();	

	console.log('adding comment: ' + comment);

	var params = {
		TableName: "posts",
		Key: {
			"postid": postid
		},
		UpdateExpression: "set comments = :c",
		ExpressionAttributeValues:{
			":c": comment
		},
		ReturnValues:"UPDATED_NEW"
	};

    docClient.update(params, function(err, data) {
        if (err) {
			console.log(err, err.stack);
			callback(err, null);	 
		} else {
			console.log(data);
			callback(err, data);		
		}
    });
};

var createComment = function(postid, content, owner, timestamp, callback) {
	var docClient = new AWS.DynamoDB.DocumentClient();	

	console.log('creating comment: ' + content);

	var params = {
		Item: {
			"postid": {
				S: postid
			},
			"content": {
				S: content
			},
			"owner": {
				S: owner
			},
			"timestamp": {
				S: timestamp
			}		
		},
		ReturnConsumedCapacity: "TOTAL",
		TableName: "comments"
	};
	db.putItem(params, function(err, data) {
		if (err) {
			console.log(err, err.stack);
			callback(err, null);
		} // an error occurred
		else {
			console.log(data);
			callback(err, data);
		}            // successful response
	});
};


var updateAccount = async function(postid, userName, password, fullname, interests, affiliation, birthday, email, callback) {
	console.log("Looking up attribute for: " + userName); 
	password = sha256(password);

	var params = {
		KeyConditions: {
		  username: {
			ComparisonOperator: 'EQ',
			AttributeValueList: [ { S: userName } ]
		  }, 
		},
		TableName: "accounts",
		AttributesToGet: [ 'username', 'password', 'fullname', 'interests', 'loggedOn', 'friends', 'affiliation', 'birthday', 'email' ]
	};
	var attribs = db.query(params).promise();

	attribs.then(
		success1 => {
			
			function isEmpty(str) {
				return (!str || 0 === str.length);
			}
			var needsStatusUpdate = false;
			if (!isEmpty(fullname) || !isEmpty(interests) || !isEmpty(affiliation) || !isEmpty(birthday)) {
				needsStatusUpdate = true;
				console.log("user needs status update");
			}
			var pass = success1.Items[0].password.S;
			var fulln = success1.Items[0].fullname.S;
			var inter = success1.Items[0].interests.S;
			var affil = success1.Items[0].affiliation.S;
			var birth = success1.Items[0].birthday.S;
			var em = success1.Items[0].email.S;

			if(isEmpty(password)) {
				password = pass;
				console.log(password);
			}
			if(isEmpty(fullname)) {
				fullname = fulln;
				console.log(fullname);
			}
			if(isEmpty(interests)) {
				interests = inter;
				console.log(interests);
			}
			if(isEmpty(affiliation)) {
				affiliation = affil;
				console.log(affiliation);
			}
			if(isEmpty(birthday)) {
				birthday = birth;
				console.log(birthday);
			}
			if(isEmpty(email)) {
				email = em;
				console.log(email);
			}
			interests = interests.toString();

			var docClient = new AWS.DynamoDB.DocumentClient();
			var params = {
				TableName: "accounts",
				Key: {
					"username": userName
				},
				UpdateExpression: "set password = :p, fullname = :f, interests = :i, affiliation = :a, birthday = :b, email = :e",
				ExpressionAttributeValues:{
					":p": password,
					":f": fullname,
					":i": interests,
					":a": affiliation,
					":b": birthday,
					":e": email
				},
				ReturnValues:"UPDATED_NEW"
			};
		
			var updatedAcc = docClient.update(params).promise();

			updatedAcc.then( 
				success2 => {
					console.log(needsStatusUpdate);
					if(needsStatusUpdate == true) {

					var content = ""+ userName + " updated their info! || Current Full name: " + fullname + "|| Current interests: " + interests +"|| Current affiliation: " + affiliation + "|| Current birthday: " + birthday;
					var d = new Date();
					var timestamp = d.getTime().toString();
					

					var params = {
						Item: {
							"postid": {
								S: postid
							},
							"comments": {
								S: "hey friend,leave a comment below!"
							},
							"content": {
								S: content
							},
							"owner": {
								S: userName
							},
							"receiver": {
								S: userName
							},
							"timestamp": {
								S: timestamp
							}		
						},
						ReturnConsumedCapacity: "TOTAL",
						TableName: "posts"
					};
					db.putItem(params, function(err, data) {
						if (err) {
							
							callback(err, null);
						} else {
							console.log(data);
							callback(err, data);
						}            // successful response
					});

					} else {
						var finalf = function(callb) {
							callb(null,"no need status update lol");
						}
						
						finalf(callbac);

						function callbac(err, data) {
							if (err) {
								console.error("weird");
								callback(err, null);
							} else {
								// print all the posts
								console.log(data);
							
								callback(null, "no need status update");
							}
						}
					}

				
					

				},
				error2 => {
					console.log("error2");
				}
			);
		},
		error1 => {
			console.log("error1");
		}
	)
};


///////////////////////////////////////////////

//Chat Functions

var start_chat = function (peopleArray, groupID, callback) {

	console.log('Group ID: ' + groupID);
	groupID = groupID.trim()

	async.each(peopleArray, function (item, cb) {
		var params = {
			TableName: "chats",
			Item: {
				username: { S: item },
				groupID: { S: groupID },
				lastRead: { S: '' + Date.now() },
			}
		};

		console.log("Adding a new item...", params);

		db.putItem(params, function (err, data) {
			if (err) {
				console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
				cb();
			} else {
				console.log("Added item:", JSON.stringify(data, null, 2));

				cb();
			}
		});

	}, function (err) {
		if (err) {
			console.log("A chat member failed to process");
			callback();
		} else {
			console.log("All chat members have processed successfully");

			//create string of all users
			var users = '';
			for (var i = 0; i < peopleArray.length; i++) {
				users = users + peopleArray[i];
				if (i !== peopleArray.length - 1) {
					users = users + ", ";
				}

			}

			var params = {
				TableName: "chatInfo",
				Item: {
					groupID: { S: groupID },
					lastUsed: { S: '' + Date.now() },
					users: { S: users },
				}
			};
	
			console.log("Adding a new item...", params);
	
			db.putItem(params, function (err, data) {
				if (err) {
					console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
					callback();
				} else {
					console.log("Added item:", JSON.stringify(data, null, 2));
					callback();
				}
			});

		}
	});

};

var sendMessage = function (text, room, sender, callback) {

	var params = {
		TableName: "messages",
		Item: {
			groupID: { S: room.trim() },
			timestamp: { S: '' + Date.now() },
			sender: { S: sender },
			text: { S: text }
		}
	};

	console.log("Adding a new item...", params);

	db.putItem(params, function (err, data) {
		if (err) {
			console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
			callback();
		} else {
			console.log("Added item:", JSON.stringify(data, null, 2));
			callback();
		}
	});

};

//gets the chats that a particular user is in
var getChatsForUser = function (username, callback) {
	console.log("Getting a list of all of user's chats");

	var params = {
		ExpressionAttributeValues: {
			":username": {
				S: username
			}
		},
		KeyConditionExpression: "username = :username",
		TableName: "chats"
	};

	db.query(params, function (err, data) {
		if (err) {
			console.log(err);
			callback(err, null);
		} else {
			callback(null, data);
		}
	});
};

//gets the chatInfo for all of the groups in an array
var getChatInfoForGroups = function (items, callback) {
	console.log("Getting chat info for each group");

	var groupIDs = [];
	for (var i = 0; i < items.length; i++) {
		groupIDs.push(items[i].groupID.S);
	}
	
	let result = []

	async.each(groupIDs, function (item, cb) {
		var params = {
			ExpressionAttributeValues: {
				":groupID": {
					S: item
				}
			},
			KeyConditionExpression: "groupID = :groupID",

			TableName: "chatInfo"
		};

		db.query(params, function (err, data) {
			if (err) {
				console.log(err);
				cb();
			} else {
				result.push(data.Items[0])
				cb();
			}
		});

	}, function (err) {
		if (err) {
			console.log(err);
			callback(err, null);
		} else {
			callback(null, result);
		}
	});

};

//This is the function I am using to retrieve all of the previous messages in an ongoing, persistent chat
var getMessages = function (groupID, callback) {
	console.log("Retrieving previous messages...");

	var params = {
		ExpressionAttributeValues: {
			":groupID": {
				S: groupID
			}
		},
		KeyConditionExpression: "groupID = :groupID",
		TableName: "messages"
	};

	db.query(params, function (err, data) {
		if (err) {
			console.log(err);
			callback(err, null);
		} else {
			callback(null, data);
		}
	});
};

//This function removes a user from the chat in the CHATS table
var leaveChatChats = function (groupID, username, callback) {
	console.log("Removing " + username + " from group: " + groupID + " in chats table.");

	var params = {
		Key: {
			"username": {
				S: username.trim()
			},
			"groupID": {
				S: groupID.trim()
			}
		},
		TableName: "chats"
	};
	db.deleteItem(params, function (err, data) {
		if (err) {
			console.log(err, err.stack); // an error occurred
			callback(err);
		} else {
			console.log(data);           // successful response
			callback();
		}
	});
};

//This function removes a user from the chat in the CHATINFO table
var updateRowChatInfo = function (groupID, username, users, callback) {
	console.log("Updating " + username + " in group: " + groupID + " in chatInfo table.");

	var params = {
		ExpressionAttributeNames: {
		 "#U": "users" 
		}, 
		ExpressionAttributeValues: {
		 ":t": {
		   S: users
		  }
		}, 
		Key: {
		 "groupID": {
		   S: groupID.trim()
		  }, 
		}, 
		TableName: "chatInfo", 
		UpdateExpression: "SET #U = :t"
	   };

	   db.updateItem(params, function(err, data) {
		 if (err) {
			 console.log(err, err.stack); // an error occurred
			 callback(err, null);
		 } else {
			console.log(data);           // successful response
			callback(null, data);
		 }    

	   });
};

//this function queries the database to return the users in a given group chat
var getUsersInChat = function (groupID, callback) {
	console.log("Retrieving users in chat...");

	var params = {
		ExpressionAttributeValues: {
			":groupID": {
				S: groupID
			}
		},
		KeyConditionExpression: "groupID = :groupID",
		TableName: "chatInfo"
	};

	db.query(params, function (err, data) {
		if (err) {
			console.log(err);
			callback(err, null);
		} else {
			callback(null, data);
		}
	});
};

//This function adds the new user to the CHATS table in the database
var addUserToChats = function (user, groupID, callback) {
	groupID = groupID.trim()

	var params = {
		TableName: "chats",
		Item: {
			username: { S: user },
			groupID: { S: groupID },
			lastRead: { S: '' + Date.now() },
		}
	};

	console.log("Adding a new row to chats...", params);

	db.putItem(params, function (err, data) {
		if (err) {
			console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
			callback();
		} else {
			console.log("Added item:", JSON.stringify(data, null, 2));
			callback();
		}
	});
}

//this function takes in an array of users and checks if each one exists in the accounts table
var checkForUsers = function (items, callback) {
	let result = true;

	async.each(items, function (item, cb) {
		console.log("Looking up: Username: " + item); 

		var params = {
			ExpressionAttributeValues: {
				":username": {
					S: item
				}
			},
			KeyConditionExpression: "username = :username",
			TableName: "accounts"
		};
	
		db.query(params, function(err, data) {
			if (err) {
				console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
				cb();
			} else if(data.Items.length == 0) {
				console.log("Username not found in database");
				result = false;
				cb();
			} else {
				console.log("Query succeeded.");		
				cb();
			}
		});

	}, function (err) {
		if (err) {
			console.log(err);
			callback(err, null);
		} else {
			callback(null, result);
		}
	});

};

/* We define an object with one field for each method. For instance, below we have
   a 'lookup' field, which is set to the myDB_lookup function. In routes.js, we can
   then invoke db.lookup(...), and that call will be routed to myDB_lookup(...). */

var database = {

	startChat: start_chat,
	leave_chat_chats: leaveChatChats,
	get_users_in_chat: getUsersInChat,
	add_user_to_chats: addUserToChats,
	update_row_chatInfo: updateRowChatInfo,
	check_login_input: checkLoginInput,
	create_account: createAccount,
	send_message: sendMessage,
	get_chats_for_user: getChatsForUser,
	get_chat_info_for_groups: getChatInfoForGroups,
	check_create_account_input: checkCreateAccountInput,
	check_add_friend_input: checkAddFriendInput,
	add_friend: addFriend,
	delete_friend: deleteFriend,
	check_loggedOn: checkLoggedOn,
	update_account: updateAccount,
	create_post: createPost,
	get_homepage: getHomepage,
	get_received_post: getReceivedPost,
	add_comment: addComment,
	get_post_by_id: getPostbyID,
	get_messages: getMessages,
	set_online: setOnline,
	set_offline: setOffline,
	get_visualizer: getVisualizer,
	search: myDB_search,
	rank: myDB_queryID,
	check_for_users: checkForUsers 

};

module.exports = database;
