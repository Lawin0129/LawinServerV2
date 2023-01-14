const mongoose = require("mongoose");

const TokensSchema = new mongoose.Schema(
    {
        WARNING: { type: String, default: "DO NOT MODIFY" },
        accessTokens: { type: Array, default: [] },
        refreshTokens: { type: Array, default: [] },
        clientTokens: { type: Array, default: [] }
    },
    {
        collection: "tokens"
    }
)

const model = mongoose.model('TokensSchema', TokensSchema);

module.exports = model;