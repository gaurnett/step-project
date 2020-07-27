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
const gameState = require("./lang_game_state");

const INSTRUCTIONS =
    "Hello user, Do you want me to change color or pause spinning? " +
    "You can also tell me to ask you later.";

const tints = {
    black: 0x000000,
    blue: 0x0000ff,
    green: 0x00ff00,
    cyan: 0x00ffff,
    indigo: 0x4b0082,
    magenta: 0x6a0dad,
    maroon: 0x800000,
    grey: 0x808080,
    brown: 0xa52a2a,
    violet: 0xee82ee,
    red: 0xff0000,
    purple: 0xff00ff,
    orange: 0xffa500,
    pink: 0xffc0cb,
    yellow: 0xffff00,
    white: 0xffffff,
};

const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);

const app = conversation({ debug: true });

app.handle("lang_welcome", (conv) => {
    if (!conv.device.capabilities.includes("INTERACTIVE_CANVAS")) {
        conv.add("Sorry, this device does not support Interactive Canvas!");
        conv.scene.next.name = "actions.page.END_CONVERSATION";
        return;
    }
    conv.add(
        "Hi, Welcome to the AOG Education language section. Please choose between Game 1 or Game 2."
    );
    conv.add(
        new Canvas({
            url: `https://gaurnett-aog-game-e3c26.web.app`,
        })
    );
});

app.handle("lang_fallback", (conv) => {
    conv.add(
        `I don't understand. You can open a new level or change questions.`
    );
    conv.add(new Canvas());
});

app.handle("change_color", (conv) => {
    const color = conv.intent.params.color
        ? conv.intent.params.color.resolved
        : null;
    if (!(color in tints)) {
        conv.add(`Sorry, I don't know that color. Try red, blue, or green!`);
        conv.add(new Canvas());
        return;
    }
    conv.add(`Ok, I changed my color to ${color}. Anything else?`);
    conv.add(
        new Canvas({
            data: {
                command: "TINT",
                tint: tints[color],
            },
        })
    );
});

app.handle("lang_start_one_pic", (conv) => {
    const level = conv.intent.params.level_number
        ? conv.intent.params.level_number.resolved
        : null;

    // const text = "hello";
    // return translation
    //     .translateFunction(text)
    // .then((value) => {
    //     conv.add(`Ok, translating text.`);
    //     conv.add(
    //         new Canvas({
    //             data: {
    //                 command: "QUESTIONS",
    //                 text: text,
    //                 translation: value,
    //             },
    //         })
    //     );
    // })
    // .catch((error) => {
    //     console.log(error);
    // });

    return imageAnalysis
        .imageAnalysis()
        .then((value) => {
            gameState.game_state.one_pic_answer = value.word

            conv.add(`Ok, starting one pic one word`);
            conv.add(
                new Canvas({
                    data: {
                        command: "LANG_START_ONE_PIC",
                        level: level,
                        analysis: value
                    },
                })
            );
        })
        .catch((error) => {
            console.log(error);
        });
});

app.handle("lang_one_pic_word", (conv) => {
    const word = conv.intent.params.word
        ? conv.intent.params.word.resolved
        : null;

    conv.add(`Ok, let's see if ${word} is correct`);

    console.log("Answer = " + gameState.game_state.one_pic_answer);
    console.log("Answer = " + word)
});

app.handle("lang_change_game", (conv) => {
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
