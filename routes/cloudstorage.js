const express = require("express");
const app = express.Router();
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");
const functions = require("../structs/functions.js");

let seasons = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

app.get("/fortnite/api/cloudstorage/system", (req, res) => {
    const dir = path.join(__dirname, "..", "CloudStorage");

    let CloudFiles = [];

    fs.readdirSync(dir).forEach(name => {
        if (name.toLowerCase().endsWith(".ini")) {
            const ParsedFile = fs.readFileSync(path.join(dir, name)).toString();
            const ParsedStats = fs.statSync(path.join(dir, name));

            CloudFiles.push({
                "uniqueFilename": name,
                "filename": name,
                "hash": crypto.createHash('sha1').update(ParsedFile).digest('hex'),
                "hash256": crypto.createHash('sha256').update(ParsedFile).digest('hex'),
                "length": ParsedFile.length,
                "contentType": "application/octet-stream",
                "uploaded": ParsedStats.mtime,
                "storageType": "S3",
                "storageIds": {},
                "doNotCache": true
            });
        }
    });

    res.json(CloudFiles);
});

app.get("/fortnite/api/cloudstorage/system/:file", (req, res) => {
    const file = path.join(__dirname, "..", "CloudStorage", req.params.file);

    if (fs.existsSync(file)) return res.status(200).send(fs.readFileSync(file));

    res.status(200).end();
});

app.get("/fortnite/api/cloudstorage/user/*/:file", verifyToken, (req, res) => {
    let clientSettingsPath = path.join(__dirname, "..", "ClientSettings", req.user.accountId);
    if (!fs.existsSync(clientSettingsPath)) fs.mkdirSync(clientSettingsPath);

    if (req.params.file.toLowerCase() != "clientsettings.sav") return res.status(200).end();

    const memory = functions.GetVersionInfo(req);
    if (!seasons.includes(memory.season)) return res.status(200).end();

    let file = path.join(clientSettingsPath, `ClientSettings-${memory.season}.Sav`);

    if (fs.existsSync(file)) return res.status(200).send(fs.readFileSync(file));
    
    res.status(200).end();
});

app.get("/fortnite/api/cloudstorage/user/:accountId", verifyToken, (req, res) => {
    let clientSettingsPath = path.join(__dirname, "..", "ClientSettings", req.user.accountId);
    if (!fs.existsSync(clientSettingsPath)) fs.mkdirSync(clientSettingsPath);

    const memory = functions.GetVersionInfo(req);
    if (!seasons.includes(memory.season)) return res.json([]);
    
    let file = path.join(clientSettingsPath, `ClientSettings-${memory.season}.Sav`);

    if (fs.existsSync(file)) {
        const ParsedFile = fs.readFileSync(file, 'latin1');
        const ParsedStats = fs.statSync(file);

        return res.json([{
            "uniqueFilename": "ClientSettings.Sav",
            "filename": "ClientSettings.Sav",
            "hash": crypto.createHash('sha1').update(ParsedFile).digest('hex'),
            "hash256": crypto.createHash('sha256').update(ParsedFile).digest('hex'),
            "length": Buffer.byteLength(ParsedFile),
            "contentType": "application/octet-stream",
            "uploaded": ParsedStats.mtime,
            "storageType": "S3",
            "storageIds": {},
            "accountId": req.user.accountId,
            "doNotCache": false
        }]);
    }
    
    res.json([]);
});

app.put("/fortnite/api/cloudstorage/user/*/:file", verifyToken, getRawBody, (req, res) => {
    if (Buffer.byteLength(req.rawBody) >= 400000) return res.status(403).json({ "error": "File size must be less than 400kb." });

    let clientSettingsPath = path.join(__dirname, "..", "ClientSettings", req.user.accountId);
    if (!fs.existsSync(clientSettingsPath)) fs.mkdirSync(clientSettingsPath);

    if (req.params.file.toLowerCase() != "clientsettings.sav") return res.status(204).end();

    const memory = functions.GetVersionInfo(req);
    if (!seasons.includes(memory.season)) return res.status(204).end();

    let file = path.join(clientSettingsPath, `ClientSettings-${memory.season}.Sav`);
    fs.writeFileSync(file, req.rawBody, 'latin1');

    res.status(204).end();
});

function getRawBody(req, res, next) {
    if (req.headers["content-length"]) {
        if (Number(req.headers["content-length"]) >= 400000) return res.status(403).json({ "error": "File size must be less than 400kb." });
    }

    // Get raw body in encoding latin1 for ClientSettings
    try {
        req.rawBody = "";
        req.setEncoding("latin1");

        req.on("data", (chunk) => req.rawBody += chunk);
        req.on("end", () => next());
    } catch {
        res.status(400).json({ "error": "Something went wrong while trying to access the request body." });
    }
}

module.exports = app;
