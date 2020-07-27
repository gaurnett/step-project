import { Menu } from "./game/menu.js";
import { Question } from "./game/question.js";

window.addEventListener("load", () => {
    var menu = new Question();
    menu.setQuestion("word")
    document.getElementById("game").appendChild(menu.getQuestion());
});