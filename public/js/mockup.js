import { Menu } from "./game/menu.js";
import { OnePicOneWord } from "./game/one_pic_one_word.js";

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
    question = new OnePicOneWord();

    constructor() {
        this.createBox();
        var englishWord = "English : ";
        for (var i = 0; i < 5; i++) englishWord += "_ ";
        var spanishWord = "Spanish : ";
        for (var i = 0; i < 8; i++) spanishWord += "_ ";

        this.question.setWord(englishWord);
        this.question.setSpanishWord(spanishWord);
        this.question.setImageURL(
            "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=500&q=60"
        );
        this.game.appendChild(this.question.getWord());
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
