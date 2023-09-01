let Util = require("./util");
const Usage = require('./usage');
const subscription = require('oci-osuborganizationsubscription');
const osubsubscription = require('oci-osubsubscription')

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
            var availableAmount = 0
            var usedAmount = 0
            
            for(const subscription of items) {
                subscription.contracts = await this.listContracts(subscription.id)
                for(const contract of subscription.contracts) {
                    usedAmount += parseFloat(contract.usedAmount)
                    if(contract.status === 'ACTIVE') {
                        availableAmount += parseFloat(contract.availableAmount)
                    }
                }
                subscription.availableAmount = availableAmount
                subscription.currentSpent = usedAmount
                let lastThreeMonthsCost = await new Usage(this.#provider).getLast3MUsage();
                let media = String(lastThreeMonthsCost / 3)
                subscription.estimatedDaysToCreditsToRunOut = Math.ceil((availableAmount / parseFloat(media)) * 31)
                let currentDate = new Date()
                subscription.estimatedDateToCreditToRunOut = new Date(currentDate.getTime() + subscription.estimatedDaysToCreditsToRunOut * 24 * 60 * 60 * 1000)
                contracts.push(subscription)
            }

            return result.items;
        } catch (error) {
            if (error.statusCode && error.statusCode === 401) {
                return [{ serviceName: 'Pay as you go' }];
            }
        }
    }

    listContracts(subscriptionId) {
        /**
         * Retorna a promise
         */
        return new Promise(async (resolve, reject) => {

            /**
             * Desabilita o console
             */
            this.#util.disableConsole();

            try {

                /**
                 * 
                 */
                await new osubsubscription.SubscriptionClient({ authenticationDetailsProvider: this.#provider }).listSubscriptions({
                    compartmentId: this.#provider.getTenantId(),
                    subscriptionId: subscriptionId
                }).then(result => {
                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna os contratos
                     */
                    resolve(result.items[0].subscribedServices)
                })

                /**
                 * Habilita o console
                 */
                this.#util.enableConsole();

            } catch (error) {

                /**
                 * Habilita o console
                 */
                this.#util.enableConsole();

                /**
                 * Rejeita a promise
                 */
                reject(error.message || error)
            }
        })
    }

}

module.exports = Subscription
