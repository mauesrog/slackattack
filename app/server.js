import botkit from 'botkit';
import mongoStorage from 'botkit-storage-mongo';
import QuestionUtilities from './questions.js';

console.log('hi');
try {
  // database
  const mongoDb = mongoStorage({ mongoUri: 'mongodb://heroku_189v5850:i7bpl7vb0a3ru5cla058oppqc3@ds045454.mlab.com:45454/heroku_189v5850' });

  // the question utilities class I made
  const utils = new QuestionUtilities();

  // regEx to find the word food(s) or restaurant(s) by itself
  const food = /.*(^|\s)(foods?|restaurants?)(?![a-zA-Z])/i;

  const randomAnswers = ['What are you even talking about...', 'I just don\'t get you.', 'That makes no sense to me.'];

  // botkit controller
  const controller = botkit.slackbot({
    storage: mongoDb,
    debug: false,
  });


  // initialize slackbot
  const slackbot = controller.spawn({
    token: process.env.MAUI_BOT_TOKEN,
    // this grabs the slack token we exported earlier
  }).startRTM(err => {
    // start the real time message client
    if (err) { throw new Error(err); }
  });

  // greets the user with his or her prefered nickname and if none is set, asks for one
  controller.hears('.*(^|\\s)(hello|hi|howdy)(?![a-zA-Z])', ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
    try {
      controller.storage.users.get(message.user, (error, data) => {
        try {
          if (error) {
            console.error(error);
          } else {
            if (data) {
              bot.reply(message, `Welcome back, ${data.preferredName}!`);
            } else {
              utils.startConversationPromise(bot, message, { action: utils.checkName, params: { controller } })
              .then(nameConfirmation => {
                nameConfirmation.convo.say(nameConfirmation.output);
                nameConfirmation.convo.next();
              })
              .catch(err => {
                console.error(err);
              });
            }
          }
        } catch (err) {
          console.error(err);
        }
      });
    } catch (err) {
      console.error(err);
    }
  });

  // registers food related commands and loops around conversation until the place is found or the user cancels
  controller.hears('.*(^|\\s)(foods?|eat|hungry|starving|restaurants?)(?![a-zA-Z])', ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
    try {
      bot.startConversation(message, (error, convo) => {
        if (error) {
          console.error(error);
        } else {
          const botData = { bot, message };

          if (food.test(message.text) && message.text.match(/((.*) food|(.*) restaurants?)/) && (message.text.match(/((.*) food|(.*) restaurants?)/)[2] || message.text.match(/((.*) food|(.*) restaurants?)/)[3])) {
            const regExArray = message.text.match(/((.*) food|(.*) restaurants?)/);
            const allWords = regExArray[2] ? regExArray[2].split(' ') : regExArray[3].split(' ');
            const typeOfFood = allWords[allWords.length - 1];

            utils.verifyFoodType({ text: typeOfFood }, convo, botData);
          } else {
            utils.askForFoodType(null, convo, botData);
          }
          convo.next();
        }
      });
    } catch (err) {
      console.error(err);
    }
  });

  // interaction for when the user wishes to change his or her username
  controller.hears('.*(^|\\s)(change .*name)(?![a-zA-Z])', ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
    try {
      utils.startConversationPromise(bot, message, { action: utils.changeNamePrompt, params: { controller } })
      .then(data => {
        data.convo.say(data.output);
        data.convo.next();
      })
      .catch(error => {
        console.error(error);
      });
    } catch (err) {
      console.error(err);
    }
  });

  // whenever none of the other commands are recongnized, simply says one of a few phrases
  controller.on('direct_message', (bot, message) => {
    try {
      const answerIndex = Math.floor(Math.random() * 2) + 0;

      bot.reply(message, randomAnswers[answerIndex]);
    } catch (err) {
      console.error(err);
    }
  });

  // handles outgoing webhooks
  controller.on('outgoing_webhook', (bot, message) => {
    try {
      console.log('hello');
      bot.replyPublic(message, ' awake!');
    } catch (err) {
      console.error(err);
    }
  });

  controller.setupWebserver(process.env.PORT || 3001, (err, webserver) => {
    controller.createWebhookEndpoints(webserver, slackbot, () => {
      if (err) { throw new Error(err); }
    });
  });
} catch (err) {
  console.error(err);
}
