const firebase = require('firebase-admin');
const app = require('express')();
const port = process.env.PORT || 3001;
const cors = require('cors');
const thaiPost = require('./services/thaiPost');

const bodyParser = require('body-parser');
app.use(cors());
// app.use(cors({
//   origin: ["http://localhost:3001", "https://nottdev.com/live-chat", "http://nottdev.com:5000"],
// }));

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
  // database.ref(`users/`).once("value", async (snapshot) => {
  //   console.log(snapshot.val());
  // });
  res.json({
    status: 'ok'
  });
});

app.get('/post/:id', async (req, res) => {
  console.log('/post/'+req.params.id);
  let resBody = {};
  let emsid = req.params.id;
  let result = await thaiPost.getTracking(emsid);
  resBody['success'] = result!=null;
  resBody['data'] = result;
  res.send(resBody);
});

app.post('/webhook', async function (req, res) {
  console.log('==> POST: /webhook');
  let body = req.body;
  let events = body.events[0];
  let replyToken = events.replyToken;
  let userId = events.source.userId || null;
  let groupId = events.source.groupId || null;
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
        let sender = (groupId === undefined) ? userId : groupId;

        console.log(`[Text]: ${text}`);
        console.log(`[sender]: ${sender}`);
        console.log(`[replyToken]: ${replyToken}`);
        console.log(`[typeof sender]: ${typeof sender}`);
        console.log(`[typeof text]: ${typeof text}`);
        console.log(`----------------------`);

        let resMsg = "";
        if(text.length == 13) {
          let result = await thaiPost.getTracking(text);
          resMsg = result==null ? "หมายเลขไม่ถูกต้อง กรุณาพิมพ์ใหม่อีกครั้ง" : result[result.length - 1];
        } else {
          resMsg = "รูปแบบของหมายเลขไม่ถูกต้อง (13 หลัก) กรุณาพิมพ์ใหม่อีกครั้ง";
        }

        const message = {
          type: 'text',
          text: resMsg
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

      if (!snapshot.exists()) {
        jsonBody.createdAt = events.timestamp;
        jsonBody.updatedAt = events.timestamp;
        jsonBody.follow = events.type;
        jsonBody.replyToken = '';

        database.ref(`users/${userId}`).set(jsonBody, function (error) {
          if (error) {
            console.log('==> [User add fail]: ' + error);
          } else {
            console.log('==> [User add successfully]');
          }
        });

        // console.log('Push.key -> ' + newPostRef.key);

        //Get Profile
        if (events.type === 'follow') {
          client.getProfile(userId)
            .then(function (profile) {
              console.log('[Get Profile]: successfully!');
              console.log(profile);
              if (profile) {
                database.ref(`users/${userId}/profile`).set(profile, function (error) {
                  if (error) {
                    console.log('==> [Add profile fail]: ' + error);
                  } else {
                    console.log('==> [Add profile successfully]');
                  }
                });
                // let greetingMessage = [{
                //     type: "text",
                //     text: `Hello  ${profile.displayName} \n\nWelcome to Botty Chat Bot :)\n\nStatus: ${profile.statusMessage || '-'}`
                //   },
                //   {
                //     type: "image",
                //     originalContentUrl: profile.pictureUrl,
                //     previewImageUrl: profile.pictureUrl,
                //   }
                // ]
                // pushMessage(events.source.userId, greetingMessage)
                //   .then((res) => {
                //     console.log('==> [Push Greeting message successfully]');
                //   })
                //   .catch((e) => {
                //     console.log('==> [Error]: ');
                //     console.log(e);
                //   })

              }
            })
            .catch(function (error) {
              console.log('[Get Profile]: Error');
              console.log(error);
              reject(error);
            });
        }

      } else {

        var updates = {};
        updates[`users/${userId}/follow`] = events.type;
        updates[`users/${userId}/updatedAt`] = events.timestamp;
        database.ref().update(updates);
        console.log('==> [User update successfully]');
        if (events.type === 'follow') {
          //Get Profile
          client.getProfile(userId)
            .then(function (profile) {
              console.log('[Get Profile]: successfully!');
              console.log(profile);
              if (profile) {
                database.ref(`users/${userId}/profile`).set(profile, function (error) {
                  if (error) {
                    console.log('==> [Add profile fail]: ' + error);
                  } else {
                    console.log('==> [Add profile successfully]');
                  }
                });
                // let greetingMessage = [{
                //     type: "text",
                //     text: `Hello  ${profile.displayName} \n\nWelcome to Botty Chat Bot :)\n\nStatus: ${profile.statusMessage || '-'}`
                //   },
                //   {
                //     type: "image",
                //     originalContentUrl: profile.pictureUrl,
                //     previewImageUrl: profile.pictureUrl,
                //   }
                // ]
                // pushMessage(events.source.userId, greetingMessage)
                //   .then((res) => {
                //     console.log('==> [Push Greeting message successfully]');
                //   })
                //   .catch((e) => {
                //     console.log('==> [Error]: ');
                //     console.log(e);
                //   });
              }
            })
            .catch(function (error) {
              console.log('[Get Profile]: Error');
              console.log(error);
              reject(error);
            });
        }
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
  console.log('==> [pushMessage]: [userId]: ' + userId);
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