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
 * Represent Triangle scene
 */
export class Question {
    /**
     * Initializes the game with visual components.
     */

    questionContainer = document.createElement("div");
    questionNumber = document.createElement("h2");
    mathQuestion = document.createElement("h5");

    constructor() {
        this.questionContainer.classList.add(
            "container",
            "h-100",
        );

        const questionRow = document.createElement("div");
        questionRow.classList.add("row", "h-100", "justify-content-center", "align-items-center");
        
        const questionForm = document.createElement("form");
        questionForm.classList.add("col-4","text-center", "white-background");

        questionForm.append(this.questionNumber, this.mathQuestion);
        questionRow.appendChild(questionForm);
        this.questionContainer.appendChild(questionRow);
    }

    setQuestionNumber(number) {
        this.questionNumber.innerText = "Question " + number;
    }

    setQuestion(question) {
        this.mathQuestion.innerText = question;
    }

    getQuestion() {
        return this.questionContainer;
    }
}
