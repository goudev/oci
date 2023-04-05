let Util = require("./util");
const containerengine = require("oci-containerengine");
const resourceSearch = require('./resourceSearch');

class Cluster {

    #provider = "";
    #util = ""

    constructor(provider) {
        this.#provider = provider;
        this.#util = new Util();
        return this;
    }

    getCluster(clusterId) {
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
                await new containerengine.ContainerEngineClient({ authenticationDetailsProvider: this.#provider }).getCluster({
                    clusterId: clusterId
                }).then(result => {

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o cluster
                     */
                    resolve(result.cluster)
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
     * Obtem a lista de todos os clusters
     */
    listClusters() {

        /**
         * Retorna a promise
         */
        return new Promise(async (resolve, reject) => {

            /**
             * Define um array para armazenar
             */
            var clusters = [];

            /**
             * Consulta a lista de clusters
             */
            new resourceSearch(this.#provider).find("clusterscluster resources").then(async cls => {

                /**
                 * Varre a lista de clusters
                 */
                for (const cl of cls) {
                    await this.getCluster(cl.identifier).then(c => {
                        clusters.push(c);
                    }).catch(error => {
                        reject("Erro ao consultar o cluster " + cl.identifier + "\n\n" + error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(clusters)
            }).catch(error => {
                reject(error);
            })
        })
    }
}

module.exports = Cluster;