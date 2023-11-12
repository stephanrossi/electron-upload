const { app, BrowserWindow, dialog, Tray, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

let mainWindow;
let tray;

function createWindow() {
    try {

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

        // Ícone na bandeja do sistema
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
    } catch (e) {
        console.log(e);
    }

    // Monitoramento da pasta Uploads com chokidar
    const uploadsPath = path.join(app.getPath('desktop'), 'Uploads');
    if (!fs.existsSync(uploadsPath)) {
        fs.mkdirSync(uploadsPath);
    }

    const watcher = chokidar.watch(uploadsPath, {
        persistent: true,
        // ignored: /^.*\.(?!(pdf)$)([^.]+)$/ // Ignorar tudo que não for PDF
    });

    watcher.on('add', filePath => {
        // if (path.extname(filePath) === '.pdf') {
        dialog.showOpenDialog(mainWindow, {
            title: 'Escolha onde mover o arquivo PDF',
            defaultPath: app.getPath('documents'),
            properties: ['openDirectory']
        }).then(result => {
            if (!result.canceled) {
                const destPath = path.join(result.filePaths[0], path.basename(filePath));
                fs.promises.rename(filePath, destPath)
                    .catch(error => {
                        dialog.showErrorBox('Erro ao mover arquivo', error.message);
                    });
            }
        });
        // } else {
        //     fs.promises.unlink(filePath);  // Remove o arquivo se não for PDF.
        //     return;
        // }
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
