/**
 * TODO(developer): Uncomment the following line before running the sample.
 */
const projectId = "gaurnett-aog-game-e3c26";

// Imports the Google Cloud client library
const { Translate } = require("@google-cloud/translate").v2;

// Instantiates a client
const translate = new Translate({ projectId });

exports.translateFunction = async function(instructions) {
    // The target language
    const target = "es";

    // Translates some text into Russian
    const [translation] = await translate.translate(instructions, target);
    console.log(`Translation: ${translation}`);

    return translation;
};
