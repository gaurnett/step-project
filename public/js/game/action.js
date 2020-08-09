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

/**
 * This class is used as a wrapper for Google Assistant Canvas Action class
 * along with its callbacks.
 */
export class Action {
    /**
     * @param {*} scene which serves as a container of all visual elements
     */
    constructor(scene) {
      this.canvas = window.interactiveCanvas;
      this.scene = scene;
      this.commands = {
        LANG_MENU: (data) => {
            this.scene.openMenu(data.value);
        },
        LANG_START_ONE_PIC: (data) => {
            this.scene.startOnePicOneWord(data.value);
        },
        LANG_ONE_PIC_SHOW_ENGLISH: (data) => {
            this.scene.onePicOneWordShowEnglish(data.value);
        },
        LANG_ONE_PIC_SHOW_SPANISH: (data) => {
            this.scene.onePicOneWordShowSpanish(data.value);
        },
        LANG_ONE_PIC_UPDATE_ATTEMPTS: (data) => {
            this.scene.updateOnePicAttempts(data.value);
        },
        LANG_ONE_PIC_SHOW_ANSWER: (data) => {
            this.scene.showOnePicAnswer(data.value);
        },
        LANG_START_MULTIPLE_WORDS: (data) => {
            this.scene.startOnePicMultipleWords(data.value);
        },
        LANG_MULTIPLE_WORDS_SHOW_ENGLISH: (data) => {
            this.scene.onePicMultipleWordShowEnglish(data.value);
        },
        LANG_MULTIPLE_WORDS_SHOW_SPANISH: (data) => {
            this.scene.onePicMultipleWordShowSpanish(data.value);
        },
        LANG_MULTIPLE_WORDS_UPDATE_ATTEMPTS: (data) => {
            this.scene.updateMultipleWordsAttempts(data.value);
        },
        LANG_MULTIPLE_WORDS_SHOW_ANSWER: (data) => {
            this.scene.showMultipleWordsAnswer(data.value);
        }
      };
      this.commands.LANG_START_ONE_PIC.bind(this);
      this.commands.LANG_ONE_PIC_UPDATE_ATTEMPTS.bind(this);
      this.commands.LANG_START_MULTIPLE_WORDS.bind(this);
      this.commands.LANG_ONE_PIC_SHOW_ENGLISH.bind(this);
      this.commands.LANG_MULTIPLE_WORDS_SHOW_ENGLISH.bind(this);
      this.commands.LANG_ONE_PIC_SHOW_SPANISH.bind(this);
      this.commands.LANG_MULTIPLE_WORDS_SHOW_SPANISH.bind(this);
      this.commands.LANG_MENU.bind(this);
    }
  
    /**
     * Register all callbacks used by Interactive Canvas
     * executed during scene creation time.
     *
     */
    setCallbacks() {
      // declare interactive canvas callbacks
      const callbacks = {
        onUpdate: (data) => {
          try {
            this.commands[data[0].command.toUpperCase()](data[0]);
          } catch (e) {
            // do nothing, when no command is sent or found
          }
        },
      };
      callbacks.onUpdate.bind(this);
      // called by the Interactive Canvas web app once web app has loaded to
      // register callbacks
      this.canvas.ready(callbacks);
    }
  }
  