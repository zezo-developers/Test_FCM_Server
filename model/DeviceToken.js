import mongoose from "mongoose";

const Device_TokensSchema = new mongoose.Schema({
    device_token: {
        type: String,
        required: true,
        unique: true
    },
});

const Device_Tokens = mongoose.model("Device_Tokens", Device_TokensSchema);
export default Device_Tokens;

