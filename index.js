const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const passport = require("passport");

const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

if (process.env.NODE_ENV !== "production") {
  // Load environment variables from .env file in non prod environments
  require("dotenv").config();
}
require("./utils/connectdb");
require("./strategies/JwtStrategy");
require("./strategies/LocalStrategy");
require("./authenticate");

const userRouter = require("./routes/userRoutes");

const app = express();

app.use(bodyParser.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

//Add the client URL to the CORS policy

const whitelist = process.env.WHITELISTED_DOMAINS
  ? process.env.WHITELISTED_DOMAINS.split(",")
  : [];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },

  credentials: true,
};

app.use(cors(corsOptions));

app.use(passport.initialize());



app.get("/", function (req, res) {
  res.send({ status: "success" });
  //res.send(JSON.stringify(authorize().then(listEvents).catch(console.error)));
});
let retval = {};
async function setRetval(r){
  retval = r;
} 
async function getRetval(){
  return retval;
}
app.get("/Events",async function (req, res) {
 
  
  await authorize().then(listEvents).catch(console.error);

  console.log("->>>>>>>>>>>>>>>>you touched me and it felt oh so good :) : "+JSON.stringify(await getRetval()));
  res.send(await getRetval());
});

app.post("/eventInsert",async function (req, res) {
  //await authorize().then(insertEvent).catch(console.error);
  
  

  console.log("->>>>>>>>>>>>>>>>New event ready for insertion "+JSON.stringify(req.body));
  const myevent = {
    'summary': req.body.title,
    'location': '5860 Milwaukee Rd. Bellingham',
    'description': req.body.describtion,
    'start': {
      'dateTime': req.body.startDay+'T'+req.body.startTime+':00-07:00',
   
      'timeZone': 'America/Los_Angeles',
    },
    'end': {
      'dateTime': req.body.endDay+'T'+ req.body.endTime + ':00-07:00',
      'timeZone': 'America/Los_Angeles',
    },
    'recurrence': [
      'RRULE:FREQ=DAILY;COUNT=1'
    ],
    'attendees': [
      {'email': req.body.email},//TODO get the client code to push down attendee email
      {'email': 'asha.trebacz@gmail.com'},//email of site owner
    ],
    'reminders': {
      'useDefault': false,
      'overrides': [
        {'method': 'email', 'minutes': 24 * 60},
        {'method': 'popup', 'minutes': 10},
      ],
    },
  };
  setEvent(myevent);
  console.log("->>>>>>>>>>>>>>>>New event constructed: "+JSON.stringify(await getEvent()));
  await authorize().then(insertEvent).catch(console.error);
  //res.send(await getRetval());
});

app.use("/users", userRouter);
///////////////////////////////////////////////////



// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar','https://www.googleapis.com/auth/calendar.events'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var event = {};
//   'summary': 'Google I/O 2015',
//   'location': '800 Howard St., San Francisco, CA 94103',
//   'description': 'A chance to hear more about Google\'s developer products.',
//   'start': {
//     "dateTime": "2023-12-14T21:21-07:00","timeZone":"America/Los_Angeles"}
//     'dateTime': '2023-12-14T16:00:00-07:00',
//     'timeZone': 'America/Los_Angeles',
//   },
//   'end': {
//     'dateTime': '2023-12-14T17:00:00-07:00',
//     'timeZone': 'America/Los_Angeles',
//   },
//   'recurrence': [
//     'RRULE:FREQ=DAILY;COUNT=2'
//   ],
//   'attendees': [
//     {'email': 'lpage@example.com'},
//     {'email': 'sbrin@example.com'},
//   ],
//   'reminders': {
//     'useDefault': false,
//     'overrides': [
//       {'method': 'email', 'minutes': 24 * 60},
//       {'method': 'popup', 'minutes': 10},
//     ],
//   },
// };
async function getEvent(){
  return event;
}
async function setEvent(ev){
 event = ev;
}
async function insertEvent(auth){
  const calendar = google.calendar({version: 'v3', auth});
  const event = await getEvent();
  calendar.events.insert({
    auth: auth,
    calendarId: 'primary',
    resource: event,
  }, function(err, event) {
    if (err) {
      console.log('There was an error contacting the Calendar service: ' + err);
      return;
    }
    console.log('Event created: %s', event.htmlLink);
  });
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listEvents(auth) {
  const calendar = google.calendar({version: 'v3', auth});
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: 20,
    singleEvents: true,
    orderBy: 'startTime',
  });
  const events = res.data.items;
  //let retval = "";
  if (!events || events.length === 0) {
    console.log('No upcoming events found.');
    return;
  }
  console.log('Upcoming 10 events:');
  events.map((event, i) => {
    const start = event.start.dateTime || event.start.date;
    console.log(`${start} - ${event.summary}`);
    //retval=retval+`${start} - ${event.summary}`
  });
  await setRetval(res.data.items);
  console.log("ready to return events:"+JSON.stringify(getRetval()));

  return retval;
}




//Start the server in port 8081
//////////////////////////////////////////////////


const server = app.listen(process.env.PORT || 8081, function () {
  const port = server.address().port;

  console.log("App started at port:", port);
});
