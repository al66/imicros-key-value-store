/**
 * @license MIT, imicros.de (c) 2018 Andreas Leinen
 */
"use strict";

const Redis = require("ioredis");
const _ = require("lodash");
const crypto = require("crypto");
const { AclMixin } = require("imicros-acl");

/** Actions */
// action set { key, value } => { key }
// action get { key } => { value }

module.exports = {
    name: "store.key.value",
    
    mixins: [AclMixin],
  
    /**
     * Service settings
     */
    settings: {
        /*
        keysService: "keys",
        adminServices: ["admin"]
        */        
    },

    /**
     * Service metadata
     */
    metadata: {},

    /**
     * Service dependencies
     */
    //dependencies: ["keys"],	

    /**
     * Actions
     */
    actions: {

        /**
         * set key
         * 
         * @actions
         * @param {String} key
         * @param {Object} value
         * 
         * @returns {Boolean} result
         */
        set: {
            params: {
                key: { type: "string" },
                value: { type: "any" }
            },			
            async handler(ctx) {
                let owner = this.getOwnerId({ ctx: ctx, abort: true });

                let value = this.encodeValue({ value: ctx.params.value });
                let meta = {};
                let oek;
                
                // get owner's encryption key
                try {
                    oek = await this.getKey({ ctx: ctx });
                } catch (err) {
                    throw new Error("failed to receive encryption keys");
                }
                
                // encrypt value
                let iv = crypto.randomBytes(16);
                try {
                    // hash encription key with iv
                    let key = crypto.pbkdf2Sync(oek.key, iv, 100000, 32, "md5");
                    // stored value = oek : iv : cyphertext
                    value = oek.id + ":" + iv.toString("hex") + ":" + this.encrypt({ value: value, secret: key, iv: iv });
                } catch (err) {
                    throw new Error("failed to encrypt");
                }
                
                // encode meta data, if any
                meta = this.encodeValue({ value: meta });
                
                let key = this.encodeKey({ key: ctx.params.key, owner: owner });
                try {
                    // add owner to owner list
                    await this.client.sadd("owners",owner);                
                    // add meta data to owner/key index
                    await this.client.hset(owner,ctx.params.key, meta); 
                    // add key/value
                    await this.client.set(key, value);  
                } catch (err) {
                    console.log(err);
                }
                return { key: key };
            }
        },

        /**
         * get key value
         * 
         * @actions
         * @param {String} key
         * 
         * @returns {Object} Decoded payload 
         */
        get: {
            params: {
                key: { type: "string" },
            },
            async handler(ctx) {
                let owner = this.getOwnerId({ ctx: ctx, abort: true });
                
                let encrypted, value, iv, oekId, oek;
                
                let key = this.encodeKey({ key: ctx.params.key, owner: owner });
                try {
                    // get value
                    value = await this.client.get(key);
                    // stored value = oek : iv : cyphertext
                    let valueParts = value.split(":");
                    oekId = valueParts.shift();
                    iv = Buffer.from(valueParts.shift(), "hex");
                    encrypted = valueParts.join();
                } catch (err) {
                    /* istanbul ignore next */
                    this.logger.error("Redis error", err.message);
                    throw new Error("failed to read value");
                }
                
                // get owner's encryption key
                try {
                    oek = await this.getKey({ ctx: ctx, id: oekId });
                } catch (err) {
                    throw new Error("failed to retrieve owner encryption key");
                }

                // decrypt value
                try {
                    // hash received key with salt
                    let key = crypto.pbkdf2Sync(oek.key, iv, 100000, 32, "md5");
                    value = this.decrypt({ encrypted: encrypted, secret: key, iv: iv });
                } catch (err) {
                    throw new Error("failed to decrypt");
                }

                return this.decodeValue({ encoded: value });
            }
        },

        /**
         * get inventory (all stored keys of an owner)
         * 
         * @actions
         * 
         * @returns {Array} keys 
         */
        inventory: {
            async handler(ctx) {
                let owner = this.getOwnerId({ ctx: ctx, abort: true });
                
                let value;
                try {
                    value = await this.client.hkeys(owner);
                } catch (err) {
                    /* istanbul ignore next */
                    this.logger.error("Redis error", err.message);
                }
                return value;
            }
        },

        /**
         * get all owners
         * 
         * @actions
         * 
         * @returns {Array} owners 
         */
        owners: {
            async handler(ctx) {
                let owner = this.getOwnerId({ ctx: ctx, abort: true });
                if (owner !== "admin") throw new Error("access not authorized");
                
                let value;
                try {
                    value = await this.client.smembers("owners");
                } catch (err) {
                    console.log(err);
                }
                return value;
            }
        }

    },

    /**
     * Events
     */
    events: {},

    /**
     * Methods
     */
    methods: {
        
        async getKey ({ ctx = null, id = null } = {}) {
            
            let result = {};
            
            // try to retrieve from keys service
            let opts;
            if ( ctx ) opts = { meta: ctx.meta };
            let params = { 
                service: this.name
            };
            if ( id ) params.id = id;
            
            // call key service and retrieve keys
            try {
                result = await this.broker.call(this.keys.service + ".getOek", params, opts);
                this.logger.debug("Got key from key service", { id: id });
            } catch (err) {
                this.logger.error("Failed to receive key from key service", { id: id, meta: ctx.meta });
                throw err;
            }
            if (!result.id || !result.key) throw new Error("Failed to receive key from service", { result: result });
            return result;
        },
        
        encrypt ({ value = ".", secret, iv }) {
            if ( iv ) {
                let cipher = crypto.createCipheriv("aes-256-cbc", secret, iv);
                let encrypted = cipher.update(value, "utf8", "hex");
                encrypted += cipher.final("hex");
                return encrypted;
            } else {
                let cipher = crypto.createCipher("aes-256-cbc", secret);
                let encrypted = cipher.update(value, "utf8", "hex");
                encrypted += cipher.final("hex");
                return encrypted;
            }
        },

        decrypt ({ encrypted, secret, iv }) {
            if ( iv ) {
                let decipher = crypto.createDecipheriv("aes-256-cbc", secret, iv);
                let decrypted = decipher.update(encrypted, "hex", "utf8");
                decrypted += decipher.final("utf8");
                return decrypted;            
            } else {
                let decipher = crypto.createDecipher("aes-256-cbc", secret);
                let decrypted = decipher.update(encrypted, "hex", "utf8");
                decrypted += decipher.final("utf8");
                return decrypted;            
            }
        },
        
        encodeKey ({ key, owner}) {
            if ( owner && key.split("~")[0] !== owner ) return Buffer.from(owner + "~" + key).toString("base64");
            return Buffer.from(key).toString("base64");
        },
        
        decodeKey ({ key }) {
            return Buffer.from(key, "base64").toString("ascii");
        },
        
        encodeValue ({value}) {
            return Buffer.from(JSON.stringify(value)).toString("base64");
        },
        
        decodeValue ({encoded}) {
            return JSON.parse(Buffer.from(encoded, "base64").toString("ascii"));
        },
        
        connect () {
            return new Promise((resolve, reject) => {
                /* istanbul ignore else */
                let redisOptions = this.settings.redis || {};   // w/o settings the client uses defaults: 127.0.0.1:6379
                this.client = new Redis(redisOptions);

                this.client.on("connect", (() => {
                    this.connected = true;
                    this.logger.info("Connected to Redis");
                    resolve();
                }).bind(this));

                this.client.on("close", (() => {
                    this.connected = false;
                    this.logger.info("Disconnected from Redis");
                }).bind(this));

                this.client.on("error", ((err) => {
                    this.logger.error("Redis redis error", err.message);
                    this.logger.debug(err);
                    /* istanbul ignore else */
                    if (!this.connected) reject(err);
                }).bind(this));
            });
        },        
        
        async disconnect () {
            return new Promise((resolve) => {
                /* istanbul ignore else */
                if (this.client && this.connected) {
                    this.client.on("close", () => {
                        resolve();
                    });
                    this.client.disconnect();
                } else {
                    resolve();
                }
            });
        }
        
    },

    /**
     * Service created lifecycle event handler
     */
    created() {
        
        // set keys service
        this.keys = {
            service: _.get(this.settings, "keysService", "keys" )
        };
            
    },

    /**
     * Service started lifecycle event handler
     */
    async started() {
        
        // connect to redis db
        await this.connect();
        
    },

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() {
        
        // disconnect from redis db
        await this.disconnect();
        
    }
    
};