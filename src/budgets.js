let Util = require("./util");
const budget = require('oci-budget');

class Budgets {

    #provider = "";
    #util = ""

    constructor(provider) {
        this.#provider = provider;
        this.#util = new Util();
        return this;
    }

    /**
     * Obtem um budget
     */
    getBudget(budgetId) {
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
                await new budget.BudgetClient({ authenticationDetailsProvider: this.#provider }).getBudget({
                    budgetId: budgetId
                }).then(result => {

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o budget
                     */
                    resolve(result.budget)
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

    listBudgets() {

        /**
         * Retorna a promise
         */
        return new Promise(async (resolve, reject) => {

            /**
             * Cria um array para armazenar as informações
             */
            var budgets = [];

            /**
             * Realiza a consulta
             */
            new budget.BudgetClient({ authenticationDetailsProvider: this.#provider }).listBudgets({
                compartmentId: this.#provider.getTenantId()
            }).then(result => {
                result.items.forEach(budget => {
                    budgets.push(budget)
                })

                /**
                 * retorna a promise
                 */
                resolve(budgets);

            }).catch(error => {
                /**
                 * Habilita o console
                 */
                this.#util.enableConsole();

                /**
                 * Rejeita a promise
                 */
                reject("Erro ao obter a lista de Budgets. \n\n" + error.message || error);
            });

        })
    }

}

module.exports = Budgets