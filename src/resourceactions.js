let Util = require("./util");
const optimizer = require('oci-optimizer');

class ResourceActions {

    #provider = "";
    #util = ""

    constructor(provider) {
        this.#provider = provider;
        this.#util = new Util();
        return this;
    }

    /**
     * Obtem um resource action
     */
    getResourceAction(recommendationId) {
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
                await new optimizer.OptimizerClient({ authenticationDetailsProvider: this.#provider }).getResourceAction({
                    recommendationId: recommendationId
                }).then(result => {

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o resource action
                     */
                    resolve(result.resourceAction)
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

    /**
     * Retorna a lista de todas as resource actions
     */
    listResourceActions() {

        /**
         * Retorna a promise
         */
        return new Promise(async (resolve, reject) => {

            /**
             * Habilita o console
             */
            this.#util.disableConsole();

            /**
             * Realiza a consulta
             */
            new optimizer.OptimizerClient({ authenticationDetailsProvider: this.#provider }).listResourceActions({
                compartmentId: this.#provider.getTenantId(),
                compartmentIdInSubtree: true
            }).then(result => {

                /**
                 * Habilita o console
                 */
                this.#util.enableConsole();

                /**
                 * retorna a promise
                 */
                resolve(result.resourceActionCollection.items);

            }).catch(error => {
                /**
                 * Habilita o console
                 */
                this.#util.enableConsole();

                /**
                 * Rejeita a promise
                 */
                reject("Erro ao obter a lista de Recomendações. \n\n" + error.message || error);
            });
            
        })
    }
}

module.exports = ResourceActions