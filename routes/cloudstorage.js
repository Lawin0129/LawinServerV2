const express = require("express");
const app = express.Router();
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");
const functions = require("../structs/functions.js");

app.get("/fortnite/api/cloudstorage/system", verifyClient, async (req, res) => {
    const dir = path.join(__dirname, "..", "CloudStorage");
    var CloudFiles = [];

    fs.readdirSync(dir).forEach(name => {
        if (name.toLowerCase().endsWith(".ini")) {
            const ParsedFile = fs.readFileSync(path.join(dir, name), 'utf-8');
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
            })
        }
    });

    res.json(CloudFiles);
});

app.get("/fortnite/api/cloudstorage/system/:file", verifyClient, async (req, res) => {
    const file = path.join(__dirname, "..", "CloudStorage", req.params.file);

    if (fs.existsSync(file)) {
        const ParsedFile = fs.readFileSync(file);

        return res.status(200).send(ParsedFile).end();
    } else {
        res.status(200);
        res.end();
    }
});

app.get("/fortnite/api/cloudstorage/user/*/:file", verifyToken, async (req, res) => {
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "Config", "config.json")).toString());

    if (!config.clientsettings.SaveFortniteSettings) return res.status(200).end();

    if (!fs.existsSync(path.join(__dirname, "..", "ClientSettings", req.user.accountId))) {
        fs.mkdirSync(path.join(__dirname, "..", "ClientSettings", req.user.accountId));
    }

    if (req.params.file.toLowerCase() != "clientsettings.sav") return res.status(404).json({ "error": "file not found" });
    res.type("application/octet-stream");

    const memory = functions.GetVersionInfo(req);

    if (memory.CL.length > 8) return res.status(403).json({ "error": "Build CL must be 8 figures or less."});

    let file = path.join(__dirname, "..", "ClientSettings", req.user.accountId, `ClientSettings-${memory.CL}.Sav`);

    if (fs.existsSync(file)) {
        const ParsedFile = fs.readFileSync(file);

        return res.status(200).send(ParsedFile).end();
    } else {
        res.status(200);
        res.end();
    }
});

app.get("/fortnite/api/cloudstorage/user/:accountId", verifyToken, async (req, res) => {
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "Config", "config.json")).toString());

    if (!config.clientsettings.SaveFortniteSettings) return res.json([]);

    if (!fs.existsSync(path.join(__dirname, "..", "ClientSettings", req.user.accountId))) {
        fs.mkdirSync(path.join(__dirname, "..", "ClientSettings", req.user.accountId));
    }

    const memory = functions.GetVersionInfo(req);

    if (memory.CL.length > 8) return res.status(403).json({ "error": "Build CL must be 8 figures or less."});
    
    let file = path.join(__dirname, "..", "ClientSettings", req.user.accountId, `ClientSettings-${memory.CL}.Sav`);

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
    } else {
        return res.json([]);
    }
});

app.put("/fortnite/api/cloudstorage/user/*/:file", verifyToken, getRawBody, async (req, res) => {
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "Config", "config.json")).toString());

    if (!config.clientsettings.SaveFortniteSettings) return res.status(204).end();

    if (Buffer.byteLength(req.rawBody) > 1000000) return res.status(403).json({ "error": "File size must be less than 1MB." });

    if (!fs.existsSync(path.join(__dirname, "..", "ClientSettings", req.user.accountId))) {
        fs.mkdirSync(path.join(__dirname, "..", "ClientSettings", req.user.accountId));
    }

    if (req.params.file.toLowerCase() != "clientsettings.sav") return res.status(404).json({ "error": "file not found" });

    const memory = functions.GetVersionInfo(req);

    if (memory.CL.length > 8) return res.status(403).json({ "error": "Build CL must be 8 figures or less."});

    let file = path.join(__dirname, "..", "ClientSettings", req.user.accountId, `ClientSettings-${memory.CL}.Sav`);

    fs.writeFileSync(file, req.rawBody, 'latin1');
    res.status(204).end();
});

function getRawBody(req, res, next) {
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "Config", "config.json")).toString());

    if (!config.clientsettings.SaveFortniteSettings) return next();

    if (req.headers["content-length"]) {
        if (Number(req.headers["content-length"]) > 1000000) return res.status(403).json({ "error": "File size must be less than 1MB." });
    }

    // Get raw body in encoding latin1 for ClientSettings
    req.rawBody = "";
    req.setEncoding("latin1");

    req.on("data", (chunk) => req.rawBody += chunk);
    req.on("end", () => next());
}

module.exports = app;
