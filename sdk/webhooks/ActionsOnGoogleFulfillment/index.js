/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const { conversation, Canvas } = require("@assistant/conversation");
const functions = require("firebase-functions");
const translation = require("./translation");
const search = require("./news");
const imageAnalysis = require("./image_analysis");
const config = require("./config");
const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
const admin = require("firebase-admin");
const { firestore } = require("firebase-admin");
admin.initializeApp();
const auth = admin.auth();
const db = admin.firestore();
db.settings({ timestampsInSnapshots: true });
const dbs = {
    user: db.collection("user"),
};

const INSTRUCTIONS =
    "Hello user, you can open a new level or change questions.";

// The Client Id of the Actions Project (set it in the env file).
const CLIENT_ID = config.keys.clientID;

const app = conversation({ debug: true, clientId: CLIENT_ID });

// This handler is called after the user has successfully linked their account.
// Saves the user name in a session param to use it in dialogs, and inits the
// Firestore db to store orders for the user.
app.handle("create_user", async (conv) => {
    const payload = conv.user.params.tokenPayload;
    // write user name in session to use in dialogs
    conv.user.params.name = payload.given_name;
    const email = payload.email;
    if (email) {
        try {
            conv.user.params.uid = (await auth.getUserByEmail(email)).uid;
        } catch (e) {
            if (e.code !== "auth/user-not-found") {
                throw e;
            }
            // If the user is not found, create a new Firebase auth user
            // using the email obtained from the Google Assistant
            conv.user.params.uid = (await auth.createUser({ email })).uid;
        }
    }
});

// Used to reset the slot for account linking status to allow the user to try
// again if a system or network error occurred.
app.handle("system_error", async (conv) => {
    conv.session.params.AccountLinkingSlot = "";
});

/**
 * Sets the Canvas for a webhook
 * @param {*} conv brings the actions SDK to the webapp
 * @param {*} convText is said to the user
 * @param {*} command updates the UI in action.js
 * @param {*} value that the UI should be updated to
 */
function langSetCanvas(conv, convText, command, value) {
    conv.add(
        new Canvas({
            data: {
                command: command,
                value: value,
            },
        })
    );
    if (String(convText).length > 0) conv.add(convText);
}

/**
 * Stores the translated word to firebase
 * @param {*} userID of the user
 * @param {*} englishWord to store
 * @param {*} spanishWord to store
 */
function storeTranslatedWordsToFirebase(userID, englishWord, spanishWord) {
    const firestoreUser = admin.firestore().doc(`AOGUsers/${userID}`);
    firestoreUser.set(
        {
            TranslatedWords: admin.firestore.FieldValue.arrayUnion({
                english: englishWord,
                spanish: spanishWord,
            }),
        },
        { merge: true }
    );
}

/**
 * Welcomes the user to the language section of the app.
 */
app.handle("lang_welcome", (conv) => {
    if (!conv.device.capabilities.includes("INTERACTIVE_CANVAS")) {
        conv.add("Sorry, this device does not support Interactive Canvas!");
        conv.scene.next.name = "actions.page.END_CONVERSATION";
        return;
    }
    conv.add(
        `Hi, ${conv.user.params.tokenPayload.given_name} Welcome to the AOG Education language section. Please choose a game from the menu below.`
    );
    conv.add(
        new Canvas({
            url: `https://gaurnett-aog-game-e3c26.web.app`,
        })
    );
});

/**
 * Fallback handler for when an input is not matched
 */
app.handle("lang_fallback", (conv) => {
    conv.add(
        `I don't understand. You can open a new level or change questions.`
    );
    conv.add(new Canvas());
});

/**
 * Handler to start the language one pic one word section
 */
