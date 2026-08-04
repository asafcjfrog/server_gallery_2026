const fs = require('fs');
const path = require('path');

// Plain HTTP download — deliberately avoids requiring @huggingface/transformers
// (and therefore onnxruntime-node) at build time. The Alpine base image uses musl
// libc, and onnxruntime-node's native binding is linked against glibc, so any
// code path that loads it fails with "Error loading shared library
// ld-linux-x86-64.so.2". Since we only need the model files present in the
// image (not runnable at build time), we fetch them directly from the Hub.
//
// Files are written to the same relative paths @huggingface/transformers' own
// FileCache uses (cacheDir/<model_id>/<filename>), so if this cache dir is
// later pointed to by env.cacheDir at runtime, `pipeline()` will find them
// already cached and skip re-downloading.

const MODEL_ID = 'Xenova/flan-t5-small';
// Defaults to the public Hub; in CI this is overridden to Artifactory's
// huggingfaceml remote repo so the download is attributed to a recognized
// Hugging Face package source (see Dockerfile HF_ENDPOINT build-arg).
const REMOTE_HOST = process.env.HF_ENDPOINT || 'https://huggingface.co';
const FILES = [
  'config.json',
  'generation_config.json',
  'special_tokens_map.json',
  'spiece.model',
  'tokenizer.json',
  'tokenizer_config.json',
  'onnx/encoder_model_quantized.onnx',
  'onnx/decoder_model_merged_quantized.onnx',
];

const cacheDir = path.join(__dirname, '..', 'models-cache', MODEL_ID);

const authHeaders = {};
if (process.env.JF_USER && process.env.JF_PASSWORD) {
  const basic = Buffer.from(`${process.env.JF_USER}:${process.env.JF_PASSWORD}`).toString('base64');
  authHeaders.Authorization = `Basic ${basic}`;
}

async function downloadFile(filename) {
  const url = `${REMOTE_HOST}/${MODEL_ID}/resolve/main/${filename}`;
  const destPath = path.join(cacheDir, filename);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  console.log(`Downloading ${url}`);
  const response = await fetch(url, { headers: authHeaders });
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
}

async function main() {
  console.log(`Downloading ${MODEL_ID} into ${cacheDir}`);
  for (const filename of FILES) {
    await downloadFile(filename);
  }
  console.log('Model cached.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
