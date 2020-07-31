const vision = require("@google-cloud/vision");
const fetch = require("node-fetch");
global.fetch = fetch;
const Unsplash = require("unsplash-js").default;
const toJson = require("unsplash-js").toJson;
const Client = require("node-pexels").Client;

const config = require("./config");

const pexels = new Client(config.keys.pexels);
const unsplash = new Unsplash({
    accessKey: config.keys.unsplash,
});

exports.imageAnalysis = async function imageAnalysis() {
    const pexelImageURL = await pexels
        .search("people", 5, 1)
        .then((results) => {
            console.log(results);
            if (results.photos.length > 0) {
                const photo = results.photos[0];
                const source = "medium";

                return photo.src.medium
            } else {
                throw new Error("no results found");
            }
        })
        .catch((error) => {
            console.error(error);
        });

    const client = new vision.ImageAnnotatorClient();
    const [result] = await client.labelDetection(`${pexelImageURL}`);
    const labels = result.labelAnnotations;
    labels.forEach((label) => console.log(label.description));

    return { url: pexelImageURL, word: labels[0].description };
};