app.handle("lang_start_one_pic", (conv) => {
    if (
        conv.session.params.startedOnePic == undefined ||
        conv.session.params.startedOnePic == false
    ) {
        conv.add(`Ok, starting one pic one word`);
        conv.add(
            `To play this game, please guess the english word shown by the picture.`
        );
        conv.session.params.startedOnePic = true;
    }

    return imageAnalysis
        .imageAnalysis(true)
        .then((value) => {
            value.attempts = 10;
            conv.session.params.onePicHints = [];
            conv.session.params.onePicAnswer = value.word;
            conv.session.params.onePicAnswerTranslated = value.wordTranslated;
            conv.session.params.onePicAttemptsLeft = value.attempts;
            langSetCanvas(conv, "", "LANG_START_ONE_PIC", value);
        })
        .catch((error) => {
            console.log(error);
        });
});

/**
 * Handler to start the language one pic multiple words section
 */
app.handle("lang_start_multiple_words", (conv) => {
    conv.session.params.englishWordsGuessed = 0;
    conv.session.params.spanishWordsGuessed = 0;
    if (
        conv.session.params.startedMultipleWords == undefined ||
        conv.session.params.startedMultipleWords == false
    ) {
        conv.add(`Ok, starting one pic multiple word`);
        conv.add(
            `To play this game, please guess several english words shown by the picture.`
        );
        conv.session.params.startedMultipleWords = true;
    }

    return imageAnalysis
        .imageAnalysis(false)
        .then((value) => {
            value.attempts = 10;
            conv.session.params.multipleWordsHints = [];
            conv.session.params.multipleWordsAnswer = value.words;
            conv.session.params.multipleWordsAnswerTranslated =
                value.wordsTranslated;
            conv.session.params.multipleWordsAttemptsLeft = value.attempts;
            langSetCanvas(conv, "", "LANG_START_MULTIPLE_WORDS", value);
        })
        .catch((error) => {
            console.log(error);
        });
});

/**
 * Handler to manage the word the user guesses
 */
app.handle("lang_one_pic_answer", async (conv) => {
    const word = conv.intent.params.lang_words
        ? conv.intent.params.lang_words.resolved
        : null;

    conv.add(`Ok, let's see if ${word} is correct`);

    const userAnswer = String(word);
    const correctAnswer = String(conv.session.params.onePicAnswer);

    if (userAnswer.toLowerCase() == correctAnswer) {
        const convText = `That is correct! Try translating it to spanish`;
        const value = {
            word: correctAnswer,
            spanish: conv.session.params.onePicAnswerTranslated,
        };
        langSetCanvas(conv, convText, "LANG_ONE_PIC_SHOW_ENGLISH", value);
        conv.scene.next.name = "lang_one_pic_translation";
    } else {
        conv.session.params.onePicAttemptsLeft--;

        const attempts = conv.session.params.onePicAttemptsLeft;

        if (attempts == 0) {
            const convText = `You have ran out of attempts. The correct answers are shown below.`;
            const value = {
                english: conv.session.params.onePicAnswer,
                spanish: conv.session.params.onePicAnswerTranslated,
            };
            langSetCanvas(conv, convText, "LANG_ONE_PIC_SHOW_ANSWER", value);
        } else if (attempts % 2 == 0) {
            const hints = conv.session.params.onePicHints;

            var randomIndex = Math.floor(Math.random() * correctAnswer.length);
            while(hints.includes(randomIndex) || correctAnswer.charAt(randomIndex) == " ") {
                randomIndex = Math.floor(Math.random() * correctAnswer.length);
            }
            conv.session.params.onePicHints.push(randomIndex);

            if (conv.session.params.onePicHints.length == correctAnswer.length) {
                const convText = `You have ran out of hints. The correct english word is ${correctAnswer}. Try translating it to spanish`;
                const value = {
                    word: correctAnswer,
                    spanish: conv.session.params.onePicAnswerTranslated,
                    attempts: attempts
                };
                langSetCanvas(conv, convText, "LANG_ONE_PIC_SHOW_ENGLISH", value);
                conv.scene.next.name = "lang_one_pic_translation";
                return
            }

            var hint = `${correctAnswer} : `;
            for (var i = 0; i < correctAnswer.length; i++) {
                if (correctAnswer.charAt(i) == " ") {
                    hint += "&nbsp&nbsp&nbsp&nbsp";
                } else if (conv.session.params.onePicHints.includes(i)) {
                    hint += `${correctAnswer.charAt(i)} `
                } else {
                    hint += "_ ";
                }
            }

            const convText = `That is incorrect! You can try again but here's a hint.`;
            const value = {
                word: hint,
                scene: conv.scene.name,
                attempts: attempts
            }
            langSetCanvas(
                conv,
                convText,
                "LANG_ONE_PIC_SHOW_HINT",
                value
            );
        } else {
            const convText = `That is incorrect! Try again.`;
            langSetCanvas(
                conv,
                convText,
                "LANG_ONE_PIC_UPDATE_ATTEMPTS",
                attempts
            );
        }
    }
});

