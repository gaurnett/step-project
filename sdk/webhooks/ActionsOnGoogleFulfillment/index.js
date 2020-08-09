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
    if (String(convText).length > 0) conv.add(convText);

    conv.add(
        new Canvas({
            data: {
                command: command,
                value: value,
            },
        })
    );
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
            value.attempts = 5;
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
            value.attempts = 5;
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
app.handle("lang_word", async (conv) => {
    const word = conv.intent.params.word
        ? conv.intent.params.word.resolved
        : null;

    conv.add(`Ok, let's see if ${word} is correct`);

    const userAnswer = String(word);
    if (conv.scene.name == "lang_one_pic") {
        const correctAnswer = conv.session.params.onePicAnswer;

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

            if (conv.session.params.onePicAttemptsLeft == 0) {
                const convText = `You have ran out of attempts. The correct answers are shown below.`;
                const value = {
                    english: conv.session.params.onePicAnswer,
                    spanish: conv.session.params.onePicAnswerTranslated
                }
                langSetCanvas(
                    conv,
                    convText,
                    "LANG_ONE_PIC_SHOW_ANSWER",
                    value
                );
            } else {
                const convText = `That is incorrect! Try again.`;
                langSetCanvas(
                    conv,
                    convText,
                    "LANG_ONE_PIC_UPDATE_ATTEMPTS",
                    conv.session.params.onePicAttemptsLeft
                );
            }
        }
    } else if (conv.scene.name == "lang_multiple_words") {
        const correctAnswers = Array.from(
            conv.session.params.multipleWordsAnswer
        );

        const wordIndex = correctAnswers.indexOf(userAnswer);

        if (wordIndex > -1) {
            conv.session.params.englishWordsGuessed++;
            if (
                conv.session.params.englishWordsGuessed == correctAnswers.length
            ) {
                conv.add("Sweet! Try translating these words to spanish");
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

            if (conv.session.params.multipleWordsAttemptsLeft == 0) {
                const convText = `You have ran out of attempts. The correct answers are shown below.`;
                const value = {
                    english: conv.session.params.multipleWordsAnswer,
                    spanish: conv.session.params.multipleWordsAnswerTranslated
                }
                langSetCanvas(
                    conv,
                    convText,
                    "LANG_MULTIPLE_WORDS_SHOW_ANSWER",
                    value
                );
            } else {
                const convText = `That is incorrect! Try again.`;
                langSetCanvas(
                    conv,
                    convText,
                    "LANG_MULTIPLE_WORDS_UPDATE_ATTEMPTS",
                    conv.session.params.multipleWordsAttemptsLeft
                );
            }
        }
    }
});

/**
 * Handler to manage to spanish input from the user
 */
app.handle("lang_word_translation", (conv) => {
    const word = conv.intent.params.word
        ? conv.intent.params.word.resolved
        : null;

    conv.add(`Ok, let's see if ${word} is correct`);

    const userAnswer = String(word);
    const userID = conv.user.params.uid;
    const englishAnswer = conv.session.params.onePicAnswer;

    if (conv.scene.name == "lang_one_pic_translation") {
        const spanishAnswer = conv.session.params.onePicAnswerTranslated;
        if (userAnswer.toLowerCase() == spanishAnswer) {
            const convText = `That is correct! You can say "Next Question" to see something else or "Questions" to go back to the main menu.`;
            langSetCanvas(
                conv,
                convText,
                "LANG_ONE_PIC_SHOW_SPANISH",
                spanishAnswer
            );
            storeTranslatedWordsToFirebase(
                userID,
                englishAnswer,
                spanishAnswer
            );
        } else {
            conv.add(`That is incorrect! Try again.`);
            conv.add(new Canvas());
        }
    } else if (conv.scene.name == "lang_multiple_words_translation") {
        const spanishAnswers = Array.from(
            conv.session.params.multipleWordsAnswerTranslated
        );
        const englishAnswers = Array.from(
            conv.session.params.multipleWordsAnswer
        );
        const wordIndex = spanishAnswers.indexOf(userAnswer);

        if (wordIndex > -1) {
            conv.session.params.spanishWordsGuessed++;
            if (
                conv.session.params.spanishWordsGuessed == spanishAnswers.length
            ) {
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
            conv.add(`That is incorrect! Try again.`);
            conv.add(new Canvas());
        }
    }
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
