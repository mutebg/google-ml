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
const cheerio = require("cheerio");
const fetch = require("node-fetch");

const createDocument = textToAnalyze =>
  language.document(textToAnalyze, {
    language: "en"
  });

const annotateText = document =>
  document.annotate(
    {
      // entities: true,
      // sentiment: true,
      // sentences: true
    }
  );

const visionImage = imgUrl =>
  vision.detect(imgUrl, [
    "document", // find text on the image
    "faces", // find facec on the image
    "landmarks",
    "labels", // tags
    "properties" //  colors of the image
  ]);

app.get("/medium", async (req, res) => {
  try {
    const checkText = !!req.query.text;
    const checkImg = !!req.query.img;
    const url = req.query.url;
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const $content = $(".postArticle-content");
    const json = {};

    if (checkImg) {
      let imgs = [];
      $content.find("img").each(function(i, elem) {
        imgs[i] = $(this).attr("src");
      });
      const visionPromisses = Promise.all(
        imgs.map(async (src, _) => await visionImage(src))
      );
      const visionResponse = await visionPromisses;
      const vision = visionResponse.map(R.head);
      json["imgs"] = vision;
    }

    if (checkText) {
      const text = $content.text();
      const analizedTextPromise = R.pipe(createDocument, annotateText)(text);
      const [analizedText] = await analizedTextPromise;
      json["text"] = analizedText;
    }

    res.json(json);
  } catch (error) {
    console.log(error);
    res.json(error);
  }
});

app.listen(3000, () => {
  console.log("Example app listening on port 3000!");
});