/**
 * Handler to manage the word the user guesses
 */
app.handle("lang_multiple_words_answer", async (conv) => {
    const word = conv.intent.params.lang_words
        ? conv.intent.params.lang_words.resolved
        : null;

    conv.add(`Ok, let's see if ${word} is correct`);

    const userAnswer = String(word);
    const correctAnswers = Array.from(conv.session.params.multipleWordsAnswer);

    const wordIndex = correctAnswers.indexOf(userAnswer);

    if (wordIndex > -1) {
        conv.session.params.englishWordsGuessed++;
        if (conv.session.params.englishWordsGuessed == correctAnswers.length) {
            conv.add("Sweet! Try translating these words to spanish");
            conv.session.params.multipleWordsHints = [];
            conv.scene.next.name = "lang_multiple_words_translation";
        } else {
            conv.add(`That is a correct word`);
        }
        let value = {
            word: correctAnswers[wordIndex],
            index: wordIndex,
            showSpanish:
                conv.session.params.englishWordsGuessed ==
                correctAnswers.length,
            spanishWords: conv.session.params.multipleWordsAnswerTranslated,
        };
        langSetCanvas(conv, "", "LANG_MULTIPLE_WORDS_SHOW_ENGLISH", value);
    } else {
        conv.session.params.multipleWordsAttemptsLeft--;
        const attempts = conv.session.params.multipleWordsAttemptsLeft;

        if (attempts == 0) {
            const convText = `You have ran out of attempts. The correct answers are shown below.`;
            const value = {
                english: conv.session.params.multipleWordsAnswer,
                spanish: conv.session.params.multipleWordsAnswerTranslated,
            };
            langSetCanvas(
                conv,
                convText,
                "LANG_MULTIPLE_WORDS_SHOW_ANSWER",
                value
            );
        } else if (attempts % 2 == 0) {
            conv.session.params.englishWordsGuessed++;
            const hints = conv.session.params.multipleWordsHints;

            var randomIndex = Math.floor(Math.random() * 3);
            while(hints.includes(randomIndex)) {
                randomIndex = Math.floor(Math.random() * 3);
            }
            conv.session.params.multipleWordsHints.push(randomIndex);

            var convText = ""
            if (conv.session.params.multipleWordsHints.length == 3) {
                convText = `You have ran out of english hints. The correct english words are shown below. Try translating them to spanish`;
                conv.session.params.multipleWordsHints = [];
                conv.scene.next.name = "lang_multiple_words_translation";
            } else {
                convText = `That is incorrect! You can try again but here's a hint.`;
            }

            let value = {
                word: correctAnswers[randomIndex],
                index: randomIndex,
                showSpanish: conv.session.params.multipleWordsHints.length == 3,
                spanishWords: conv.session.params.multipleWordsAnswerTranslated,
            };
            langSetCanvas(conv, convText, "LANG_MULTIPLE_WORDS_SHOW_ENGLISH", value);
        } else {
            const convText = `That is incorrect! Try again.`;
            langSetCanvas(
                conv,
                convText,
                "LANG_MULTIPLE_WORDS_UPDATE_ATTEMPTS",
                attempts
            );
        }
    }
});

