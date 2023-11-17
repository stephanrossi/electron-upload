const { app, BrowserWindow, Tray, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const axios = require('axios');
const FormData = require('form-data');
const AutoLaunch = require('auto-launch');

let mainWindow;
let tray;

function createWindow() {
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
    mainWindow.loadFile(__dirname + '/index.html');

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
        {
            label: 'Abrir',
            click: () => mainWindow.show()
        },
        {
            label: 'Encerrar',
            click: () => app.quit()
        }
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
        mainWindow.show();
    });
}

async function sendFileToServer(filePath) {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    const uploadsPath = path.join(app.getPath('desktop'), 'Uploads');
    const completedPath = path.join(uploadsPath, 'concluídos');
    const errorsPath = path.join(uploadsPath, 'erros');

    try {
        const response = await axios.post('http://endereco-do-seu-servidor/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        console.log('Arquivo enviado com sucesso:', response.data);
        moveFile(filePath, completedPath);
    } catch (error) {
        console.error('Erro ao enviar arquivo:', error);
        moveFile(filePath, errorsPath);
    }
}

function moveFile(sourcePath, destinationFolder) {
    const fileName = path.basename(sourcePath);
    const destinationPath = path.join(destinationFolder, fileName);
    fs.rename(sourcePath, destinationPath, err => {
        if (err) {
            console.error(`Erro ao mover arquivo: ${err}`);
        }
    });
}

function setupFileWatcher() {
    const uploadsPath = path.join(app.getPath('desktop'), 'Uploads');
    createFolderIfNeeded(uploadsPath);

    const completedPath = path.join(uploadsPath, 'concluídos');
    createFolderIfNeeded(completedPath);

    const errorsPath = path.join(uploadsPath, 'erros');
    createFolderIfNeeded(errorsPath);

    const watcher = chokidar.watch(uploadsPath, { persistent: true });

    watcher.on('add', async (filePath) => {
        if (path.extname(filePath).toLowerCase() === '.pdf') {
            await sendFileToServer(filePath);
        } else {
            console.log('Arquivo não é um PDF, ignorado.');
        }
    });
}

function createFolderIfNeeded(folderPath) {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }
}

const electronAppLauncher = new AutoLaunch({
    name: 'Previsa Uploader',
    path: app.getPath('exe'),
});

electronAppLauncher.isEnabled().then((isEnabled) => {
    if (!isEnabled) electronAppLauncher.enable();
}).catch((err) => {
    console.error('Erro ao configurar inicialização automática', err);
});

app.on('ready', () => {
    createWindow();
    setupFileWatcher();
});

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
