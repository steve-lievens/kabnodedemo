"use strict";
// --------------------------------------------------------------------------
// Require statements
// --------------------------------------------------------------------------
var http = require( 'http' )
var proxiedHttp = require( 'findhit-proxywrap' ).proxy( http, {strict: false} )
var express = require("express");
var bodyParser = require("body-parser");
var mongoClient = require("mongodb").MongoClient;

var os = require("os");

// --------------------------------------------------------------------------
// Useful test vars
// --------------------------------------------------------------------------
var hostname = os.hostname();

// --------------------------------------------------------------------------
// In memory object to hold Code Engine Events
// --------------------------------------------------------------------------
var codeEngineEvents = [];

// --------------------------------------------------------------------------
// Read environment variables
// --------------------------------------------------------------------------

// When not present in the system environment variables, dotenv will take them
// from the local file
require("dotenv-defaults").config({
  path: "my.env",
  encoding: "utf8",
  defaults: "my.env.defaults",
});

// App ENV
var APP_NAME = process.env.APP_NAME;
var CLIENT_VERSION = process.env.CLIENT_VERSION;
var CLIENT_TITLE = process.env.CLIENT_TITLE;
var WELCOME_MSG = process.env.WELCOME_MSG;
var WELCOME_IMG = process.env.WELCOME_IMG;
var REGION = process.env.REGION;
var FIBO_COUNT = process.env.FIBO_COUNT;
var MONGO_DEMO = (process.env.MONGO_DEMO == 'true');

// Mongo ENV
// Some defaults first
var MONGO_HOST = "localhost";
var MONGO_PORT = "27017";

// Check if we have ENV from the automatically generated secret of a MongoDb deployment on OCP
var MONGO_USER = process.env["database-user"];
var MONGO_PW = process.env["database-password"];

// Overrides
// If host and port are given via ENV, override the defaults
if (process.env.MONGO_HOST) {
  MONGO_HOST = process.env.MONGO_HOST;
}
if (process.env.MONGO_PORT) {
  MONGO_PORT = process.env.MONGO_PORT;
}
if (process.env.MONGO_USER) {
  MONGO_USER = process.env.MONGO_USER;
}
if (process.env.MONGO_PW) {
  MONGO_PW = process.env.MONGO_PW;
}

// --------------------------------------------------------------------------
// Initialization App Logging
// --------------------------------------------------------------------------
console.log("INFO: Here we go ! Starting up the app !!!", APP_NAME);

console.log("INFO: CLIENT_VERSION", CLIENT_VERSION);
console.log("INFO: CLIENT_TITLE", CLIENT_TITLE);
console.log("INFO: WELCOME_MSG", WELCOME_MSG);
console.log("INFO: WELCOME_IMG", WELCOME_IMG);
console.log("INFO: FIBO_COUNT", FIBO_COUNT);
console.log("INFO: MONGO_DEMO", MONGO_DEMO);
if(MONGO_DEMO){
  console.log("INFO: MONGO_HOST", MONGO_HOST);
  console.log("INFO: MONGO_PORT", MONGO_PORT);
  console.log("INFO: MONGO_USER", MONGO_USER);
  console.log("INFO: MONGO_PW", "*********");  
}

// --------------------------------------------------------------------------
// Setup the express server
// --------------------------------------------------------------------------
var app = express();

// create application/json parser
var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({
  extended: false,
});

// serve the files out of ./public as our main files
app.use(express.static(__dirname + "/public"));

// Setup MongoDB URL
var url =
  "mongodb://" +
  MONGO_USER +
  ":" +
  MONGO_PW +
  "@" +
  MONGO_HOST +
  ":" +
  MONGO_PORT +
  "/";

// --------------------------------------------------------------------------
// Express Server runtime
// --------------------------------------------------------------------------
// Start our server !
//app.listen(process.env.PORT || 8080, function () {
//  console.log("INFO: app is listening on port %s", process.env.PORT || 8080);
//});

var srv = proxiedHttp.createServer( app ).listen( process.env.PORT || 8080 )

// --------------------------------------------------------------------------
// REST API : health
// --------------------------------------------------------------------------
app.get("/health", function (req, res) {
  var health = {
    health: "OK",
  };
  console.log("INFO: Service health returning " + JSON.stringify(health));
  res.json(health);
});

