
import dotenv from 'dotenv';
dotenv.config({path: '.env'});

import express from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import https from 'https';
import fs from 'fs';

import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';

const GOOGLE_API_TOKEN_JSON_PATH = path.join(process.cwd(), process.env.GOOGLE_API_TOKEN_JSON);



// define necessary Google Sheet API callbacks

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.promises.readFile(process.env.GOOGLE_API_TOKEN_JSON);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    console.warn('loadSavedCredentialsIfExist() failed');
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.promises.readFile(process.env.GOOGLE_API_CREDENTIALS_JSON);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(GOOGLE_API_TOKEN_JSON_PATH, payload, () => {});
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    keyfilePath: `${process.cwd()}/${process.env.GOOGLE_API_CREDENTIALS_JSON}`,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}




// create express app

const app = express();
app.use(cors());

app.use(express.static('public'));
//app.use(express.static('../frontend/static'));
//app.use(express.static('./node_modules'));

const port = process.env.PORT || 5000;
const protocol = process.env.USE_HTTPS === "TRUE" ? https : http;

app.post('/fetch_c3tree_data_from_google_sheet', (req, res) => {

  if(process.env.OFFLINE_MODE === 'TRUE') { // TODO: change to csv
    const data = JSON.parse(fs.readFileSync('../data/c3Tree-demoData - collapsableRadialTreeData.json', 'utf8'));
    res.json({ 
      message: `Success! # rows: ${data.length}`, 
      data: data,
    })
  } else {
    authorize()
      .then((auth) => {
        const sheets = google.sheets({version: 'v4', auth});

        const mainDataSheet = sheets.spreadsheets.values.get({
          //spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          spreadsheetId: '11tCraeH710zGQ0-OhJ-8wwcrZRbRRvSWrHO-llYueuM',
          //range: 'collapsableRadialTreeData',
          range: 'NCS & LHW Projects',
        });

        const metaDataSheet = sheets.spreadsheets.values.get({
          spreadsheetId: '11tCraeH710zGQ0-OhJ-8wwcrZRbRRvSWrHO-llYueuM',
          range: 'MetaData',
        });

        Promise.all([mainDataSheet, metaDataSheet]).then(([mainDataSheet, metaDataSheet]) => {
          const mainDataRows = mainDataSheet.data.values;
          if (!mainDataRows || mainDataRows.length === 0) {
            res.json({ 
              message: 'Failure! No data / no rows returned :-(', 
              data: null,
            })
          }

          res.json({ 
            message: `Success! # mainDataSheet: ${mainDataRows.length}`, 
            mainData: mainDataRows,
            metaData: metaDataSheet.data.values
          })
        }).catch((err) => {
          console.warn(err);
          res.json({ 
            message: 'Failure! Something went wrong with the Google sheet API request.', 
            data: null,
          });
        });      
      }).catch((err) => console.warn(err));
  }
});

app.get('*', (req, res) => {
   res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

/*app.get("*", (req, res) => {
  console.log("serving /");
  res.writeHead(200, { "content-type": "text/html" })
  fs.createReadStream("public/templates/index.html").pipe(res)
});*/

const options = {};

if(process.env.USE_HTTPS === 'TRUE' && process.env.SSL_KEY_FILE !== '' && process.env.SSL_CERT_FILE !== '') {
  options.key =  fs.readFileSync(process.env.SSL_KEY_FILE);
  options.cert = fs.readFileSync(process.env.SSL_CERT_FILE);
}

protocol.createServer(options, app).listen(port, () => {
  console.log(`Server is running on port ${port} using ${process.env.USE_HTTPS === 'TRUE' ? 'https' : 'http'}.`);
});