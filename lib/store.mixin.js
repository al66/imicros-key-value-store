/**
 * @license MIT, imicros.de (c) 2019 Andreas Leinen
 */
"use strict";

const _ = require("lodash");

module.exports = {
    
    /**
     * Service settings
     */
    settings: {
        /*
        store: {
            service: "store"
        }
        */        
    },

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
    actions: {},

    /**
     * Events
     */
    events: {},

    /**
     * Methods
     */
    methods: {

        async set ({ ctx = null, key = null, value = null } = {}) {
            if ( !ctx || !key ) return false;
            
            let opts = { meta: ctx.meta };
            let params = null;

            // call store service
            params = {
                key: key,
                value: value
            };
            try {
                await this.broker.call(this.store.service + ".set", params, opts);
                this.logger.debug(`Value stored for key ${key}`, { key: key, meta: ctx.meta });
            } catch (err) {
                this.logger.error(`Failed to store key ${key}`, { key: key, meta: ctx.meta });
                throw err;
            }
            return true;
        },
        
        async get ({ ctx = null, key }) {
            if ( !ctx || !key ) throw new Error("missing parameter");
            
            let opts = { meta: ctx.meta };
            let params = null;
            let result = null;

            // call store service
            params = {
                key: key
            };
            try {
                result = await this.broker.call(this.store.service + ".get", params, opts);
                this.logger.debug(`Value retrieved for key ${key}`, { key: key, meta: ctx.meta });
            } catch (err) {
                this.logger.error(`Failed to retrieve value for key ${key}`, { key: key, meta: ctx.meta });
                throw err;
            }
            
            return result;            
        }
    },

    /**
     * Service created lifecycle event handler
     */
    created() {
        this.store = {
            service: _.get(this.settings, "store.service", "store" )
        };        
    },

    /**
     * Service started lifecycle event handler
     */
    async started() {},

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() {}
    
};