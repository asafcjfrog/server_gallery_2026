const express = require('express')
const fileUpload = require('express-fileupload');
const undici = require('undici')
const path = require('path')
const fs = require('fs');

// Alpine (musl) can't load the glibc-linked onnxruntime-node native binding,
// so force the pure-WASM onnxruntime-web backend instead.
globalThis[Symbol.for('onnxruntime')] = require('onnxruntime-web');

const { pipeline, env } = require('@huggingface/transformers');
const app = express()
const port = 8080

env.cacheDir = path.join(__dirname, 'models-cache');

let generatorPromise = null;
function getGenerator() {
  if (!generatorPromise) {
    generatorPromise = pipeline('text2text-generation', 'Xenova/flan-t5-small');
  }
  return generatorPromise;
}
const api_key = "2VTHzn1mKZ/n9apD5P6nxsajSQh8QhmyyKvUIRoZWAHCB8lSbBm3YWx5nOdZ1zPEOaA0zIZy1eFgHgfB2HkfAdVrbQj19kagXDVe"
const api_key3 = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYzEAMPLEKEYPrxQm6WxUq-Eb5ujhf6K"
const api_key4 = "cmVmdGtuOjAxOjE3NzAzMTgzMTQ6MmgzSWZDTTRBdjVOdWFoS2dRblh0MEtJd2Rs"


function parseUrl(usrUrl){
  const slashIndex = usrUrl.indexOf('/')
  const slashNextIndex = usrUrl.indexOf('/', (slashIndex + 2))
  return usrUrl.slice(slashNextIndex), usrUrl.slice(0, slashNextIndex)
}

function makeid(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

app.use(express.json());
app.use(fileUpload({parseNested: false}));

app.get('/', (req, res) => {
  console.log(path.join(__dirname+'/views/index.html'))
  res.sendFile(path.join(__dirname+'/views/index.html'));

})

app.post("/uploadPath", (req, res) => {
  const usrUrl = req.body.myURL
  let url, path = parseUrl(usrUrl)
  console.log(url)
  console.log(path)
  console.log(api_key)
  const {
    statusCode,
    headers,
    trailers,
    body
  } = undici.request({origin: url , pathname: path})

  fs.writeFile(__dirname + "/uploads/" + makeid(12), body, err => {
    if (err) {
      return res.status(500).send(err);
    }
  })
  
  return res.send({ status: "success", path: path });
  
})

app.post("/generate", async (req, res) => {
  const prompt = req.body.prompt
  if (!prompt) {
    return res.status(400).send({ status: "error", message: "prompt is required" });
  }

  try {
    const generator = await getGenerator();
    const output = await generator(prompt);
    return res.send({ status: "success", output });
  } catch (err) {
    return res.status(500).send({ status: "error", message: err.message });
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})