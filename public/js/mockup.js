import { Menu } from "./game/menu.js";
import { OnePicOneWord } from "./game/one_pic_one_word.js";
import { OnePicMultipleWords } from "./game/one_pic_multiple_words.js";
import { Conversation } from "./game/conversation.js";
import { Vocabulary } from "./game/vocab.js";

window.addEventListener("load", () => {
    var navigator = new Navigator();
    navigator.startGame();
});

export class Navigator {
    constructor() {}

    startGame() {
        window.scene = new Scene();
    }
}

export class Scene {
    game = document.getElementById("game");
    menu = new Menu();
    question = new OnePicMultipleWords();
    onePicOneWord = new OnePicOneWord();
    conversation = new Conversation();
    vocabulary = new Vocabulary();

    constructor() {
        this.createBox();

        const words = [
            {
                english: "sky",
                spanish: "cielo"
            },
            {
                english: "blue",
                spanish: "azul"
            },
            {
                english: "house",
                spanish: "casa"
            }
        ]
        this.game.appendChild(this.vocabulary.getWords());
        this.vocabulary.setWords(words)
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
        this.stage.position.set(
            this.game.clientWidth / 2,
            this.game.clientHeight / 2
        );
        this.stage.scale.set(
            Math.max(this.renderer.width, this.renderer.height) / 1024
        );

        var boxes = [];
        boxes.push(this.drawBox("rect", "0x4285F4", -280, -150, 200, 200));
        boxes.push(this.drawBox("circle", "0xDB4437", 280, -180, 110, 0));
        boxes.push(this.drawBox("rect", "0x0F9D58", 230, 120, 220, 140));
        boxes.push(this.drawBox("line", "0xF4B400", -240, 70, 125, 90));

        let last = performance.now();
        // frame-by-frame animation function
        const frame = () => {
            // calculate time differences for smooth animations
            const now = performance.now();
            const delta = now - last;

            for (var index = 0; index < boxes.length; index++) {
                index % 2 == 0
                    ? (boxes[index].rotation -= delta / 1000)
                    : (boxes[index].rotation += delta / 1000);
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
            shape.drawCircle(50, 50, width);
        } else if (type == "rect") {
            shape.drawRect(0, 0, width, height);
        } else if (type == "ellipse") {
            shape.drawEllipse(25, 25, width, height);
        } else if (type == "line") {
            shape.lineStyle(10, color, 1);
            shape.moveTo(5, 0);
            shape.lineTo(5, 250);
        }

        shape.endFill();
        shape.x = x;
        shape.y = y;
        this.stage.addChild(shape);

        return shape;
    }
}
