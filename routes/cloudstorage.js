const express = require("express");
const app = express.Router();
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");
const functions = require("../structs/functions.js");

app.get("/fortnite/api/cloudstorage/system", verifyClient, async (req, res) => {
    const memory = functions.GetVersionInfo(req);

    if (memory.build >= 9.40 && memory.build <= 10.40) {
        return res.status(404).end();
    }

    const dir = path.join(__dirname, "..", "CloudStorage")
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

    res.json(CloudFiles)
})

app.get("/fortnite/api/cloudstorage/system/:file", verifyClient, async (req, res) => {
    const file = path.join(__dirname, "..", "CloudStorage", req.params.file);

    if (fs.existsSync(file)) {
        const ParsedFile = fs.readFileSync(file);

        return res.status(200).send(ParsedFile).end();
    } else {
        res.status(200);
        res.end();
    }
})

app.get("/fortnite/api/cloudstorage/user/*/*", verifyToken, async (req, res) => {
    res.status(200).end();
})

app.get("/fortnite/api/cloudstorage/user/*", verifyToken, async (req, res) => {
    res.json([]);
})

app.put("/fortnite/api/cloudstorage/user/*/*", verifyToken, async (req, res) => {
    res.status(204).end();
})

module.exports = app;