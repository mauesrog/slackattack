import Yelp from 'yelp';

console.log('hi');

const yesRegEx = /.*(^|\s)(yes|yeah|y)(?![a-zA-Z])/i;
const noRegEx = /.*(^|\s)(no|n|nah)(?![a-zA-Z])/i;
const noneRegEx = /.*(^|\s)(none|cancel)(?![a-zA-Z])/i;

// set-up yelp
const yelpAPIData = JSON.parse(process.env.YELP_API_DATA);
const yelp = new Yelp({
  consumer_key: yelpAPIData.key,
  consumer_secret: yelpAPIData.secret,
  token: yelpAPIData.token,
  token_secret: yelpAPIData.tokenSecret,
});

/*
 * ES6 CLASS
 * The class that provides the questions info
 */
class QuestionUtilities {

  /*
   * Checks whether the user's nickname is already stored in the mongoDB and
   * adds a new one if it's not there
   * @param data - JSON with conversation, message, and parameters keys
   */
  checkName(data) {
    try {
      return new Promise((resolve, reject) => {
        try {
          data.convo.ask('Hi there! I don\' know you yet... How would you like me to call you?', (response, convo) => {
            try {
              data.params.controller.storage.users.save({ id: data.message.user, preferredName: response.text }, (error) => {
                try {
                  if (error) {
                    reject(error);
                  } else {
                    convo.next();
                    resolve({ convo, output: `Okay, great ${response.text}!` });
                  }
                } catch (err) {
                  reject(err);
                }
              });
            } catch (err) {
              reject(err);
            }
          });
          data.convo.next();
        } catch (err) {
          reject(err);
        }
      });
    } catch (err) {
      throw err;
    }
  }

  /*
   * Changes the user's nickname in the mongoDB to a new value
   * @param data - JSON with conversation, message, and parameters keys
   */
  changeNamePrompt(data) {
    try {
      return new Promise((resolve, reject) => {
        try {
          data.convo.ask('Would you like to change your nickname?', (response, convo) => {
            try {
              if (yesRegEx.test(response.text)) {
                convo.ask('Please type your new nickname by itself.', (response2, convo2) => {
                  try {
                    data.params.controller.storage.users.save({ id: data.message.user, preferredName: response2.text }, (error) => {
                      try {
                        if (error) {
                          reject(error);
                        } else {
                          resolve({ convo, output: 'Nickame changed.' });
                        }
                      } catch (err) {
                        reject(err);
                      }
                    });
                  } catch (err) {
                    reject(err);
                  }
                });
                convo.next();
              } else {
                resolve({ convo, output: 'Nickname unchanged.' });
              }
            } catch (err) {
              reject(err);
            }
          });
          data.convo.next();
        } catch (err) {
          reject(err);
        }
      });
    } catch (err) {
      throw err;
    }
  }

  /*
   * Creates a slackbot conversation with Promise features
   * @param bot - The bot's instance
   * @param message - The current message
   * @param data - JSON with action and parameters keys
   */
  startConversationPromise(bot, message, data) {
    try {
      return new Promise((resolve, reject) => {
        try {
          bot.startConversation(message, (error, convo) => {
            try {
              if (error) {
                reject(error);
              } else {
                if (data) {
                  data.action({ params: data.params, convo, message })
                  .then(response => {
                    try {
                      resolve(response);
                    } catch (err) {
                      reject(err);
                    }
                  })
                  .catch(err => {
                    console.error(err);
                  });
                } else {
                  resolve({ convo });
                }
                convo.next();
              }
            } catch (err) {
              reject(err);
            }
          });
        } catch (err) {
          reject(err);
        }
      });
    } catch (err) {
      throw err;
    }
  }

  /*
   * Goes back to the main conversation
   * @param response - The current respone
   * @param convo - The current conversation
   */
  cancelConversation(response, convo) {
    try {
      convo.say('Okay, I\'ll scratch that!');
      convo.next();
    } catch (err) {
      console.error(err);
    }
  }

  /*
   * Asks for the prefered food type
   * @param response - The current respone
   * @param convo - The current conversation
   * @param botData - JSON with the bot
   */
  askForFoodType(response, convo, botData) {
    try {
      convo.ask('What kind of food would you like?', (response1, convo1) => {
        try {
          if (!noneRegEx.test(response1.text)) {
            this.verifyFoodType({ text: response1.text.replace(' food', '') }, convo1, botData);
          } else {
            this.cancelConversation(response1, convo1);
          }
          convo.next();
        } catch (err) {
          console.error(err);
        }
      });
    } catch (err) {
      console.error(err);
    }
  }

  /*
   * Asks for the prefered location
   * @param response1 - The current respone
   * @param convo1 - The current conversation
   * @param foodType - The prefered type of food
   */
  askForLocation(response1, convo1, foodType, callback) {
    try {
      return new Promise((resolve, reject) => {
        try {
          convo1.ask('Where are you?', (response, convo) => {
            try {
              if (foodType) {
                yelp.search({ term: `${foodType} food`, sort: 2, radius_filter: 5000, location: response.text })
                .then((data) => {
                  if (data.businesses.length) {
                    resolve({ convo, data, output: `Sure! Pulling up '${foodType}' food places.` });
                  } else {
                    reject({ convo, output: `No places in ${response.text} have '${foodType}' food` });
                  }
                  convo.next();
                })
                .catch((error) => {
                  convo.say('Please enter a valid location!');
                  convo.repeat();
                  convo.next();
                });
              }
            } catch (err) {
              reject(err);
            }
          });
        } catch (err) {
          reject(err);
        }
      });
    } catch (err) {
      throw err;
    }
  }

  /*
   * Asks for the prefered location
   * @param response1 - The current respone
   * @param convo1 - The current conversation
   * @param botData - JSON with the bot
   */
  verifyFoodType(response1, convo1, botData) {
    try {
      const foodType = response1.text;

      convo1.ask(`Are you looking for '${foodType}' food?`, (response, convo) => {
        try {
          if (yesRegEx.test(response.text)) {
            this.askForLocation(response, convo, foodType)
            .then(success => {
              try {
                const allRestaurants = { attachments: [] };

                success.convo.say(success.output);
                success.data.businesses.forEach((restaurant, i, array) => {
                  const restaurantEntry = {
                    fallback: restaurant.name,
                    title: restaurant.name,
                    fields: [
                      {
                        title: 'Phone number',
                        value: restaurant.display_phone,
                        short: true,
                      },
                    ],
                    title_link: restaurant.url,
                    text: restaurant.snippet_text,
                    image_url: restaurant.image_url,
                    color: '#7CD197',
                  };

                  allRestaurants.attachments.push(restaurantEntry);
                });

                botData.bot.reply(botData.message, allRestaurants);
              } catch (err) {
                console.error(err);
              }
            })
            .catch(error => {
              if (error.output) {
                error.convo.say(error.output);
                this.askForFoodType(response, error.convo, botData);
                error.convo.next();
              } else {
                console.error(error);
              }
            });
          } else if (noRegEx.test(response.text)) {
            this.askForFoodType(response, convo, botData);
          } else {
            convo.say('Only \'yes\' or \'no\' answers allowed');
            convo.repeat();
          }
          convo.next();
        } catch (err) {
          console.error(err);
        }
      });
    } catch (err) {
      console.error(err);
    }
  }
}

export default QuestionUtilities;
