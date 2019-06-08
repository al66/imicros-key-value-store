"use strict";

const crypto = require("crypto");


// this will be the docker secret for the container
let secret = "service secret";
console.log("service secret:", secret);

// this will be the static encryption key and should be kept very very save
let sek = crypto.randomBytes(16).toString("hex");
console.log("SEK:", sek);

// this will be the encrypted SEK stored at the key manager (never together with the secret or the SEK itself)
const cipher = crypto.createCipher("aes-256-cbc", secret);
let encrypted = cipher.update(sek, "utf8", "hex");
encrypted += cipher.final("hex");
console.log("encrypted SEK :", encrypted);
