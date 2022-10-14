const mongoose = require("mongoose");

const ProfilesSchema = new mongoose.Schema(
    {
        created: { type: Date, required: true },
        accountId: { type: String, required: true, unique: true },
        profiles: { type: Object, required: true }
    },
    {
        collection: "profiles"
    }
)

const model = mongoose.model('ProfilesSchema', ProfilesSchema);

module.exports = model;