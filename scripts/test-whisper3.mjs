import { readFileSync, readdirSync } from 'fs';
import { writeFile, unlink, readFile } from 'fs/promises';
import OpenAI, { toFile } from 'openai';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import os from 'os';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
console.log('ffmpeg path:', ffmpegInstaller.path);

const key = readFileSync('.env', 'utf8').match(/OPENAI_API_KEY="([^"]+)"/)[1];
const openai = new OpenAI({ apiKey: key });

const uploadsDir = 'public/uploads/audio';
const files = readdirSync(uploadsDir);
const testFile = files[files.length - 1];
const filePath = path.join(uploadsDir, testFile);
const buffer = readFileSync(filePath);

console.log('File:', testFile, '—', (buffer.length / 1024 / 1024).toFixed(2), 'MB');

// Convert to mp3
const tempInput = path.join(os.tmpdir(), `test_${Date.now()}.aac`);
const tempOutput = path.join(os.tmpdir(), `test_${Date.now()}.mp3`);
await writeFile(tempInput, buffer);

console.log('Converting to mp3...');
await new Promise((resolve, reject) => {
  ffmpeg(tempInput)
    .audioCodec('libmp3lame')
    .audioBitrate(128)
    .output(tempOutput)
    .on('end', resolve)
    .on('error', reject)
    .run();
});
console.log('Converted!');

const mp3Buffer = await readFile(tempOutput);
await unlink(tempInput).catch(() => {});
await unlink(tempOutput).catch(() => {});

console.log('MP3 size:', (mp3Buffer.length / 1024 / 1024).toFixed(2), 'MB');
console.log('Sending to Whisper...');

try {
  const file = await toFile(mp3Buffer, 'audio.mp3', { type: 'audio/mpeg' });
  const result = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'ru',
    response_format: 'text',
  });
  console.log('\nSUCCESS!');
  console.log('Text:', String(result).substring(0, 400));
} catch (e) {
  console.error('ERROR:', e.constructor.name, e.message);
}
