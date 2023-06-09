let Util = require("./util");
let Usage = require('./usage');
const subscription = require('oci-osuborganizationsubscription');

class Subscription {

    #provider = "";
    #util = ""

    constructor(provider){
        this.#provider = provider;
        this.#util = new Util();
        return this;
    }

    /**
     * Obtem a lista de todos subscriptions
     */
    async listSubscriptions() {
        try {
            const client =  new subscription.OrganizationSubscriptionClient({authenticationDetailsProvider: this.#provider});

            const result = await client.listOrganizationSubscriptions({
                compartmentId: this.#provider.getTenantId(),
            });
            
            const { items } = result;

            const contracts = [];

            for (const contract of items) {
                const usage = new Usage(this.#provider)
                let currentSpent = await usage.listAccountOverviewFromTime(contract.timeStart, contract.timeEnd);
                contract.currentSpent = String(currentSpent);
                contracts.push(contract);
            }

            return result.items;
        } catch (error) {
            if (error.statusCode && error.statusCode === 401) {
                return [{ serviceName: 'Pay as you go' }];
            }
        }
    }

}

module.exports = Subscription
