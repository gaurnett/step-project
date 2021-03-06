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
import { Action } from "./game/action.js";
import { Scene } from "./game/scene.js";

window.addEventListener("load", () => {
    var navigator = new Navigator();
    navigator.startGame();
});

export class Navigator {
    constructor() {}

    startGame() {
        window.scene = new Scene();
        // Set Google Assistant Canvas Action at scene level
        window.scene.action = new Action(scene);
        // Call setCallbacks to register interactive canvas
        window.scene.action.setCallbacks();
    }
}

// Get the header height of the device and set the top body padding accordingly
window.interactiveCanvas.getHeaderHeightPx().then((headerHeight) => {
    document.body.style.paddingTop = `${headerHeight}px`;
});