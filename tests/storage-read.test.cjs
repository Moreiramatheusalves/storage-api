const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter, once } = require('node:events');
const { after, before, test } = require('node:test');

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storage-read-test-'));

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'storage-read-test-jwt-secret';
process.env.ADMIN_PASSWORD = 'storage-read-test-admin-password';
process.env.BASE_URL = 'http://127.0.0.1:3999';
process.env.STORAGE_ROOT_DIR = temporaryRoot;
process.env.STORAGE_DIR = path.join(temporaryRoot, 'storage');
process.env.APPS_STORAGE_DIR = path.join(temporaryRoot, 'storage', 'apps');
process.env.DATA_DIR = path.join(temporaryRoot, 'data');
process.env.DB_DIR = path.join(temporaryRoot, 'db');
process.env.TMP_DIR = path.join(temporaryRoot, 'tmp');
process.env.GLOBAL_RATE_LIMIT_MAX = '1000';

const { createApp } = require('../dist/app.js');
const { errorHandlerMiddleware } = require('../dist/middlewares/error-handler.middleware.js');
const { ApplicationTokenService } = require('../dist/services/application-token.service.js');

const pngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlTn0YAAAAASUVORK5CYII=',
  'base64'
);

let baseUrl;
let server;
let token;
let applicationId;

function authenticatedUrl(route, relativePath) {
  const url = new URL(route, baseUrl);
  url.searchParams.set('path', relativePath);
  return url;
}

async function authenticatedRead(relativePath) {
  return fetch(authenticatedUrl('/api/files/read', relativePath), {
    headers: { 'X-Storage-Token': token }
  });
}

async function authenticatedDelete(relativePath) {
  return fetch(authenticatedUrl('/api/files', relativePath), {
    method: 'DELETE',
    headers: { 'X-Storage-Token': token }
  });
}

async function authenticatedUpload(relativeDirectory, filename, bytes) {
  const form = new FormData();
  form.append('path', relativeDirectory);
  form.append('filename', filename);
  form.append('file', new Blob([bytes], { type: 'image/png' }), filename);
  return fetch(new URL('/api/files/upload', baseUrl), {
    method: 'POST',
    headers: { 'X-Storage-Token': token },
    body: form
  });
}

async function captureErrorLogs(operation) {
  const originalConsoleError = console.error;
  const logs = [];
  console.error = (...values) => logs.push(values);
  try {
    return { result: await operation(), logs };
  } finally {
    console.error = originalConsoleError;
  }
}

function expectedNotFound() {
  return {
    error: {
      code: 'FILE_NOT_FOUND',
      message: 'File not found'
    }
  };
}

before(async () => {
  fs.mkdirSync(process.env.APPS_STORAGE_DIR, { recursive: true });
  fs.mkdirSync(process.env.TMP_DIR, { recursive: true });

  const created = await new ApplicationTokenService().createApplication('storage-read-tests');
  token = created.token;
  applicationId = created.application.id;

  const imagesDirectory = path.join(process.env.APPS_STORAGE_DIR, applicationId, 'images');
  fs.mkdirSync(imagesDirectory, { recursive: true });
  fs.writeFileSync(path.join(imagesDirectory, 'existing.png'), pngBuffer);
  fs.mkdirSync(path.join(imagesDirectory, 'not-a-file'), { recursive: true });

  server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  try {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  } catch {
    // O processo fecha os handles SQLite restantes ao encerrar o runner.
  }
});

test('arquivo existente retorna 200 e o binário correto', async () => {
  const response = await authenticatedRead('images/existing.png');
  const body = Buffer.from(await response.arrayBuffer());

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.deepEqual(body, pngBuffer);
});

test('arquivo existente preserva os headers de streaming', async () => {
  const response = await authenticatedRead('images/existing.png');

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('cache-control'), 'public, max-age=3600');
  assert.equal(response.headers.get('content-length'), String(pngBuffer.length));
  assert.equal(response.headers.get('content-disposition'), 'inline; filename="existing.png"');
  await response.arrayBuffer();
});

test('arquivo inexistente retorna 404 com código estável', async () => {
  const { result: response } = await captureErrorLogs(() =>
    authenticatedRead('images/missing.png')
  );

  assert.equal(response.status, 404);
  assert.match(response.headers.get('content-type') ?? '', /^application\/json\b/);
  assert.deepEqual(await response.json(), expectedNotFound());
});

test('arquivo removido imediatamente antes da leitura retorna 404', async () => {
  const filePath = path.join(process.env.APPS_STORAGE_DIR, applicationId, 'images', 'removed.png');
  fs.writeFileSync(filePath, pngBuffer);
  fs.unlinkSync(filePath);

  const { result: response } = await captureErrorLogs(() =>
    authenticatedRead('images/removed.png')
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), expectedNotFound());
});

