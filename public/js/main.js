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

// const GKEY =
//     "ya29.c.Ko8B1QfZK1xS0qbmZdRgirDMGc1q19LaoG0M0Lx9XRH4dz5m65Ct8OGf_HcgDkKRsJ9VPi1t41Fd-sth-8poufAAi0Dk0qJH-cinKhnGD4qCb7PVf5ziulDwA24qgmUkwDzFtDPRBbPCiGOvhSb05Ubnv_Isomv6NHZpOowmySpzzxe-Hte5cPZaTK-FtMorlwM";
// const getTranslation = (term, target) => {
//     return new Promise((resolve, reject) => {
//         setTimeout(() => {
//             fetch("https://translation.googleapis.com/language/translate/v2", {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json; charset=utf-8",
//                     Authorization: `Bearer ${GKEY}`,
//                 },
//                 redirect: "follow",
//                 referrer: "no-referrer",
//                 body: JSON.stringify({
//                     q: term,
//                     target: target,
//                 }),
//             })
//                 .then((response) =>
//                     response.ok
//                         ? response
//                         : reject(
//                               `Fetch failed with status code ${response.status}`
//                           )
//                 )
//                 .then((response) => {
//                     return response.json();
//                 })
//                 .then((json) => {
//                     json.error
//                         ? reject(json.error)
//                         : resolve({
//                               key: term,
//                               value: json.data.translations[0].translatedText,
//                           });
//                 })
//                 .catch((error) => reject(error));
//         }, 50);
//     });
// };

window.addEventListener("load", () => {
    // getTranslation("Hello", "es").then((value) => {
    //     console.log(value);
    // });
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
