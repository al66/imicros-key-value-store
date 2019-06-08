"use strict";

const { ServiceBroker } = require("moleculer");
const { Store } = require("../index");

const timestamp = Date.now();

// mock keys service
const Keys = {
    name: "keys",
    actions: {
        getOek: {
            handler(ctx) {
                if (!ctx.params || !ctx.params.service) throw new Error("Missing service name");
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


describe("Test store service", () => {

    let broker, service, keyService;
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
            keyService = await broker.createService(Keys);
            service = await broker.createService(Store, Object.assign({ 
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
            await broker.start();
            expect(service).toBeDefined();
            expect(keyService).toBeDefined();
        });

    });
    
    describe("Test set and get", () => {

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
        
        it("it should set 1. key 1. owner", () => {
            let key = `res1-${timestamp}`;
            let params = {
                key: key,
                value: { 
                    owner: 1,
                    prop1: "Property 1",
                    prop2: 2
                }
            };
            return broker.call("store.set", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.key).toBeDefined();
            });
            
        });
        
        it("it should set 1. key 2. owner", () => {
            opts.meta.acl.owner.id = `g2-${timestamp}`;
            let key = `res1-${timestamp}`;
            let params = {
                key: key,
                value: { 
                    owner: 2,
                    prop1: "Property 1",
                    prop2: 2
                }
            };
            return broker.call("store.set", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.key).toBeDefined();
            });
            
        });
        
        it("it should set 2. key 1. owner", () => {
            let key = `res2-${timestamp}`;
            let params = {
                key: key,
                value: { 
                    owner: 1,
                    prop1: "Property 1",
                    prop2: 3
                }
            };
            return broker.call("store.set", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.key).toBeDefined();
            });
            
        });
        
        it("it should get 1. key 1. owner", async () => {
            let key = `res1-${timestamp}`;
            let params = {
                key: key
            };
            let value = { 
                owner: 1,
                prop1: "Property 1",
                prop2: 2
            };
            await broker.call("store.get", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(expect.objectContaining(value));
            });
            
        });
        
        it("it should get 1. key 2. owner", async () => {
            opts.meta.acl.owner.id = `g2-${timestamp}`;
            let key = `res1-${timestamp}`;
            let params = {
                key: key
            };
            let value = { 
                owner: 2,
                prop1: "Property 1",
                prop2: 2
            };
            await broker.call("store.get", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(expect.objectContaining(value));
            });
            
        });
        
        it("it should get 2. key 1. owner", async () => {
            let key = `res2-${timestamp}`;
            let params = {
                key: key
            };
            let value = { 
                owner: 1,
                prop1: "Property 1",
                prop2: 3
            };
            await broker.call("store.get", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(expect.objectContaining(value));
            });
            
        });
        
    });
 
    describe("Test inventory", () => {

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
        
        it("it should return inventory", () => {
            let params = {};
            return broker.call("store.inventory", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toContain(`res1-${timestamp}`);
            });
            
        });
        
    });
 
    describe("Test admin", () => {

        let opts;
        
        beforeEach(() => {
            opts = { 
                meta: { 
                    acl: {
                        service: "admin"
                    }, 
                    user: { 
                        id: `1-${timestamp}` , 
                        email: `1-${timestamp}@host.com` }, 
                    access: [`1-${timestamp}`, `2-${timestamp}`] 
                } 
            };
        });
        
        it("it should return owner list", () => {
            let params = {};
            return broker.call("store.owners", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toContain(`g1-${timestamp}`);
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