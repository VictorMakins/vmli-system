const http = require('http');
const fs = require('fs');
const path = require('path');

const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;
const publicDir = __dirname;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let requestPath;
  try {
    requestPath = decodeURIComponent(req.url.split('?')[0] || '/');
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Requisição inválida');
    return;
  }

  const requestedFile = requestPath === '/' ? '/index.html' : requestPath;
  const filePath = path.resolve(publicDir, `.${requestedFile.startsWith('/') ? requestedFile : `/${requestedFile}`}`);
  const relativePath = path.relative(publicDir, filePath);

  if (relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Acesso negado');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Arquivo não encontrado');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(port, hostname, () => {
  console.log(`VMLI System rodando em http://${hostname}:${port}`);
});
