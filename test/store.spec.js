"use strict";

const { ServiceBroker } = require("moleculer");
const { Store } = require("../index");
const { AuthNotAuthenticated, AuthNotAuthorized } = require("imicros-auth").Errors;

const timestamp = Date.now();

describe("Test store service", () => {

    let broker, service;
    beforeAll(() => {
        broker = new ServiceBroker({
            logger: console,
            logLevel: "debug"
        });
        service = broker.createService(Store, Object.assign({ 
            name: "store", 
            settings: { 
                redis: { 
                    host: "dummy",
                    port: "6379"
                } 
            } 
        }));
        return broker.start();
    });

    afterAll(async (done) => {
        await broker.stop().then(() => done());
    });
    
    describe("Test create service", () => {

        it("it should be created", () => {
            expect(service).toBeDefined();
        });

    });

    describe("Test set and get", () => {

        let opts;
        
        it("it should set key", () => {
            opts = { meta: { user: { id: `1-${timestamp}` , email: `1-${timestamp}@host.com` }, access: [`1-${timestamp}`, `2-${timestamp}`] } };
            let params = {
                key: `key1-${timestamp}`,
                owner: `2-${timestamp}`,
                value: { 
                    prop1: "Property 1",
                    prop2: 2
                }
            };
            return broker.call("store.set", params, opts).then(res => {
                expect(res).toBeDefined();
                console.log(res);
                expect(res.key).toBeDefined();
            });
            
        });
        
        it("it should get key", async () => {
            opts = { meta: { user: { id: `1-${timestamp}` , email: `1-${timestamp}@host.com` }, access: [`1-${timestamp}`, `2-${timestamp}`] } };
            let params = {
                key: `key1-${timestamp}`,
                owner: `2-${timestamp}`,
            };
            let  value = { 
                prop1: "Property 1",
                prop2: 2
            };
            await broker.call("store.get", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(expect.objectContaining(value));
            });
            
        });
        
        it("it should throw error not authenticated", async () => {
            opts = { meta: { user: {} } };
            let params = {
                key: `key1-${timestamp}`,
                owner: `2-${timestamp}`,
            };
            expect.assertions(1);
            await broker.call("store.get", params, opts).catch(err => {
                expect(err instanceof AuthNotAuthenticated).toBe(true);
            });
        });
        
        it("it should throw error not authorized", async () => {
            opts = { meta: { user: { id: `1-${timestamp}` , email: `1-${timestamp}@host.com` }, access: [`1-${timestamp}`, `3-${timestamp}`] } };
            let params = {
                key: `key1-${timestamp}`,
                owner: `2-${timestamp}`,
            };
            expect.assertions(1);
            await broker.call("store.get", params, opts).catch(err => {
                expect(err instanceof AuthNotAuthorized).toBe(true);
            });
        });
        
    });
 
});