/**
 * Handler to manage to spanish input from the user
 */
app.handle("lang_one_pic_answer_translation", (conv) => {
    const word = conv.intent.params.lang_words
        ? conv.intent.params.lang_words.resolved
        : null;

    conv.add(`Ok, let's see if ${word} is correct`);

    const userAnswer = String(word);
    const userID = conv.user.params.uid;
    const englishAnswer = conv.session.params.onePicAnswer;

    const correctAnswer = conv.session.params.onePicAnswerTranslated;
    if (userAnswer.toLowerCase() == correctAnswer) {
        const convText = `That is correct! You can say "Next Question" to see something else or "Questions" to go back to the main menu.`;
        langSetCanvas(
            conv,
            convText,
            "LANG_ONE_PIC_SHOW_SPANISH",
            correctAnswer
        );
        storeTranslatedWordsToFirebase(userID, englishAnswer, correctAnswer);
    } else {
        conv.session.params.onePicAttemptsLeft--;

        const attempts = conv.session.params.onePicAttemptsLeft;

        if (attempts == 0) {
            const convText = `You have ran out of attempts. The correct answers are shown below.`;
            const value = {
                english: conv.session.params.onePicAnswer,
                spanish: conv.session.params.onePicAnswerTranslated,
            };
            langSetCanvas(conv, convText, "LANG_ONE_PIC_SHOW_ANSWER", value);
        } else if (attempts % 2 == 0) {
            const hints = conv.session.params.onePicHints;

            var randomIndex = Math.floor(Math.random() * correctAnswer.length);
            while(hints.includes(randomIndex) || correctAnswer.charAt(randomIndex) == " ") {
                randomIndex = Math.floor(Math.random() * correctAnswer.length);
            }
            conv.session.params.onePicHints.push(randomIndex);

            if (conv.session.params.onePicHints.length == correctAnswer.length) {
                const convText = `You have ran out of hints. The correct spanish word is ${correctAnswer}. Try translating it to spanish`;
                const value = {
                    word: correctAnswer,
                    attempts: attempts
                };
                langSetCanvas(
                    conv,
                    convText,
                    "LANG_ONE_PIC_SHOW_SPANISH",
                    value
                );
                return
            }

            var hint = `${correctAnswer} : `;
            for (var i = 0; i < correctAnswer.length; i++) {
                if (correctAnswer.charAt(i) == " ") {
                    hint += "&nbsp&nbsp&nbsp&nbsp";
                } else if (conv.session.params.onePicHints.includes(i)) {
                    hint += `${correctAnswer.charAt(i)} `
                } else {
                    hint += "_ ";
                }
            }

            const convText = `That is incorrect! You can try again but here's a hint.`;
            const value = {
                word: hint,
                scene: conv.scene.name,
                attempts: attempts
            }
            langSetCanvas(
                conv,
                convText,
                "LANG_ONE_PIC_SHOW_HINT",
                value
            );
        } else {
            const convText = `That is incorrect! Try again.`;
            langSetCanvas(
                conv,
                convText,
                "LANG_ONE_PIC_UPDATE_ATTEMPTS",
                attempts
            );
        }
    }
});

/**
 * Handler to manage to spanish input from the user
 */
