// Sunucu adresini oyuna gömer: STINGER_SERVER ortam değişkeni (GitHub "Variables" veya elle çalıştırma girdisi)
const fs = require('fs'), path = require('path');
const file = path.join(__dirname, '..', 'www', 'index.html');
let url = (process.env.STINGER_SERVER || '').trim();
if (!url) { console.log('STINGER_SERVER boş: oyun, sunucu adresini uygulama içinden (ONLINE → Sunucu adresi) isteyecek.'); process.exit(0); }
if (/^https?:\/\//i.test(url)) url = url.replace(/^http/i, 'ws');
if (!/^wss?:\/\//i.test(url)) url = 'wss://' + url;
url = url.replace(/\/+$/, '');
const html = fs.readFileSync(file, 'utf8');
if (!html.includes("'__STINGER_SERVER__'")) { console.log('Yer tutucu bulunamadı (zaten yazılmış olabilir).'); process.exit(0); }
fs.writeFileSync(file, html.replace("'__STINGER_SERVER__'", JSON.stringify(url).replace(/"/g, "'")));
console.log('Sunucu adresi gömüldü:', url);
