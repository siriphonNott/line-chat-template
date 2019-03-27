const firebase = require('firebase-admin');
const app = require('express')();
const port = process.env.PORT || 7777;
const cors = require('cors');

const bodyParser = require('body-parser');
app.use(cors({
  origin: ["http://localhost:3000", "https://nottdev.com/live-chat", "http://nottdev.com:5000"],
}));


// parse application/json
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

//Load Config
const lineConfig = require('./config/lineDevelopConfig').config;

//Line-bot
const line = require('@line/bot-sdk');
const client = new line.Client({
  channelAccessToken: lineConfig.channelAccessToken
});

//Firebase
const serviceAccount = require('./config/line-bot-c6d04-firebase-adminsdk-fgb5o-cf20de303e.json');
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://line-bot-c6d04.firebaseio.com"
});

var database = firebase.database()

// ------------ Routing --------------

const getProfile = (userId) => {
  console.log('==> [Get Profile]: userId => ' + userId);
  return new Promise((resolve, reject) => {
    client.getProfile(userId)
      .then(function (profile) {
        console.log('[Get Profile]: successfully!');
        // console.log(profile);
        resolve(profile)
      })
      .catch(function (error) {
        console.log('[Get Profile]: Error');
        console.log(error);
        reject(error);
      });
  });
}

app.get('/', async (req, res) => {
  database.ref(`users/`).once("value", async (snapshot) => {
    console.log(snapshot.val());
  });
  res.json({
    status: 'ok'
  });
});

app.post('/webhook', async function (req, res) {
  console.log('==> POST: /webhook');
  let body = req.body;
  var events = body.events[0];
  var replyToken = events.replyToken;
  let jsonBody = {};
  let json = {};
  json.success = true;

  console.log(body);
  console.log(events.source);
  console.log(`==> [Event Type]: ${events.type}`);
  if (events.type === 'message') {
    console.log(`==> [Message Type]: ${events.message.type}`);
    console.log(events.message);
    switch (events.message.type) {
      case 'text':
        console.log('==> [events] :');
        console.log(req.body.events);
        let text = events.message.text;
        let groupId = events.source.groupId;
        let userId = events.source.userId;
        let sender = (groupId === undefined) ? userId : groupId;

        console.log(`[Text]: ${text}`);
        console.log(`[sender]: ${sender}`);
        console.log(`[replyToken]: ${replyToken}`);
        console.log(`[typeof sender]: ${typeof sender}`);
        console.log(`[typeof text]: ${typeof text}`);
        console.log(`----------------------`);

        const message = {
          type: 'text',
          text: text
        };

        if (message.text !== '') {
          replyMessage(replyToken, message)
            .then((res) => {
              console.log(res);
            })
            .catch((e) => {
              console.log('==> [Error]: ');
              console.log(e);
            })
        }

        break;
      case 'image':
        break;
      case 'video':
        break;
      case 'audio':
        break;
      case 'file':
        break;
      case 'location':
        break;
      case 'sticker':
        break;
      default:
        break;
    }

  } else if (events.type === 'follow' || events.type === 'unfollow') {
    console.log('==> [Events Type]: ' + events.type);

    database.ref(`users/${userId}`).once("value", async (snapshot) => {

      let snapVal = snapshot.val()
      if (!snapshot.exists()) {
        jsonBody.createdAt = events.timestamp;
        jsonBody.updatedAt = events.timestamp;
        jsonBody.follow = events.type;
        jsonBody.replyToken = '';

        let newPostRef = database.ref(`users/${userId}`).push(jsonBody, function (error) {
          if (error) {
            console.log('==> [User add fail]: ' + error);
          } else {
            console.log('==> [User add successfully]');
          }
        });

        console.log('Push.key -> ' + newPostRef.key);

        client.getProfile(userId)
        .then(function (profile) {
          console.log('[Get Profile]: successfully!');
          console.log(profile);
          if(profile) {
            database.ref(`users/${userId}/profile`).set(profile, function (error) {
              if (error) {
                console.log('==> [Add profile fail]: ' + error);
              } else {
                console.log('==> [Add profile successfully]');
              }
            });
            pushMessage(events.source.userId, `Welcome to Botty :)`)
              .then((res) => {
                console.log(res);
              })
              .catch((e) => {
                console.log('==> [Error]: ');
                console.log(e);
              })
          }
        })
        .catch(function (error) {
          console.log('[Get Profile]: Error');
          console.log(error);
          reject(error);
        });

      } else {
        
        var updates = {};
        updates[`users/${userId}/follow`] = events.type;
        updates[`users/${userId}/updatedAt`] = events.timestamp;
        database.ref().update(updates);
        console.log('==> [User update successfully]');
      }
    });
  }

  res.json(json);
});

const replyMessage = async (replyToken, message) => {
  let json = {};
  console.log('==> [replyToken]: ' + replyToken);
  console.log(message);
  return new Promise((resolve, reject) => {
    client.replyMessage(replyToken, message)
      .then(() => {
        console.log('==> [replyMessage successfully!]')
        json.success = 1
        resolve(json)
      })
      .catch((err) => {
        json.success = 0
        console.log('==> [statusCode]: ' + err.statusCode)
        console.log('==> [statusMessage]: ' + err.statusMessage)
        json.statusCode = err.statusCode;
        json.statusMessage = err.statusMessage;
        reject(json)
      });
  });

}

const pushMessage = async (userId, message) => {
  let json = {};
  console.log('==> [userId]: ' + userId);
  console.log(message);
  return new Promise((resolve, reject) => {
    client.pushMessage(userId, message)
      .then(() => {
        console.log('==> [pushMessage successfully!]')
        json.success = 1
        resolve(json)
      })
      .catch((err) => {
        json.success = 0;
        console.log('==> [statusCode: ' + err.statusCode);
        console.log('==> [statusMessage: ' + err.statusMessage);
        json.statusCode = err.statusCode;
        json.statusMessage = err.statusMessage;
        reject(json)
      });

  });
}

//---------------------------------

app.listen(port, function () {
  console.log('Starting node.js on port ' + port);
});