app.handle("lang_multiple_words_answer_translation", (conv) => {
    const word = conv.intent.params.lang_words
        ? conv.intent.params.lang_words.resolved
        : null;

    conv.add(`Ok, let's see if ${word} is correct`);

    const userAnswer = String(word);
    const userID = conv.user.params.uid;

    const spanishAnswers = Array.from(
        conv.session.params.multipleWordsAnswerTranslated
    );
    const englishAnswers = Array.from(conv.session.params.multipleWordsAnswer);
    const wordIndex = spanishAnswers.indexOf(userAnswer);

    if (wordIndex > -1) {
        conv.session.params.spanishWordsGuessed++;
        if (conv.session.params.spanishWordsGuessed == spanishAnswers.length) {
            conv.add(
                `You've got them all! You can say "Next Question" to see something else or "Questions" to go back to the main menu.`
            );
        } else {
            conv.add(`That is a correct word`);
        }

        const value = {
            word: spanishAnswers[wordIndex],
            index: wordIndex,
        };
        langSetCanvas(conv, "", "LANG_MULTIPLE_WORDS_SHOW_SPANISH", value);
        storeTranslatedWordsToFirebase(
            userID,
            englishAnswers[wordIndex],
            spanishAnswers[wordIndex]
        );
    } else {
        conv.session.params.multipleWordsAttemptsLeft--;
        const attempts = conv.session.params.multipleWordsAttemptsLeft;

        if (attempts == 0) {
            const convText = `You have ran out of attempts. The correct answers are shown below.`;
            const value = {
                english: conv.session.params.multipleWordsAnswer,
                spanish: conv.session.params.multipleWordsAnswerTranslated,
            };
            langSetCanvas(
                conv,
                convText,
                "LANG_MULTIPLE_WORDS_SHOW_ANSWER",
                value
            );
        } else if (attempts % 2 == 0) {
            conv.session.params.spanishWordsGuessed++;
            const hints = conv.session.params.multipleWordsHints;

            var randomIndex = Math.floor(Math.random() * 3);
            while(hints.includes(randomIndex)) {
                randomIndex = Math.floor(Math.random() * 3);
            }
            conv.session.params.multipleWordsHints.push(randomIndex);

            var convText = ""
            if (conv.session.params.multipleWordsHints.length == 3) {
                convText = `You have ran out of spanish hints. The correct spanish words are shown below.`;
            } else {
                convText = `That is incorrect! You can try again but here's a hint.`;
            }

            const value = {
                word: spanishAnswers[randomIndex],
                index: randomIndex,
            };
            langSetCanvas(conv, convText, "LANG_MULTIPLE_WORDS_SHOW_SPANISH", value);
        } else {
            const convText = `That is incorrect! Try again.`;
            langSetCanvas(
                conv,
                convText,
                "LANG_MULTIPLE_WORDS_UPDATE_ATTEMPTS",
                attempts
            );
        }
    }
});

/**
 * Conversation Section
 */

const salutationsIndex = {
    HOW_ARE_YOU: 0,
    WHERE_ARE_YOU_FROM: 1,
    CAREER: 2,
    COUNTRIES_VISITED: 3,
    NUM_OF_PEOPLE_LIVED_WITH: 4,
    FAVORITE_FOOD: 5,
    HOBBIES: 6,
    SCHOOL_ATTENDED: 7,
};

const salutations = {
    HOW_ARE_YOU: {
        english: "How are you",
        spanish: "Estoy",
        example: "Estoy muy bien",
    },
    WHERE_ARE_YOU_FROM: {
        english: "Where are you from",
        spanish: "Soy de",
        example: "Soy de Jamaica",
    },
    CAREER: {
        english: "What do you want to be in the future",
        spanish: "Quiero ser",
        example: "Quiero ser mecanico",
    },
    COUNTRIES_VISITED: {
        english: "Which countries have you visited",
        spanish: "He estado en",
        example: "He estado en estados unidos, canadá y mexico",
    },
    NUM_OF_PEOPLE_LIVED_WITH: {
        english: "How many people do you live with",
        spanish: "Vivo con",
        example: "Vivo con cinco personas",
    },
    FAVORITE_FOOD: {
        english: "What is your favorite food",
        spanish: "Mi comida favorita",
        example: "Mi comida favorita son los plátanos",
    },
    HOBBIES: {
        english: "What are your hobbies",
        spanish: "Mis pasatiempos son",
        example: "Mis pasatiempos son jugar futbol y videojuegos",
    },
    SCHOOL_ATTENDED: {
        english: "Which school do you attend",
        spanish: "Asisto a",
        example: "Asisto a Williams College",
    },
};

