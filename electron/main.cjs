const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    title: "Lambarki Boutique - ERP Caisse"
  });

  // Load the production build index.html (local files => app works without internet)
  const indexPath = path.join(__dirname, '../dist/index.html');
  mainWindow.loadFile(indexPath);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Hide application menu for cleaner native app experience
  Menu.setApplicationMenu(null);
}

// ── Automatic updates (GitHub Releases) ─────────────────────────
function setupAutoUpdater() {
  if (!app.isPackaged) return; // only in the installed app
  let autoUpdater;
  try {
    autoUpdater = require('electron-updater').autoUpdater;
  } catch (e) {
    console.error('electron-updater not available', e);
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', (err) => {
    // No internet or no release yet: ignore silently, app keeps working
    console.error('Auto-update error:', err == null ? 'unknown' : err.message);
  });

  autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      buttons: ['إعادة التشغيل الآن / Redémarrer', 'لاحقاً / Plus tard'],
      defaultId: 0,
      cancelId: 1,
      title: 'Mise à jour',
      message: `تحديث جديد (${info.version}) جاهز للتثبيت.\nUne nouvelle version (${info.version}) est prête.`,
      detail: 'إذا اخترت "لاحقاً"، سيتم التثبيت تلقائياً عند إغلاق التطبيق.\nSinon, elle sera installée à la fermeture de l\'application.'
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  check();
  // Check again every 2 hours
  setInterval(check, 2 * 60 * 60 * 1000);
}

app.on('ready', () => {
  createWindow();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
