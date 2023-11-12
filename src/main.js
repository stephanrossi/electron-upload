const { app, BrowserWindow, Tray, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const axios = require('axios');
const FormData = require('form-data');

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

    // mainWindow.loadFile('index.html');

    mainWindow.on('minimize', (e) => {
        e.preventDefault();
        mainWindow.hide();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    tray = new Tray(path.join(__dirname, '/images/icon.png'));

    // tray = new Tray(path.join(__dirname, 'src/images/seu-icone.png'));
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

function sendFileToServer(filePath) {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    axios.post('http://endereco-do-seu-servidor/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    }).then(response => {
        console.log('Arquivo enviado com sucesso:', response.data);
    }).catch(error => {
        console.error('Erro ao enviar arquivo:', error);
    });
}

function setupFileWatcher() {
    const uploadsPath = path.join(app.getPath('desktop'), 'Uploads');
    if (!fs.existsSync(uploadsPath)) {
        fs.mkdirSync(uploadsPath);
    }

    const watcher = chokidar.watch(uploadsPath, { persistent: true });

    watcher.on('add', (filePath) => {
        // if (path.extname(filePath).toLowerCase() === '.pdf') {
        sendFileToServer(filePath);
        // } else {
        //     console.log('Arquivo não é um PDF, ignorado.');
        // }
    });
}

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
