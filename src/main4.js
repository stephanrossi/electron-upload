const { app, BrowserWindow, Tray, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const axios = require('axios');
const FormData = require('form-data');

let mainWindow;
let tray;

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        icon: path.join(__dirname, '/images/icon.png'),
        title: "Previsa Uploader",
        resizable: false,
        autoHideMenuBar: true,
        darkTheme: true,
        movable: true
    });

    await mainWindow.loadFile(`${__dirname}/index.html`);

    mainWindow.on('minimize', (e) => {
        e.preventDefault();
        mainWindow.hide();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    tray = new Tray(path.join(__dirname, '/images/icon.png'));
    tray.setToolTip('Previsa Uploader');

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Abrir', click: () => mainWindow.show() },
        { label: 'Encerrar', click: () => app.quit() }
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('double-click', mainWindow.show);
}

async function moveFile(sourcePath, destinationFolder) {
    const fileName = path.basename(sourcePath);
    const destinationPath = path.join(destinationFolder, fileName);
    try {
        await fs.promises.rename(sourcePath, destinationPath);
    } catch (err) {
        console.error(`Erro ao mover arquivo: ${err}`);
    }
}

async function sendFileToServer(filePath) {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    try {
        const response = await axios.post('http://endereco-do-seu-servidor/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('Arquivo enviado com sucesso:', response.data);
        await moveFile(filePath, path.join(app.getPath('desktop'), 'Uploads', 'concluídos'));
    } catch (error) {
        console.error('Erro ao enviar arquivo:', error);
        await moveFile(filePath, path.join(app.getPath('desktop'), 'Uploads', 'erros'));
    }
}

async function setupFileWatcher() {
    const uploadsPath = path.join(app.getPath('desktop'), 'Uploads');
    try {
        if (!fs.existsSync(uploadsPath)) {
            await fs.promises.mkdir(uploadsPath, { recursive: true });
        }
    } catch (err) {
        console.error('Erro ao criar pasta de uploads:', err);
    }

    const watcher = chokidar.watch(uploadsPath, { persistent: true });

    watcher.on('add', async (filePath) => {
        // Aqui você pode adicionar verificações adicionais antes de enviar
        await sendFileToServer(filePath);
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (!mainWindow) {
        createWindow();
    }
});