test('ENOENT emitido ao abrir o stream retorna 404 antes dos headers binários', async () => {
  const originalCreateReadStream = fs.createReadStream;
  fs.createReadStream = () => {
    const stream = new EventEmitter();
    process.nextTick(() => {
      stream.emit(
        'error',
        Object.assign(new Error('simulated missing file'), { code: 'ENOENT' })
      );
    });
    return stream;
  };

  try {
    const { result: response } = await captureErrorLogs(() =>
      authenticatedRead('images/existing.png')
    );
    assert.equal(response.status, 404);
    assert.match(response.headers.get('content-type') ?? '', /^application\/json\b/);
    assert.deepEqual(await response.json(), expectedNotFound());
  } finally {
    fs.createReadStream = originalCreateReadStream;
  }
});

test('resposta 404 não contém caminho absoluto nem detalhes internos', async () => {
  const { result: response } = await captureErrorLogs(() =>
    authenticatedRead('images/another-missing.png')
  );
  const body = await response.text();

  assert.equal(response.status, 404);
  assert.equal(body.includes(temporaryRoot), false);
  assert.equal(body.includes(process.env.APPS_STORAGE_DIR), false);
  assert.equal(body.includes(applicationId), false);
  assert.equal(body.includes('ENOENT'), false);
});

test('path inválido continua retornando 400', async () => {
  const { result: response } = await captureErrorLogs(() =>
    authenticatedRead('images/invalid?.png')
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    success: false,
    message: 'Path inválido.'
  });
});

test('tentativa de path traversal continua retornando 400', async () => {
  const { result: response } = await captureErrorLogs(() => authenticatedRead('../secret.png'));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    success: false,
    message: 'Path inválido.'
  });
});

test('token ausente continua retornando 401', async () => {
  const { result: response } = await captureErrorLogs(() =>
    fetch(authenticatedUrl('/api/files/read', 'images/existing.png'))
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    success: false,
    message: 'Header X-Storage-Token é obrigatório.'
  });
});

test('erro de filesystem diferente de ENOENT permanece falha interna', async () => {
  const { result: response } = await captureErrorLogs(() =>
    authenticatedRead('images/not-a-file')
  );

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    success: false,
    message: 'Erro interno do servidor.'
  });
});

test('erro após início do streaming não tenta enviar uma segunda resposta', () => {
  const error = Object.assign(new Error('stream failure'), { code: 'EIO' });
  let nextError;
  let statusCalls = 0;
  let jsonCalls = 0;
  const response = {
    headersSent: true,
    status() {
      statusCalls += 1;
      return this;
    },
    json() {
      jsonCalls += 1;
      return this;
    }
  };
  const originalConsoleError = console.error;
  console.error = () => undefined;

  try {
    errorHandlerMiddleware(error, {}, response, (receivedError) => {
      nextError = receivedError;
    });
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(nextError, error);
  assert.equal(statusCalls, 0);
  assert.equal(jsonCalls, 0);
});

test('logs controlados não expõem path físico, stack ou ENOENT', async () => {
  const { result: response, logs } = await captureErrorLogs(() =>
    authenticatedRead('images/log-missing.png')
  );
  assert.equal(response.status, 404);

  const serialized = JSON.stringify(logs);
  assert.equal(serialized.includes(temporaryRoot), false);
  assert.equal(serialized.includes(process.env.APPS_STORAGE_DIR), false);
  assert.equal(serialized.includes(applicationId), false);
  assert.equal(serialized.includes('ENOENT'), false);
  assert.equal(serialized.includes('stack'), false);
  assert.match(serialized, /FILE_NOT_FOUND/);
});

test('upload e leitura continuam funcionando', async () => {
  const relativePath = 'roundtrip/uploaded.png';
  const uploaded = await authenticatedUpload('roundtrip', 'uploaded.png', pngBuffer);
  assert.equal(uploaded.status, 201);
  assert.equal(
    fs.existsSync(path.join(process.env.APPS_STORAGE_DIR, applicationId, relativePath)),
    true
  );

  const read = await authenticatedRead(relativePath);
  assert.equal(read.status, 200);
  assert.deepEqual(Buffer.from(await read.arrayBuffer()), pngBuffer);

  const removed = await authenticatedDelete(relativePath);
  assert.equal(removed.status, 200);
});

test('exclusão remove o arquivo e leitura posterior retorna 404', async () => {
  const relativePath = 'roundtrip/delete-me.png';
  const physicalPath = path.join(process.env.APPS_STORAGE_DIR, applicationId, relativePath);
  fs.mkdirSync(path.dirname(physicalPath), { recursive: true });
  fs.writeFileSync(physicalPath, pngBuffer);

  const removed = await authenticatedDelete(relativePath);
  assert.equal(removed.status, 200);
  assert.deepEqual(await removed.json(), {
    success: true,
    message: 'Arquivo removido.'
  });
  assert.equal(fs.existsSync(physicalPath), false);

  const { result: missing } = await captureErrorLogs(() => authenticatedRead(relativePath));
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), expectedNotFound());
});
