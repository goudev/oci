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
     * Obtem uma recomendação
     */
    getRecommendation(recommendationId) {
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
                await new optimizer.OptimizerClient({ authenticationDetailsProvider: this.#provider }).getRecommendation({
                    recommendationId: recommendationId
                }).then(result => {

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o resource action
                     */
                    resolve(result.recommendation)
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
     * Retorna a lista de todas as recomendações do cloud advisor
     */
    listRecommendations() {

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
            var recommendations = []
            new optimizer.OptimizerClient({ authenticationDetailsProvider: this.#provider }).listRecommendations({
                compartmentId: this.#provider.getTenantId(),
                compartmentIdInSubtree: true
            }).then(async result => {
                result.recommendationCollection.items.forEach(async rec => {
                    recommendations.push(rec)
                })

                for(const recommendation of recommendations) {
                    let total = 0
                    recommendation.resourceCounts.forEach(tot => {
                        total += tot.count
                    })
                    recommendation.totalCount = total
                    var category = await this.getCategory(recommendation.categoryId)
                    recommendation.categoryName = category.name
                }
                /**
                 * Habilita o console
                 */
                this.#util.enableConsole();

                /**
                 * retorna a promise
                 */
                resolve(result.recommendationCollection.items);

            }).catch(error => {
                /**
                 * Habilita o console
                 */
                this.#util.enableConsole();

                /**
                 * Rejeita a promise
                 */
                reject("Erro ao obter a lista de Recommendations. \n\n" + error.message || error);
            });
            
        })
    }

    getResourceAction(ResourceActionId) {
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
                    resourceActionId: ResourceActionId
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

    listResourceActions() {

        /**
         * Retorna a promise
         */
        return new Promise(async (resolve, reject) => {
            try {
                /**
                 * Habilita o console
                 */
                this.#util.disableConsole();

                const recommendations = await this.listRecommendations()
                const resourceActions = []

                for(const rec of recommendations) {
                    await new optimizer.OptimizerClient({ authenticationDetailsProvider: this.#provider }).listResourceActions({
                        compartmentId: this.#provider.getTenantId(),
                        compartmentIdInSubtree: true,
                        recommendationId: rec.id
                    }).then(result => {
                        result.resourceActionCollection.items.forEach(res => {
                            res.recommendationName = rec.name
                        })
                        resourceActions.push(...result.resourceActionCollection.items)
                    })
                }

                /**
                 * Habilita o console
                 */
                this.#util.enableConsole();

                resolve(resourceActions);

            } catch (error) {
                 /**
                 * Habilita o console
                 */
                this.#util.enableConsole();

                 /**
                 * Rejeita a promise
                 */
                reject("Erro ao obter a lista de Resource Actions. \n\n" + error.message || error);
            }
        
        })
    }

    getCategory(categoryId) {
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
                await new optimizer.OptimizerClient({ authenticationDetailsProvider: this.#provider }).getCategory({
                    categoryId: categoryId
                }).then(result => {

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o resource action
                     */
                    resolve(result.category)
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

    listCategories() {

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
            new optimizer.OptimizerClient({ authenticationDetailsProvider: this.#provider }).listCategories({
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
                resolve(result.categoryCollection.items);

            }).catch(error => {
                /**
                 * Habilita o console
                 */
                this.#util.enableConsole();

                /**
                 * Rejeita a promise
                 */
                reject("Erro ao obter a lista de Categories. \n\n" + error.message || error);
            });
            
        })
    }
}

module.exports = ResourceActions