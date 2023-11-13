"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nexus_1 = require("@whatsgood/nexus");
const fetch_1 = require("@whatsgood/nexus/fetch");
// TODO: add config alerts to indicate that the key access is incomplete
// TODO: add onboarding & UX. (setup admin access, login, etc)
// TODO: add tests for the worker
exports.default = {
    async fetch(request, env) {
        const nexus = new nexus_1.Nexus({
            env,
        });
        const requestHandler = new fetch_1.RequestHandler(nexus, request);
        return requestHandler.handle();
    },
};