/**
 * Handler to welcome the user to the conversation section
 */
app.handle("lang_conversation_welcome", (conv) => {
    let date = new Date();
    var greeting;
    if (date.getHours() < 12) {
        greeting = `Buenos días`;
    } else if (date.getHours() >= 12 && date.getHours() < 17) {
        greeting = `Buenas tardes`;
    } else {
        greeting = `Buena noches`;
    }

    let message = `${greeting} ${conv.user.params.tokenPayload.given_name}, cómo estas.`;
    const value = {
        sender: true,
        text: message,
    };
    conv.session.params.salutation = salutations.HOW_ARE_YOU;
    conv.session.params.salutationsIndex = salutationsIndex.HOW_ARE_YOU;
    langSetCanvas(conv, message, "LANG_START_CONVERSATION", value);
});

/**
 * Handler to manage the responses by the user during the conversation
 */
app.handle("lang_conversation_response", (conv) => {
    const word = conv.intent.params.lang_words
        ? conv.intent.params.lang_words.resolved
        : null;

    const salutation = conv.session.params.salutationsIndex;
    if (salutation == salutationsIndex.HOW_ARE_YOU) {
        howAreYou(conv, word);
    } else {
        
    }
});

const GOOD_WELCOME = ["estupendo", "muy bien", "así así"];
const BAD_WELCOME = ["mal", "fatal", "exhausto"];
function howAreYou(conv, word) {
    var senderMessage;
    if (GOOD_WELCOME.includes(word)) {
        senderMessage = `Estoy feliz de escuchar eso. De dónde eres?`;
    } else if (BAD_WELCOME.includes(word)) {
        senderMessage = `Siento oír eso. De dónde eres?`;
    } else {
        senderMessage = `Vale, se dónde eres?`;
    }
    conv.session.params.salutation = salutations.WHERE_ARE_YOU_FROM;
    conv.session.params.salutationsIndex = salutationsIndex.WHERE_ARE_YOU_FROM;
    const value = {
        senderMessage: senderMessage,
        receiverMessage: conv.intent.query,
        receiverImage: conv.user.params.tokenPayload.picture,
    };
    langSetCanvas(conv, senderMessage, "LANG_ADD_CONVERSATION_MESSAGE", value);
}

/**
 * Handler to translate the word that the user requested
 */
app.handle("lang_conversation_translate", (conv) => {
    const translationRequest = conv.intent.params.lang_words
        ? conv.intent.params.lang_words.resolved
        : null;

    return translation
        .translateFunction(translationRequest)
        .then((translatedText) => {
            const senderMessage = "The translation is: " + translatedText;
            const value = {
                senderMessage: senderMessage,
                receiverMessage: conv.intent.query,
                receiverImage: conv.user.params.tokenPayload.picture,
            };
            langSetCanvas(
                conv,
                senderMessage,
                "LANG_ADD_CONVERSATION_MESSAGE",
                value
            );
        })
        .catch((error) => console.log(error));
})

/**
 * Handler to search up the results that the user requested
 */
app.handle("lang_conversation_search", (conv) => {
    const query = conv.intent.params.lang_words
        ? conv.intent.params.lang_words.resolved
        : null;

    return search
        .searchFunction(query)
        .then((results) => {
            var senderMessage =
                "Here is a result of your searches. Please select a article number below to learn more about it.";
            const value = {
                senderMessage: senderMessage,
                receiverMessage: conv.intent.query,
                receiverImage: conv.user.params.tokenPayload.picture,
                results: results,
            };
            conv.session.params.search_results = results;
            langSetCanvas(
                conv,
                senderMessage,
                "LANG_ADD_CONVERSATION_SEARCH_MESSAGE",
                value
            );
        })
        .catch((error) => console.log(error));
});

