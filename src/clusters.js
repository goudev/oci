let Util = require("./util");
const containerengine = require("oci-containerengine");
const Compartments = require("./compartments");
const { setTimeout } = require('timers/promises');

class Cluster {

    #provider = "";
    #util = ""

    constructor(provider) {
        this.#provider = provider;
        this.#util = new Util();
        return this;
    }

    listClusters(compartmentId) {

        /**
         * Retorna a promise
         */
        return new Promise(async (resolve, reject) => {

            /**
             * Cria um array para armazenar as informações
             */
            var cls = [];

            /**
             * Se foi passado um compartimento
             */
            if (compartmentId) {

                /**
                 * Habilita o console
                 */
                this.#util.disableConsole();

                /**
                 * Realiza a consulta
                 */
                new containerengine.ContainerEngineClient({ authenticationDetailsProvider: this.#provider }).listClusters({
                    compartmentId: compartmentId
                }).then(result => {

                    /**
                     * Habilita o console
                     */
                    this.#util.enableConsole();

                    /**
                     * retorna a promise
                     */
                    resolve(result.items);

                }).catch(error => {
                    /**
                     * Habilita o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Rejeita a promise
                     */
                    reject("Erro ao obter a lista de Block Volume Attachments. \n\n" + error.message || error);
                });

            } else {

                /**
                 * Obtem a lista de compartimentos
                 */
                new Compartments(this.#provider).listCompartments().then(async compartments => {
                    for (const compartment of compartments) {

                        /**
                         * Obtem a lista de compartimentos
                         */
                        await this.listClusters(compartment.id).then(result => {
                            result.forEach(c => {
                                cls.push(c)
                            });
                        }).catch(error => {
                            reject(error.message || error)
                        })
                    }
                    resolve(cls)
                }).catch(error => {

                    /**
                     * Rejeita a promise
                     */
                    reject(error.message);
                })
            }
        })
    }

    /**
     * Lists all clusters
     */
    async k() {
        return new Promise((resolve, reject) => {
            new Compartments(this.#provider).listCompartments().then(async compartments => {
                const client = new containerengine.ContainerEngineClient({
                    authenticationDetailsProvider: this.#provider,
                });

                const result = [];

                for (const compartment of compartments) {
                    const listClustersRequest = {
                        compartmentId: compartment.id,
                        lifecycleState: [containerengine.models.ClusterLifecycleState.Active],
                    };

                    const listClustersResponse = await client.listClusters(listClustersRequest);
                    result.push(...listClustersResponse.items);
                    await setTimeout(2000);
                }

                resolve(result);
            })
        })
    }
}

module.exports = Cluster;