const express = require("express");
const app = express.Router();

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");

app.get("/lightswitch/api/service/Fortnite/status", verifyClient, async (req, res) => {
    var banned = false;

    if (req.user) banned = req.user.banned;

    res.json({
        "serviceInstanceId": "fortnite",
        "status": "UP",
        "message": "Fortnite is online",
        "maintenanceUri": null,
        "overrideCatalogIds": [
          "a7f138b2e51945ffbfdacc1af0541053"
        ],
        "allowedActions": [],
        "banned": banned,
        "launcherInfoDTO": {
          "appName": "Fortnite",
          "catalogItemId": "4fe75bbc5a674f4f9b356b5c90567da5",
          "namespace": "fn"
        }
    });
})

app.get("/lightswitch/api/service/bulk/status", verifyClient, async (req, res) => {
    var banned = false;

    if (req.user) banned = req.user.banned;

    res.json(
      [{
          "serviceInstanceId": "fortnite",
          "status": "UP",
          "message": "fortnite is up.",
          "maintenanceUri": null,
          "overrideCatalogIds": [
              "a7f138b2e51945ffbfdacc1af0541053"
          ],
          "allowedActions": [
              "PLAY",
              "DOWNLOAD"
          ],
          "banned": banned,
          "launcherInfoDTO": {
              "appName": "Fortnite",
              "catalogItemId": "4fe75bbc5a674f4f9b356b5c90567da5",
              "namespace": "fn"
          }
      }]
    )
})

module.exports = app;