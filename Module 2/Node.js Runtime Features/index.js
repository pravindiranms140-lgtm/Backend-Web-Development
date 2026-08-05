/**
 * Node.js Runtime Features — Streams, Buffers & the File System
 *
 * GOAL
 * Move the SAME file two different ways and feel the difference.
 */

const fs = require('fs');
const path = require('path');

// Absolute, OS-safe path to the sample file.
const INPUT = path.join(__dirname, 'sample-data.txt');
const OUTPUT = path.join(__dirname, 'sample-copy.txt');

// ── PART 1: Read the whole file into memory ────────────────────────────────
function readWholeFile() {
  fs.readFile(INPUT, (err, data) => {
    if (err) {
      console.error("Error reading file:", err);
      return;
    }

    console.log(`readFile: loaded ${data.length} bytes into memory at once`);
  });
}

// ── PART 2: Stream the file and copy it ────────────────────────────────────
function streamFile() {
  const readStream = fs.createReadStream(INPUT);
  const writeStream = fs.createWriteStream(OUTPUT);

  readStream.pipe(writeStream);

  writeStream.on("finish", () => {
    console.log("stream: finished copying via 64KB chunks (peak memory stays flat)");
  });

  readStream.on("error", (err) => {
    console.error("Error reading stream:", err);
  });

  writeStream.on("error", (err) => {
    console.error("Error writing stream:", err);
  });
}

// ── PART 3: Explanation ────────────────────────────────────────────────────
/*
The fs.readFile method loads the entire file into memory before processing it,
so memory usage increases with the file size. Streams process the file in small
chunks, keeping memory usage low and making them the better choice for large files.
*/

// Run both approaches.
readWholeFile();
streamFile();

module.exports = { readWholeFile, streamFile, INPUT, OUTPUT };