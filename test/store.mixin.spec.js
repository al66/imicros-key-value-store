"use strict";

const { ServiceBroker } = require("moleculer");
const { Store } = require("../index");
const { Mixin } = require("../index");

const timestamp = Date.now();

// mock keys service
const Keys = {
    name: "keys",
    actions: {
        getOek: {
            handler(ctx) {
                if (!ctx.params || !ctx.params.service) throw new Error("Missing service name");
                if (!ctx.meta || !ctx.meta.acl.owner.id) {
                    return {
                        id: "service",
                        key: "serviceSecret"
                    };
                }
                if ( ctx.params.id == "prev" ) {
                    return {
                        id: "prev",
                        key: "myPreviousSecret"
                    };    
                }
                return {
                    id: "current",
                    key: "mySecret"
                };
            }
        }
    }
};

const MixinExample = {
    name: "MixinExample",
    settings: {
        store: {
            keyService: "keys",
            storeService: "store"
        }
    },
    mixins: [Mixin],
    actions: {
        set: {
            async handler(ctx) {
                let result = await this.set({ ctx: ctx, key: ctx.params.key, value: ctx.params.value});
                return result;
            }
        },
        get: {
            async handler(ctx) {
                let result = await this.get({ ctx: ctx, key: ctx.params.key});
                return result;
            }
        }
    }
};

describe("Test store service", () => {

    let broker, mixinService, storeService, keyService;
    beforeAll(() => {
    });
    
    afterAll(async () => {
    });
    
    describe("Test create service", () => {

        it("it should start the broker", async () => {
            broker = new ServiceBroker({
                logger: console,
                logLevel: "info" //"debug"
            });
            storeService = await broker.createService(Store, Object.assign({ 
                name: "store", 
                settings: { 
                    redis: {
                        port: process.env.REDIS_PORT || 6379,
                        host: process.env.REDIS_HOST || "127.0.0.1",
                        password: process.env.REDIS_AUTH || "",
                        db: process.env.REDIS_DB || 0,
                    }
                },
                dependencies: ["keys"]
            }));
            mixinService = await broker.createService(MixinExample);
            keyService = await broker.createService(Keys);
            await broker.start();
            expect(storeService).toBeDefined();
            expect(keyService).toBeDefined();
            expect(mixinService).toBeDefined();
        });

    }); 

    describe ("Test mixin", () => {

        let opts;
        
        beforeEach(() => {
            opts = { 
                meta: { 
                    acl: {
                        accessToken: "this is the access token",
                        owner: {
                            id: `g1-${timestamp}`
                        }
                    }, 
                    user: { 
                        id: `1-${timestamp}` , 
                        email: `1-${timestamp}@host.com` }, 
                    access: [`1-${timestamp}`, `2-${timestamp}`] 
                } 
            };
        });
        
        
        it("it should store key/value pair", async () => {
            let key = `k1${timestamp}`;
            let value = `v1${timestamp}`;
            let params = {
                key: key,
                value: value
            };
            return broker.call("MixinExample.set", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(true);
            });
        });

        it("it should retrieve value by given key", async () => {
            let key = `k1${timestamp}`;
            let value = `v1${timestamp}`;
            let params = {
                key: key
            };
            return broker.call("MixinExample.get", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(value);
            });
        });
        
    });    
    
    describe("Test stop broker", () => {
        it("should stop the broker", async () => {
            expect.assertions(1);
            await broker.stop();
            expect(broker).toBeDefined();
        });
    });    
        
});