/**
 * Handler to read the article number requested by the user
 */
app.handle("lang_conversation_article", (conv) => {
    const articleNumber = conv.intent.params.article_number
        ? conv.intent.params.article_number.resolved
        : null;

    var senderMessage = `Okay opening article ${articleNumber}`;
    const results = conv.session.params.search_results;
    const article = results[articleNumber - 1];
    var words = article.description.split(".");
    senderMessage += ". " + words[0];
    conv.session.params.search_results_description = words[0];

    const value = {
        senderMessage: senderMessage,
        receiverMessage: conv.intent.query,
        receiverImage: conv.user.params.tokenPayload.picture,
    };
    langSetCanvas(conv, senderMessage, "LANG_ADD_CONVERSATION_MESSAGE", value);
});

/**
 * Handler to translate the article number requested by the user
 */
app.handle("lang_conversation_article_translate", (conv) => {
    const description = conv.session.params.search_results_description;
    return translation
        .translateFunction(conv.session.params.search_results_description)
        .then((translatedText) => {
            const senderMessage = "The translated text is: " + translatedText;
            const value = {
                senderMessage: senderMessage,
                receiverMessage: conv.intent.query,
                receiverImage: conv.user.params.tokenPayload.picture,
            };
            langSetCanvas(
                conv,
                senderMessage,
                "LANG_ADD_CONVERSATION_MESSAGE",
                value
            );
        })
        .catch((error) => console.log(error));
});

/**
 * Translate the current message shown to the user
 */
app.handle("lang_conversation_help", (conv) => {
    const salutation = conv.session.params.salutation;
    senderMessage = `This translation is ${salutation.english}. You typically start with ${salutation.spanish} followed by your answer. For example, ${salutation.example}`;
    const value = {
        senderMessage: senderMessage,
        receiverMessage: conv.intent.query,
        receiverImage: conv.user.params.tokenPayload.picture,
    };
    langSetCanvas(conv, senderMessage, "LANG_ADD_CONVERSATION_MESSAGE", value);
});

/**
 * Handler to start the next question
 */
app.handle("lang_next_question", (conv) => {
    conv.add(`Ok, starting next question`);
    if (
        conv.scene.name == "lang_one_pic" ||
        conv.scene.name == "lang_one_pic_translation"
    ) {
        conv.scene.next.name = "lang_one_pic";
    } else if (
        conv.scene.name == "lang_multiple_words" ||
        conv.scene.name == "lang_multiple_words_translation"
    ) {
        conv.scene.next.name = "lang_multiple_words";
    }
});

/**
 * Starts the vocab section of the app
 */
app.handle("lang_start_vocab", (conv) => {
    const userID = conv.user.params.uid;
    const firestoreUser = admin.firestore().doc(`AOGUsers/${userID}`);
    return firestoreUser.get().then((value) => {
        const words = value.data()["TranslatedWords"];
        langSetCanvas(
            conv,
            "Okay, fetching translated word",
            "LANG_VOCAB",
            words
        );
    });
});

/**
 * Handler to return to the main menu
 */
app.handle("lang_change_game", (conv) => {
    conv.add(`Ok, returning to the main menu.`);

    if (
        conv.scene.name == "lang_one_pic" ||
        conv.scene.name == "lang_one_pic_translation"
    ) {
        conv.session.params.startedOnePic = false;
    } else if (
        conv.scene.name == "lang_multiple_words" ||
        conv.scene.name == "lang_multiple_words_translation"
    ) {
        conv.session.params.startedMultipleWords = false;
    }

    langSetCanvas(conv, "", "LANG_MENU", conv.scene.name);
});

app.handle("lang_instructions", (conv) => {
    conv.add(INSTRUCTIONS);
    conv.add(new Canvas());
});

exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);
