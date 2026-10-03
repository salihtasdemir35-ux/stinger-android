// "npx cap add android" sonrası çalışır: simgeler, açılış görseli, izinler, tam ekran, ekranın kapanmaması, sürüm numarası.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), A = path.join(root, 'android'), RES = path.join(A, 'app', 'src', 'main', 'res');
if (!fs.existsSync(A)) { console.error('android klasörü yok. Önce: npx cap add android'); process.exit(1); }
const copyDir = (src, dst) => { for (const e of fs.readdirSync(src, { withFileTypes: true })) { const s = path.join(src, e.name), d = path.join(dst, e.name); if (e.isDirectory()) { fs.mkdirSync(d, { recursive: true }); copyDir(s, d); } else fs.copyFileSync(s, d); } };
// 1) simgeler
copyDir(path.join(root, 'resources', 'android', 'res'), RES);
fs.mkdirSync(path.join(RES, 'values'), { recursive: true });
fs.writeFileSync(path.join(RES, 'values', 'ic_launcher_background.xml'), '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#132017</color>\n</resources>\n');
// 2) açılış görseli: şablondaki tüm splash.png dosyalarının yerine
let n = 0; const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === 'splash.png') { fs.copyFileSync(path.join(root, 'resources', 'splash.png'), p); n++; } } }; walk(RES);
// 3) uygulama adı
const strings = path.join(RES, 'values', 'strings.xml');
if (fs.existsSync(strings)) fs.writeFileSync(strings, fs.readFileSync(strings, 'utf8').replace(/<string name="app_name">[^<]*<\/string>/, '<string name="app_name">STINGER</string>').replace(/<string name="title_activity_main">[^<]*<\/string>/, '<string name="title_activity_main">STINGER</string>'));
// 4) izinler
const manPath = path.join(A, 'app', 'src', 'main', 'AndroidManifest.xml'); let man = fs.readFileSync(manPath, 'utf8');
for (const perm of ['android.permission.INTERNET', 'android.permission.VIBRATE', 'android.permission.ACCESS_NETWORK_STATE'])
  if (!man.includes(perm)) man = man.replace('</manifest>', `    <uses-permission android:name="${perm}" />\n</manifest>`);
// Android 11+ metin okuma motorunu bulabilmek için
if (!man.includes('android.intent.action.TTS_SERVICE')) man = man.replace('</manifest>', '    <queries>\n        <intent>\n            <action android:name="android.intent.action.TTS_SERVICE" />\n        </intent>\n    </queries>\n</manifest>');
fs.writeFileSync(manPath, man);
// 5) MainActivity: ekran kapanmasın + tam ekran (sistem çubukları kaydırınca görünür)
const find = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { const r = find(p); if (r) return r; } else if (e.name === 'MainActivity.java') return p; } return null; };
const mainAct = find(path.join(A, 'app', 'src', 'main', 'java'));
if (mainAct) {
  const pkg = (fs.readFileSync(mainAct, 'utf8').match(/^package\s+([\w.]+);/m) || [])[1] || 'com.stinger.interceptor';
  fs.writeFileSync(mainAct, `package ${pkg};

import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        immersive();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) immersive();
    }

    private void immersive() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
`);
}
// 6) sürüm numarası (her GitHub derlemesinde artar)
const gradle = path.join(A, 'app', 'build.gradle');
if (fs.existsSync(gradle)) {
  const code = parseInt(process.env.VERSION_CODE || '1', 10) || 1, name = process.env.VERSION_NAME || '1.1.' + code;
  let g = fs.readFileSync(gradle, 'utf8').replace(/versionCode\s+\d+/, `versionCode ${code}`).replace(/versionName\s+"[^"]*"/, `versionName "${name}"`);
  if (!g.includes('androidx.core:core:')) g = g.replace(/dependencies\s*\{/, 'dependencies {\n    implementation "androidx.core:core:$androidxCoreVersion"');   // MainActivity tam ekran API'leri
  fs.writeFileSync(gradle, g);
}
console.log(`Android ayarları uygulandı: simgeler, ${n} açılış görseli, izinler, tam ekran, MainActivity: ${mainAct ? 'güncellendi' : 'bulunamadı'}`);
