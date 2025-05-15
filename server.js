import dotenv from 'dotenv';
dotenv.config({path: '.env'});

import express from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import https from 'https';
import fs from 'fs';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';

const GOOGLE_API_TOKEN_JSON_PATH = path.join(process.cwd(), process.env.GOOGLE_API_TOKEN_JSON);
const GOOGLE_API_CREDENTIALS_SA = path.join(process.cwd(), process.env.GOOGLE_API_TOKEN_JSON);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


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

app.use(express.static('dist'));

const port = process.env.PORT || 5000;
const protocol = process.env.USE_HTTPS === "TRUE" ? https : http;

// TODO: Use offline mode as fallback if Google Sheet is unreachable
// TODO: Fix this to use BW1-DEV to load the Google Sheet
app.post('/fetch_c3tree_data_from_google_sheet', (req, res) => {

  if(process.env.OFFLINE_MODE === 'TRUE') { // TODO: change to csv
    //const data = JSON.parse(fs.readFileSync('../data/c3Tree-demoData - collapsableRadialTreeData.json', 'utf8'));
    const mainDataJSON = JSON.parse(fs.readFileSync('./data/c3Tree-datasheet - NCS & LHW Projects.json', 'utf8'));
    const metaDataJSON = JSON.parse(fs.readFileSync('./data/c3Tree-datasheet - MetaData.json', 'utf8'));

    const mainData = [];
    const metaData = [];

    mainData.push(Object.keys(mainDataJSON[0]));
    metaData.push(Object.keys(metaDataJSON[0]));

    mainDataJSON.slice(1).forEach((d) => mainData.push(Object.entries(d).map((entry) => entry[1])));
    metaDataJSON.slice(1).forEach((d) => metaData.push(Object.entries(d).map((entry) => entry[1])));

    res.json({ 
      message: `Success! # mainDataSheet: ${mainData.length}`, 
      mainData: mainData,
      metaData: metaData,
    });

  } else {
    authorize()
      .then((auth) => {
        const sheets = google.sheets({version: 'v4', auth});

        const mainDataSheet = sheets.spreadsheets.values.get({
          spreadsheetId: '11tCraeH710zGQ0-OhJ-8wwcrZRbRRvSWrHO-llYueuM',
          //range: 'NCS & LHW Projects',
          range: 'NCS & LHW ProjectsOLD2',
        });

        const metaDataSheet = sheets.spreadsheets.values.get({
          spreadsheetId: '11tCraeH710zGQ0-OhJ-8wwcrZRbRRvSWrHO-llYueuM',
          range: 'MetaData',
        });

        const introDataSheet = sheets.spreadsheets.values.get({
          spreadsheetId: '11tCraeH710zGQ0-OhJ-8wwcrZRbRRvSWrHO-llYueuM',
          range: 'Intro',
        });

        const teamDataSheet = sheets.spreadsheets.values.get({
          spreadsheetId: '11tCraeH710zGQ0-OhJ-8wwcrZRbRRvSWrHO-llYueuM',
          range: 'Team',
        });

        Promise.all([mainDataSheet, metaDataSheet, introDataSheet, teamDataSheet]).then(([
            mainDataSheet, 
            metaDataSheet,
            introDataSheet,
            teamDataSheet
          ]) => {
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
            metaData: metaDataSheet.data.values,
            introData: introDataSheet.data.values,
            teamData: teamDataSheet.data.values
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
   res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

const options = {};

if(process.env.USE_HTTPS === 'TRUE' && process.env.SSL_KEY_FILE !== '' && process.env.SSL_CERT_FILE !== '') {
  options.key =  fs.readFileSync(process.env.SSL_KEY_FILE);
  options.cert = fs.readFileSync(process.env.SSL_CERT_FILE);
}

protocol.createServer(options, app).listen(port, () => {
  console.log(`Server is running on port ${port} using ${process.env.USE_HTTPS === 'TRUE' ? 'https' : 'http'}.`);
});