import { readFileSync, readdirSync } from 'fs';
import OpenAI, { toFile } from 'openai';
import path from 'path';

const key = readFileSync('.env', 'utf8').match(/OPENAI_API_KEY="([^"]+)"/)[1];
const openai = new OpenAI({ apiKey: key });

const uploadsDir = 'public/uploads/audio';
const files = readdirSync(uploadsDir);
const testFile = files[files.length - 1];
const filePath = path.join(uploadsDir, testFile);
const buffer = readFileSync(filePath);

console.log('File:', testFile, '—', (buffer.length / 1024 / 1024).toFixed(2), 'MB');
console.log('Sending with toFile...');

try {
  // Detect actual format from magic bytes
let mime = 'audio/mpeg', ext2 = 'mp3';
if (buffer[0] === 0xff && (buffer[1] & 0xf0) === 0xf0) { mime = 'audio/aac'; ext2 = 'aac'; }
else if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) { mime = 'audio/mpeg'; ext2 = 'mp3'; }
else if (buffer.slice(0,3).toString() === 'ID3') { mime = 'audio/mpeg'; ext2 = 'mp3'; }
else if (buffer.slice(4,8).toString() === 'ftyp') { mime = 'audio/mp4'; ext2 = 'm4a'; }
console.log('Detected:', mime, ext2);
const file = await toFile(buffer, `audio.${ext2}`, { type: mime });
  const result = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'ru',
    response_format: 'text',
  });
  console.log('SUCCESS!');
  console.log('Text:', String(result).substring(0, 300));
} catch (e) {
  console.error('ERROR:', e.constructor.name, e.message);
  console.error('Cause:', e.cause?.code, e.cause?.message);
}
