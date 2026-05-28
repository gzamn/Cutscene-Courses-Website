import fs from 'fs';

console.log('--- Nginx access log ---');
try {
  console.log(fs.readFileSync('/var/log/nginx/access.log', 'utf8'));
} catch (e) {
  console.error(e);
}

console.log('--- Nginx error log ---');
try {
  console.log(fs.readFileSync('/var/log/nginx/error.log', 'utf8'));
} catch (e) {
  console.error(e);
}
