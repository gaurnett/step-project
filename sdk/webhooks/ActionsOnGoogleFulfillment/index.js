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
 * Welcomes the user to the language section of the app.
 */
app.handle("lang_welcome", (conv) => {
    if (!conv.device.capabilities.includes("INTERACTIVE_CANVAS")) {
        conv.add("Sorry, this device does not support Interactive Canvas!");
        conv.scene.next.name = "actions.page.END_CONVERSATION";
        return;
    }
    conv.add(
        "Hi, Welcome to the AOG Education language section. Please choose a game from the menu below."
    );
    conv.add(
        new Canvas({
            url: `https://gaurnett-aog-game-e3c26.web.app`,
        })
    );
    console.log("AOG User Params = " + conv.user.params);
    console.log("AOG User ID = " + conv.user.params.uid);
    console.log("AOG User ID = " + conv.user.params.tokenPayload.given_name);
    
    const firestoreUser = admin
        .firestore()
        .doc(`AOGUsers/${conv.user.params.uid}`);

    firestoreUser.set(
        {
            TranslatedWordss: admin.firestore.FieldValue.arrayUnion({
                english: "sky is the limit",
                spanish: "cielo"
            })
        }, { merge: true });
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
        conv.user.params.startedOnePic == undefined ||
        conv.user.params.startedOnePic == false
    ) {
        conv.add(`Ok, starting one pic one word`);
        conv.add(
            `To play this game, please guess the english word shown by the picture.`
        );
        conv.user.params.startedOnePic = true;
    }

    return imageAnalysis
        .imageAnalysis()
        .then((value) => {
            conv.user.params.onePicAnswer = value.word;
            conv.add(
                new Canvas({
                    data: {
                        command: "LANG_START_ONE_PIC",
                        analysis: value,
                    },
                })
            );
        })
        .catch((error) => {
            console.log(error);
        });
});

/**
 * Handler to manage the word the user guesses
 */
app.handle("lang_one_pic_word", (conv) => {
    const word = conv.intent.params.word
        ? conv.intent.params.word.resolved
        : null;

    conv.add(`Ok, let's see if ${word} is correct`);

    const correctAnswer = conv.user.params.onePicAnswer;
    const userAnswer = String(word);

    if (userAnswer.toLowerCase() == correctAnswer.toLowerCase()) {
        conv.add(`That is correct! Try translating it to spanish`);
        conv.add(
            new Canvas({
                data: {
                    command: "LANG_ONE_PIC_SHOW_ENGLISH",
                    word: correctAnswer,
                },
            })
        );
        conv.scene.next.name = "lang_one_pic_translation";
    } else {
        conv.add(`That is incorrect! Try again.`);
        conv.add(new Canvas());
    }
});

/**
 * Handler to manage to spanish input from the user
 */
app.handle("lang_one_pic_word_translation", (conv) => {
    const word = conv.intent.params.word
        ? conv.intent.params.word.resolved
        : null;

    conv.add(`Ok, let's see if ${word} is correct`);
    const correctAnswer = conv.user.params.onePicAnswer;
    return translation
        .translateFunction(correctAnswer)
        .then((value) => {
            const userAnswer = String(word);
            if (userAnswer.toLowerCase() == value.toLowerCase()) {
                conv.add(
                    `That is correct! You can say "Next Question" to see something else or "Questions" to go back to the main menu.`
                );
                conv.add(
                    new Canvas({
                        data: {
                            command: "LANG_ONE_PIC_SHOW_SPANISH",
                            word: value,
                        },
                    })
                );
            } else {
                conv.add(`That is incorrect! Try again.`);
                conv.add(new Canvas());
            }
        })
        .catch((error) => {
            console.log(error);
        });
});

/**
 * Handler to start the next question
 */
app.handle("lang_one_pic_next_question", (conv) => {
    conv.add(`Ok, starting next question`);
    conv.scene.next.name = "lang_one_pic";
});

/**
 * Handler to return to the main menu
 */
app.handle("lang_change_game", (conv) => {
    conv.user.params.startedOnePic = false;
    conv.add(`Ok, opening questions.`);
    conv.add(
        new Canvas({
            data: {
                command: "QUESTIONS",
            },
        })
    );
});

app.handle("lang_instructions", (conv) => {
    conv.add(INSTRUCTIONS);
    conv.add(new Canvas());
});

exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);
