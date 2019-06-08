"use strict";

const crypto = require("crypto");

//console.log(crypto.getCiphers());
//console.log(crypto.getHashes());

const mySecret = "Secret";
const mySalt = crypto.randomBytes(16);
const myKey = crypto.pbkdf2Sync(mySecret, mySalt, 100000, 32, "md5");

const cipher = crypto.createCipher("aes-256-cbc", mySecret);

let encrypted = cipher.update("Hier kommt der Text", "utf8", "hex");
encrypted += cipher.final("hex");

console.log("encrypted:", encrypted);

const decipher = crypto.createDecipher("aes-256-cbc", mySecret);

let decrypted = decipher.update(encrypted, "hex", "utf8");
decrypted += decipher.final("utf8");

console.log("decrypted:", decrypted);

const cipheriv = crypto.createCipheriv("aes-256-cbc", myKey, mySalt);

let encryptediv = cipheriv.update("Hier kommt der Text", "utf8", "hex");
encryptediv += cipheriv.final("hex");

console.log("encryptediv:", encryptediv);

const decipheriv = crypto.createDecipheriv("aes-256-cbc", myKey, mySalt);

let decryptediv = decipheriv.update(encryptediv, "hex", "utf8");
decryptediv += decipheriv.final("utf8");

console.log("decryptediv:", decryptediv);
