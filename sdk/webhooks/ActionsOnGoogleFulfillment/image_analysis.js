const vision = require("@google-cloud/vision");
const fetch = require('node-fetch');
global.fetch = fetch;
const Unsplash = require('unsplash-js').default;
const toJson = require("unsplash-js").toJson;

const unsplash = new Unsplash({
    accessKey: "DHInTCMt6CYu9swMXL-4JdFThnLbwbzjx6yXHAPWkyg",
});

exports.imageAnalysis = async function() {
    // Creates a client
    const url = await unsplash.photos
        .getRandomPhoto()
        .then(toJson)
        .then((json) => {
            return json.urls.regular
        });

    const client = new vision.ImageAnnotatorClient();
    const [result] = await client.labelDetection(`${url}`);
    const labels = result.labelAnnotations;
    labels.forEach((label) => console.log(label.description));
    return {url: url, word: labels[0].description};
};
