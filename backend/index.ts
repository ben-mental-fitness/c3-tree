const path = require("path");

const express = require("express");
const cors = require("cors");
const http = require("http");
const https = require("https");
const fs = require("fs");

const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");

const dotenv = require("dotenv");
dotenv.config({path: "../.env"});

const TOKEN_PATH = path.join(process.cwd(), process.env.GOOGLE_API_TOKEN_JSON);


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
    console.warn("loadSavedCredentialsIfExist() failed");
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
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload, () => {});
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
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    keyfilePath: `${process.cwd()}/${process.env.GOOGLE_API_CREDENTIALS_JSON}`,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}




// create express app

const app = express();

const corsOptions = {};
app.use(cors({}));

// TODO: Remove these once react is set up
app.use(express.static("../frontend/static"));
app.use(express.static("./node_modules"));

app.post("/fetch_c3tree_data_from_google_sheet", (req, res) => {

  if(process.env.OFFLINE_MODE === "TRUE") {
    const data = JSON.parse(fs.readFileSync("../data/c3Tree-demoData - collapsableRadialTreeData.json", "utf8"));
    res.json({ 
      message: `Success! # rows: ${data.length}`, 
      data: data,
    })
  } else {
    authorize()
      .then((auth) => {
        const sheets = google.sheets({version: "v4", auth});

        const sheetRes = sheets.spreadsheets.values.get({
          //spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
          spreadsheetId: "11tCraeH710zGQ0-OhJ-8wwcrZRbRRvSWrHO-llYueuM",
          range: "collapsableRadialTreeData!A:D",
        });

        sheetRes.then((sheetRes) => {
          const rows = sheetRes.data.values;
          if (!rows || rows.length === 0) {
            res.json({ 
              message: "Failure! No data / no rows returned :-(", 
              data: null,
            })
          }

          res.json({ 
            message: `Success! # rows: ${rows.length}`, 
            data: rows,
          })
        }).catch((err) => {
          console.warn(err);
          res.json({ 
            message: "Failure! Something went wrong with the Google sheet API request.", 
            data: null,
          });
        });      
      }).catch((err) => console.warn(err));
  }
});

app.get("/", (req, res) => {
  res.writeHead(200, { "content-type": "text/html" })
  fs.createReadStream("../frontend/index.html").pipe(res)
});

const options = {};

if(process.env.USE_HTTPS === "TRUE" && process.env.SSL_KEY_FILE !== "" && process.env.SSL_CERT_FILE !== "") {
  options.key =  fs.readFileSync(process.env.SSL_KEY_FILE);
  options.cert = fs.readFileSync(process.env.SSL_CERT_FILE);
}

const PORT = 8001;

(process.env.USE_HTTPS === "TRUE" ? https : http).createServer(options, app).listen(PORT, () => {
  console.log(`Server is running on port ${PORT} using ${process.env.USE_HTTPS === "TRUE" ? "https" : "http"}.`);
});