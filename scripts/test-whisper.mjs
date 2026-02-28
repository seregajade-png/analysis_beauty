import { readFileSync } from 'fs';
import { createReadStream, writeFileSync } from 'fs';
import OpenAI from 'openai';
import path from 'path';
import os from 'os';

const key = readFileSync('.env', 'utf8').match(/OPENAI_API_KEY="([^"]+)"/)[1];
console.log('Key:', key.substring(0, 20) + '...');

const openai = new OpenAI({ apiKey: key });

// Найдём загруженный аудиофайл
const uploadsDir = 'public/uploads/audio';
import { readdirSync } from 'fs';

let files;
try {
  files = readdirSync(uploadsDir);
} catch {
  console.log('Папка uploads пустая или не существует');
  process.exit(1);
}

if (files.length === 0) {
  console.log('Нет загруженных файлов в', uploadsDir);
  process.exit(1);
}

const testFile = files[files.length - 1];
const filePath = path.join(uploadsDir, testFile);
console.log('Тестирую файл:', testFile);
console.log('Размер:', readFileSync(filePath).length, 'байт');

console.log('Отправляю в Whisper...');
try {
  const stream = createReadStream(filePath);
  const result = await openai.audio.transcriptions.create({
    file: stream,
    model: 'whisper-1',
    language: 'ru',
    response_format: 'verbose_json',
  });
  console.log('УСПЕХ!');
  console.log('Текст:', result.text.substring(0, 200));
} catch (e) {
  console.error('ОШИБКА:', e.constructor.name);
  console.error('Message:', e.message);
  console.error('Status:', e.status);
  console.error('Full:', JSON.stringify(e, null, 2));
}
