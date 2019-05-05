/**
 * @license MIT, imicros.de (c) 2018 Andreas Leinen
 */
"use strict";

const { Authorized } = require("imicros-auth");
//const { AuthError } = require("imicros-auth").Errors;
const Redis = require("ioredis");

/** Actions */
// action set { key, value } => { key }
// action get { key } => { value }

module.exports = {
    name: "store.key.value",
    mixins: [Authorized],
    
    /**
     * Service settings
     */
    settings: {},

    /**
     * Service metadata
     */
    metadata: {},

    /**
     * Service dependencies
     */
    //dependencies: [],	

    /**
     * Actions
     */
    actions: {

        /**
         * set key
         * 
         * @actions
         * @param {String} key
         * @param {String} owner (group id)
         * @param {Object} value
         * 
         * @returns {String} key (with owner)
         */
        set: {
            params: {
                key: { type: "string" },
                owner: { type: "string", optional: true },
                value: { type: "object" }
            },			
            async handler(ctx) {
                this.isAuthorized({
                    meta: ctx.meta,
                    owner: this.getOwner({ key: ctx.params.key, owner: ctx.params.owner }), 
                    ressource: { key: ctx.params.key }
                });
                let key = this.encodeKey({ key: ctx.params.key, owner: ctx.params.owner });
                try {
                    await this.client.set(key, this.encodeValue({ value: ctx.params.value }));
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
         * @param {String} owner (group id)
         * 
         * @returns {Object} Decoded payload 
         */
        get: {
            params: {
                key: { type: "string" },
                owner: { type: "string", optional: true }
            },
            async handler(ctx) {
                this.isAuthorized({
                    meta: ctx.meta,
                    owner: this.getOwner({ key: ctx.params.key, owner: ctx.params.owner }),
                    ressource: { key: ctx.params.key }
                });
                let key = this.encodeKey({ key: ctx.params.key, owner: ctx.params.owner });
                let value;
                try {
                    let encoded = await this.client.get(key);
                    value = this.decodeValue({ encoded: encoded });
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
        
        getOwner ({ key, owner }) {
            if (owner) return owner;
            return key.split("~")[0];
        },
        
        getKey ({ key }) {
            let comp = key.split("~");
            if (comp.length > 1) {
                return comp[1];
            } else {
                return comp[0];
            }
        },
        
        encodeKey ({ key, owner}) {
            if ( owner && key.split("~")[0] !== owner ) return Buffer.from(key).toString("base64");
            return Buffer.from(owner + "~" + key).toString("base64");
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
                let redisOptions = this.settings.redis || {};
                this.client = new Redis(redisOptions);

                this.client.on("connect", () => {
                    this.connected = true;
                    this.logger.info("Connected to Redis");
                    resolve();
                });

                this.client.on("close", () => {
                    this.connected = false;
                    this.logger.warning("Disconnected from Redis");
                });

                this.client.on("error", (err) => {
                    this.connected = false;
                    this.logger.error("Redis redis error", err.message);
                    this.logger.debug(err);
                    if (!this.connected) reject(err);
                });
            });
        },
        
        async disconnect () {
            return new Promise((resolve) => {
                if (this.client && this.connected) {
                    this.client.on("close", resolve());
                    this.client.on("end", resolve());
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
    async created() {
        
        // connect to redis db
        this.redis = await this.connect();
        
    },

    /**
     * Service started lifecycle event handler
     */
    started() {},

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() {
        
        // disconnect from redis db
        await this.disconnect();
        
    }
    
};