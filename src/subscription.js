let Util = require("./util");
const subscription = require('oci-osuborganizationsubscription')

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
    listSubscriptions() {

        /**
         * Retorna a promise
         */
        return new Promise(async (resolve, reject) => {

            var subscriptions = []

            /**
             * Consulta a lista de subscriptions
             */
            new subscription.OrganizationSubscriptionClient({authenticationDetailsProvider: this.#provider}).listOrganizationSubscriptions({
                compartmentId: this.#provider.getTenantId(),
            }).then(async subs => {
                subs.items.forEach(sub => {
                    subscriptions.push(sub)
                })

                /**
                * Retorna
                */
                resolve(subscriptions)
            }).catch(error => {
                reject(error);
            })
        })
    }

}

module.exports = Subscription
