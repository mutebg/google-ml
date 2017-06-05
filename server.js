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

async function annotateText(document) {
  return await document.annotate({
    entities: true,
    sentiment: true,
    sentences: true
  });
}

async function visionImage(imgUrl) {
  const types = [
    "document", // find text on the image
    "faces", // find facec on the image
    "landmarks",
    "labels", // tags
    "properties" //  colors of the image
  ];
  return await vision.detect(imgUrl, types);
}

app.get("/medium", async (req, res) => {
  try {
    const url =
      "https://medium.com/@mutebg/improve-your-javascript-code-quality-with-the-right-tools-aafb5db2acf7";
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const $content = $(".postArticle-content");
    const text = $content.text();
    var imgs = [];
    $content.find("img").each(function(i, elem) {
      imgs[i] = $(this).attr("src");
    });

    const vision = await Promise.all(
      imgs.map(async (src, _) => await visionImage(src))
    );

    //const analizedText = await R.pipe(createDocument, annotateText)(text);

    res.json({ text, vision });
  } catch (error) {
    console.log(error);
    res.json(error);
  }
});

app.listen(3000, () => {
  console.log("Example app listening on port 3000!");
});
