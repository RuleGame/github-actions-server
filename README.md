# GitHub Actions Server

A Node.js server that listens for POST requests that includes a zip file, and the server will unzip the file into the destination folder specified by the configuration file.

## Deployment instructions

1. Install Node.js

2. Clone this repository to any directory in the Sapir (or any server to download the files in).

    ```sh
    git clone https://github.com/kmui2/github-actions-server
    ```

3. Install the dependencies using Node Package Manager

    ```
    npm install
    ```

4. Create a `.secret` file on the top directory of the cloned repository. Add any unencrypted key as the secret.

5. Also create a `config.json` file on the top directory. The contents follow the below template (Replace `[project]` with the name of the project, and replace `[path]` with the **parent** folder of the upload destination.)

    ```json
    {
        "[project]": {
            "basePath": "[path]"
        }
    }
    ```

6. Generate self-signed SSL certificate on the top level directory.

    ```sh
    openssl genrsa -des3 -out server.key 1024 # Give any pass phrase
    openssl req -new -key server.key -out server.csr # Enter pass phrase from previous step and leave everything else blank
    cp server.key server.key.org
    openssl rsa -in server.key.org -out key.pem # Enter pass phrase
    openssl x509 -req -days 9999 -in server.csr -signkey key.pem -out cert.pem
    rm server.key.org server.key
    ```

7. Run the server using the PM2 script in [`package.json`](./package.json).

    ```sh
    npm run pm2:start
    ```

## Editing a Folder for Upload for `game-data`

See the respective [README section](https://github.com/lupyanlab/Rule-Game-game-data/blob/master/README.md#editing-folder-contents) for Rule Game `game-data` repository.
## Adding a New Folder to Upload for `game-data`

See the respective [README section](https://github.com/lupyanlab/Rule-Game-game-data/blob/master/README.md#adding-a-new-folder) for Rule Game `game-data` repository.

## Manually Uploading a Folder

1. Zip the folder to upload

2. Send a POST request with the secret and build as URL encoded parameters. 

    For CURL, replace 
    - `[secret]` with the secret stored in the `.secret` file
    - `[file]` with the name of the zip file
    - `[name]` with the name of the project listed in `config.json`
    - `[url]` with the URL of the server it is running

    ```sh
    curl --fail -k -F "secret=[secret]" -F "build=@[file]" "[url]/[name]/upload"
    ```

    Example for the `boards` folder:

    ```sh
    curl --fail -k -F "secret=mysecret" -F "build=@boards.zip" "https://sapir.psych.wisc.edu:7189/boards/upload"
    ```

## How it Works

The server runs in Sapir (or any server) and watches for POST requests to the endpoint `/:project/upload` where `:project` is the project name. The full URL for Sapir is `https://sapir.psych.wisc.edu:7189/:project/upload` where `https://sapir.psych.wisc.edu:7189/` is the base URL. The base URL is dependent on the server where it is deployed to.

The server requires a SSL certification and a private key named `cert.pem` and `key.pem` respectively. Details to generate them are in the [Deployment Instructions](#deployment-instructions) section. This enables HTTPS for the endpoint.

The configuration file `config.json` contains


The server also requires a configuration file named `config.json` that follows the below shape:

```ts
type Config = {
    [project: string]: {
        basePath: string,
    }
}
```
Each project is also the folder name of the folder the server will unzip to. Each project contains a single `basePath` which is the **parent folder** of the folder path where the server will unzip the uploaded file. For example, the `project` could be `boards` and the `basePath` could be `/opt/tomcat/game-data`, and this will result in a folder uploaded as `/opt/tomcat/game-data/boards`.

The `.secret` file contains the key that each upload must include in its form data. It adds a bit of security to the endpoint so that each request must provide the key in order to get authorized to upload the file to the folder destination.

There is also a `backups` folder on the top level directory created to move an existing destinalnation folder before replacing the destination folder with the unzipped folder contents. This allows a proper backup in case there happens to be an error somewhere while unzipping the file to the folder destination. After the file is successfully unzipped, the backup is deleted. Otherwise, the backup will be moved right back to where it was previously if the unzip failed.
