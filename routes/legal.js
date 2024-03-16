const express = require("express")
const app = express.Router();
const fs = require("fs")
const eulaJson = JSON.parse(fs.readFileSync('./responses/SharedAgreements.json', 'utf8'));

app.get("/eulatracking/api/shared/agreements/fn", async (req, res) => {
    res.json(eulaJson);
});

app.get("/eulatracking/api/public/agreements/fn/account/:accountId", async (req, res) => {
    res.status(204).send();
}); 

module.exports = app;