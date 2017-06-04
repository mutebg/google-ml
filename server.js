const express = require("express");
const app = express();
const R = require("ramda");
const config = require("./config");
const cloudConfig = {
  projectId: config.project_id,
  keyFilename: config.project_key
};
const vision = require("@google-cloud/vision")(cloudConfig);
const language = require("@google-cloud/language")(cloudConfig);
const Twitter = require("twitter");
const twitterClient = new Twitter(config);

async function userTwits(name) {
  return await twitterClient.get("statuses/user_timeline", {
    screen_name: name,
    count: 10
  });
}

const propText = R.prop("text");

const propEntities = R.prop("entities");

const propHashTags = R.prop("hashtags");

const propMedia = R.propOr("", "media");

const propMediURL = R.prop("media_url");

const takeHashTags = R.pipe(propEntities, propHashTags, R.map(propText));

const takeImage = R.pipe(propEntities, propMedia, R.head, propMediURL);

const concatText = R.pipe(R.map(propText), R.join(" "));

const createDocument = textToAnalyze =>
  language.document(textToAnalyze, {
    language: "en"
  });

// twit -> text
const transformTwit = twit => ({
  text: propText(twit),
  hashtags: takeHashTags(twit),
  image: takeImage(twit)
});

async function annotateText(document) {
  return await document.annotate({
    entities: true,
    sentiment: true,
    sentences: true
  });
}

app.get("/", async (req, res) => {
  const response = R.map(transformTwit, await userTwits("mutebg"));

  const analizedText = await R.pipe(concatText, createDocument, annotateText)(
    response
  );
  res.json(analizedText);
});

app.get("/face", async (req, res) => {
  const imgUrl = "./faces.jpg";
  const types = [
    "document", // find text on the image
    "faces", // find facec on the image
    "landmarks",
    "labels", // tags
    "properties" //  colors of the image
  ];
  try {
    const response = await vision.detect(imgUrl, types);
    res.json(response);
  } catch (error) {
    res.json(error);
  }
});

app.listen(3000, () => {
  console.log("Example app listening on port 3000!");
});
