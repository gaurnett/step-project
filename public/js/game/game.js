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
import { Menu } from "./menu.js";
import { Question } from "./question.js";

export class Game {
    /**
     * Initializes the game with visual components.
     */
    game = document.getElementById("game");
    menu = new Menu();
    question = new Question();

    constructor() {
        this.createBox();
        this.game.appendChild(this.menu.getMenu());
    }

    openQuestion(data) {
        this.game.removeChild(this.menu.getMenu());

        this.question.setQuestionNumber(data);
        this.question.setQuestion("What's 1 + 1?");
        this.game.appendChild(this.question.getQuestion());
    }

    openMenu() {
        this.game.removeChild(this.question.getQuestion());
        this.game.appendChild(this.menu.getMenu());
    }

    createBox() {
        // initialize rendering and set correct sizing
        this.ratio = window.devicePixelRatio;
        this.renderer = PIXI.autoDetectRenderer({
            transparent: true,
            antialias: true,
            resolution: this.ratio,
            width: this.game.clientWidth,
            height: this.game.clientHeight,
        });
        this.element = this.renderer.view;
        this.element.style.width = `${this.renderer.width / this.ratio}px`;
        this.element.style.height = `${this.renderer.height / this.ratio}px`;
        this.game.appendChild(this.element);

        // center stage and normalize scaling for all resolutions
        this.stage = new PIXI.Container();
        this.stage.position.set(this.game.clientWidth / 2, this.game.clientHeight / 2);
        this.stage.scale.set(
            Math.max(this.renderer.width, this.renderer.height) / 1024
        );

        var boxes = []
        boxes.push(this.drawBox("circle", "0xF44336", 50, -90, 20, 0));
        boxes.push(this.drawBox("rect", "0xE91E63", 100, -50, 30, 30));
        boxes.push(this.drawBox("ellipse", "0x9C27B0", -80, -10, 30, 20));
        boxes.push(this.drawBox("circle", "0x2196F3", 50, 100, 15, 0));
        boxes.push(this.drawBox("rect", "0x4CAF50", -150, -100, 20, 20));
        boxes.push(this.drawBox("ellipse", "0xFF9800", 50, 40, 20, 12));

        boxes.push(this.drawBox("circle", "0x607D8B", -180, -30, 10, 0));
        boxes.push(this.drawBox("rect", "0x795548", -180, 70, 40, 20));
        boxes.push(this.drawBox("ellipse", "0xCDDC39", 180, 70, 25, 15));
        boxes.push(this.drawBox("circle", "0x009688", 180, -90, 5, 0));
        boxes.push(this.drawBox("rect", "0xFF5722", 180, 0, 30, 15));

        let last = performance.now();
        // frame-by-frame animation function
        const frame = () => {
            // calculate time differences for smooth animations
            const now = performance.now();
            const delta = now - last;

            for (var index = 0; index < boxes.length; index++) {
                index % 2 == 0 ? boxes[index].rotation -= delta / 1000 : boxes[index].rotation += delta / 1000;
            }

            last = now;

            this.renderer.render(this.stage);
            requestAnimationFrame(frame);
        };
        frame();
    }

    drawBox(type, color, x, y, width, height) {
        var shape = new PIXI.Graphics();
        shape.beginFill(color);
        if (type == "circle") {
            shape.drawCircle(20, 20, width);
        } else if (type == "rect") {
            shape.drawRect(0, 0, width, height);
        } else if (type == "ellipse") {
            shape.drawEllipse(25, 25, width, height);
        }
        
        shape.endFill();
        shape.x = x;
        shape.y = y;
        this.stage.addChild(shape);

        return shape
    }
}
