const path = require('path');
const { pipeline, env } = require('@huggingface/transformers');

env.cacheDir = path.join(__dirname, '..', 'models-cache');

async function main() {
  console.log(`Downloading google/flan-t5-small (ONNX build) into ${env.cacheDir}`);
  await pipeline('text2text-generation', 'Xenova/flan-t5-small');
  console.log('Model cached.');
}

main();
