import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

app.disableHardwareAcceleration();

// Configuração para ter o __dirname em módulos ES (type: module)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    title: 'Livro Caixa Simples',
    webPreferences: {
        nodeIntegration: true,       // Permite usar Node.js dentro do React
        contextIsolation: false,     // Desativa o isolamento para facilitar testes
        // nodeIntegrationInWorker: true,
        webSecurity: false,           // Isso ajuda a carregar arquivos locais/WASM sem bloqueios
        sandbox: false
    }
  });

  mainWindow.setMenu(null);

  // Em produção, o Electron carrega os arquivos gerados pelo Vite na pasta 'dist'
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    // Em desenvolvimento, o Electron acessa o servidor do Vite rodando localmente
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});