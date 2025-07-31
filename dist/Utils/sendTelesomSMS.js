"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTelesomSMS = sendTelesomSMS;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
/**
 * Sends an SMS via Telesom API.
 *
 * @param to - Recipient phone number (e.g., +2526xxxxxxx)
 * @param message - Message to send
 * @returns Promise<string> - The response from Telesom API
 */
function sendTelesomSMS(to, message) {
    return __awaiter(this, void 0, void 0, function* () {
        const from = process.env.TELESOM_SENDER_ID;
        const username = process.env.TELESOM_USERNAME;
        const password = process.env.TELESOM_PASSWORD;
        const key = process.env.TELESOM_API_KEY;
        const telesomUrl = process.env.TELESOM_URL;
        // Check if any required env variable is missing
        if (!from || !username || !password || !key || !telesomUrl) {
            throw new Error("Missing one or more Telesom configuration environment variables.");
        }
        const encodedMsg = encodeURIComponent(message);
        // Format date as dd/mm/yyyy
        const date = new Date().toLocaleDateString("en-GB").replace(/\//g, "/");
        // Create raw string for hashing
        const raw = `${username}|${password}|${to}|${encodedMsg}|${from}|${date}|${key}`;
        // Create MD5 hash and convert to uppercase
        const hashKey = crypto_1.default
            .createHash("md5")
            .update(raw)
            .digest("hex")
            .toUpperCase();
        // Prepare request body
        const params = new URLSearchParams({
            from,
            to,
            msg: encodedMsg,
            key: hashKey,
        });
        // Send POST request to Telesom
        const response = yield axios_1.default.post(telesomUrl, params.toString(), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });
        return response.data;
    });
}
