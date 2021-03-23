import express from 'express';
import fileUpload from 'express-fileupload';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import unzipper from 'unzipper';

type Config = {
    [project: string]: {
        basePath: string,
    }
}

const PORT = 7189;

const configFilePath = path.join(__dirname, '..', 'config.json');
const secretFilePath = path.join(__dirname, '..', '.secret');
const backupsFolderPath = path.join(__dirname, '..', 'backups');


const isCanonicalPath = (path_: string) => path.resolve(path_) === path.normalize(path_)

const app = express();
app.use(fileUpload());
app.use(morgan('combined'));

app.use(express.urlencoded({
    extended: true
}))

/**
 * Unzips the uploaded zip file and creates/replaces the project's folder contents with the zip file's name.
 * Project and zip file name must be able to produce canonical paths.
 */
app.post<{project: string}, string, { secret: string }>('/:project/upload', async (req, res) => {
    const secret = await fs.promises.readFile(secretFilePath, 'utf8');
    if (req.body.secret !== secret) {
        return res.status(401).send('Unauthorized');
    }
    
    const configFile: Config = JSON.parse(await fs.promises.readFile(configFilePath, 'utf8'));
    const { project } = req.params;

    if (!(project in configFile)) {
        return res.status(400).send(`Project ${project} is missing in config.json`);
    }
    
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No file was uploaded.');
    }
    
    const { basePath } = configFile[project];
    
    const zippedFile = req.files.build;
    const zippedFileName = zippedFile.name.replace('.zip', '');
    
    const folderPath = path.join(basePath, zippedFileName);
    if (!isCanonicalPath(folderPath)) {
        return res.status(400).send(`Bad folder path created using the uploaded filename: ${folderPath}`);
    }

    // Move old folder path to project backup folder
    if (fs.existsSync(folderPath)){
        // Create project backup folder
        const dateTime = new Date();
        const projectBackupFolderPath = path.join(backupsFolderPath, project);
        if (!isCanonicalPath(projectBackupFolderPath)) {
            console.error(`The project in the config file has a bad format: ${projectBackupFolderPath}`);
            return res.status(500).send(`Bad project folder path created using the uploaded filename: ${projectBackupFolderPath}`);
        }
        if (!fs.existsSync(projectBackupFolderPath)) {
            await fs.promises.mkdir(projectBackupFolderPath, { recursive: true })
        }

        const dateTimeFormat = `${dateTime.getFullYear()}-${dateTime.getMonth() + 1}-${dateTime.getDate()}_${dateTime.getHours()}-${dateTime.getMinutes()}-${dateTime.getSeconds()}`;
        const backupFolderName = `${zippedFileName}__${dateTimeFormat}`;

        const backupFolderPath = path.join(projectBackupFolderPath, backupFolderName);
        await fs.promises.rename(folderPath, backupFolderPath)
    }
    
    // Extract zip file to project folder
    const directory = await unzipper.Open.buffer(zippedFile.data);
    await directory.extract({ path: folderPath });
    
    res.send('Files uploaded!');
});

app.listen(PORT, () => console.log(`App listening on port ${PORT}`));
