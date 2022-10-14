const mongoose = require("mongoose");

const FriendsSchema = new mongoose.Schema(
    {
        created: { type: Date, required: true },
        accountId: { type: String, required: true, unique: true },
        list: { type: Object, default: { accepted: [], incoming: [], outgoing: [], blocked: [] } }
    },
    {
        collection: "friends"
    }
)

const model = mongoose.model('FriendsSchema', FriendsSchema);

module.exports = model;