// --------------------------------------------------------------------------
// REST API : retrieve info about the host
// --------------------------------------------------------------------------
app.get("/getEnvironment", function (req, res) {
  var hostobj = {
    hostname: hostname,
    region: REGION,
    app_name: APP_NAME,
    client_title: CLIENT_TITLE,
    client_version: CLIENT_VERSION,
    welcome_msg: WELCOME_MSG,
    welcome_img: WELCOME_IMG,
    mongo_demo: MONGO_DEMO,
    client_ip: req.ip
  };
  console.log(
    "INFO: Service getEnvironment returning : " + JSON.stringify(hostobj)
  );

  // get all request info from the client
  const echo = {
    path: req.path,
    headers: req.headers,
    method: req.method,
    body: req.body,
    cookies: req.cookies,
    fresh: req.fresh,
    hostname: req.hostname,
    ip: req.ip,
    ips: req.ips,
    protocol: req.protocol,
    query: req.query,
    subdomains: req.subdomains,
    xhr: req.xhr,
    os: {
      hostname: os.hostname()
    },
    connection: {
      servername: req.servername
    }
  };

  res.json(hostobj);
});

// --------------------------------------------------------------------------
// REST API : connect to Db
// --------------------------------------------------------------------------
app.get("/connectToDb", function (req, res) {
  console.log("INFO: connectToDb - Starting db connection.");
  mongoClient.connect(
    url,
    { useNewUrlParser: true, useUnifiedTopology: true },
    function (err, db) {
      console.log("INFO: connectToDb - Inside connect method.");
      if (err) {
        console.log("ERROR: connectToDb - connect failed.");
        res.status(500).send(err.message);
      } else {
        console.log("INFO: connectToDb - connect success");
        var dbo = db.db("demodb");
        var myobj = { name: "Company Inc", address: "Highway 37" };
        dbo.collection("customers").insertOne(myobj, function (err, result) {
          if (err) {
            console.log("ERROR: connectToDb - insertOne failed.");
            res.status(500).send(err.message);
          } else {
            console.log("INFO: connectToDb - 1 document inserted");
            db.close();
            console.log("INFO: connectToDb - Ended db connection.");
            var retObj = {
              dbconnect: true,
            };
            console.log(
              "INFO: Service connectToDb returning : " + JSON.stringify(retObj)
            );
            res.json(retObj);
          }
        });
      }
    }
  );
});

// --------------------------------------------------------------------------
// REST API : send error to log
// --------------------------------------------------------------------------
app.get("/senderror", function (req, res) {
  var notused = {
    zero: "zero",
  };
  console.log("ERROR: Test error message - No real error has occurred.");
  res.json(notused);
});

// --------------------------------------------------------------------------
// REST API : crash the server ... yeah ... really !
// --------------------------------------------------------------------------
app.get("/crashPod", function (req, res) {
  var hostobj = {
    hostname: hostname,
  };
  console.log("INFO: Crashing Pod " + hostname);
  res.json(hostobj);

  // This kills the server
  process.exit(1);
});

// --------------------------------------------------------------------------
// REST API : get a fibonacci number
// --------------------------------------------------------------------------
app.get("/fibo", function (req, res) {
  console.log("Generating Fibonacci number with value : " + FIBO_COUNT);
  var fibo_number = fibo(FIBO_COUNT);

  var fiboobj = {
    fibo: fibo_number,
  };

  res.json(fiboobj);
});

// --------------------------------------------------------------------------
// REST API : get the list of Code Engine Events
// --------------------------------------------------------------------------
app.get("/getevents", function (req, res) {
  res.json(codeEngineEvents);
});

// --------------------------------------------------------------------------
// REST API : Post info
// --------------------------------------------------------------------------
app.post("/", jsonParser, function (req, res) {
  var message = req.body;
  console.log("Receiving event from Code Engine");

  if (message.bucket){
    console.log("It's an Event from Cloud Object Storage");
    console.log("COS bucket : " + message.bucket);
    codeEngineEvents.push(message);
    console.log("Pushing it into the event list, we now have " + codeEngineEvents.length + " events");
  }

  res.status(200).end();
});

// --------------------------------------------------------------------------
// Helper : fibonacci : cpu intensive function to create some load
// --------------------------------------------------------------------------
function fibo(n) {
  if (n < 2) return 1;
  else return fibo(n - 2) + fibo(n - 1);
}
