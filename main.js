const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    frame: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('save-settings', async (event, { username, settings }) => {
  try {
    const usersPath = path.join(__dirname, '..', 'users.json');
    let users = {};
    
    if (fs.existsSync(usersPath)) {
      users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    }
    
    if (!users[username]) {
      users[username] = { settings: {} };
    }
    
    users[username].settings = settings;
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-game-files', async (event, { version }) => {
  const gamePath = path.join(app.getPath('userData'), 'games', version);
  return !fs.existsSync(gamePath);
});

ipcMain.handle('save-game-file', async (event, { version, fileName, data }) => {
  try {
    const gamePath = path.join(app.getPath('userData'), 'games', version);
    fs.mkdirSync(gamePath, { recursive: true });
    
    const filePath = path.join(gamePath, fileName);
    fs.writeFileSync(filePath, Buffer.from(data));
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('launch-minecraft', async (event, { username, version, ram }) => {
  try {
    // Validate RAM amount (min 2GB, max 32GB)
    const validatedRam = Math.max(2, Math.min(32, ram));
    
    // Here you would add the actual game launch logic
    // For now, we'll just simulate a successful launch
    
    return { 
      success: true,
      ram: validatedRam
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    };
  }
});

// Window control handlers
ipcMain.on('minimize-window', () => {
  mainWindow.minimize();
});

ipcMain.on('close-window', () => {
  app.quit();
}); 