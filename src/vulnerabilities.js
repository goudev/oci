let Util = require("./util");
const vulnerabilityscanning = require('oci-vulnerabilityscanning');

class Vulnerabilities {

    #provider = "";
    #util = ""

    constructor(provider) {
        this.#provider = provider;
        this.#util = new Util();
        return this;
    }

    /**
     * Obtem uma vulnerabilidade
     */
    getVulnerabililty(vulnerabilityId) {
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
                await new vulnerabilityscanning.VulnerabilityScanningClient({ authenticationDetailsProvider: this.#provider }).getVulnerability({
                    vulnerabilityId: vulnerabilityId
                }).then(result => {

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna a vulnerabilidade
                     */
                    resolve(result.vulnerability)
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
     * Obtem a lista de todas as vulnerabilidades
     */
    listVulnerabilities() {

        /**
         * Retorna a promise
         */
        return new Promise(async(resolve, reject) => {

            /**
             * Define um array para armazenar
             */
           
            var vulnerabilities = []

            /**
             * Habilita o console
             */
            this.#util.disableConsole();

            /**
             * Realiza a consulta
             */
            await new vulnerabilityscanning.VulnerabilityScanningClient({ authenticationDetailsProvider: this.#provider }).listVulnerabilities({
                compartmentId: this.#provider.getTenantId()
            }).then(async result => {
                
                for(const v of result.vulnerabilitySummaryCollection.items) {
                    const an = await this.getVulnerabililty(v.id)
                    vulnerabilities.push(an)
                }

                for(const vulnerability of vulnerabilities) {
                    const resources = await this.listVulnerabilityImpactedHosts(vulnerability.id)
                    vulnerability.impactedResources = resources
                }
                /**
                 * Habilita novamente o console
                 */
                this.#util.enableConsole();

                /**
                 * Retorna as vulnerabilidades
                 */
                resolve(vulnerabilities);

            }).catch(error => {
                    /**
                 * Habilita o console
                 */
                this.#util.enableConsole();

                /**
                 * Rejeita a promise
                 */
                reject("Erro ao obter a lista de Vulnerabilidades. \n\n" + error.message || error);
            });

        })
    
    }

     /**
     * Obtem a lista de todos os recursos com vulnerabilidades
     */
     listVulnerabilityImpactedHosts(vulnerabilityId) {

        /**
         * Retorna a promise
         */
        return new Promise(async(resolve, reject) => {

            /**
             * Define um array para armazenar
             */
           
            var impactedResources = []

            /**
             * Habilita o console
             */
            this.#util.disableConsole();

            /**
             * Realiza a consulta
             */
            await new vulnerabilityscanning.VulnerabilityScanningClient({ authenticationDetailsProvider: this.#provider }).listVulnerabilityImpactedHosts({
                vulnerabilityId: vulnerabilityId
            }).then(result => {
                result.vulnerabilityImpactedHostSummaryCollection.items.forEach(res => {
                    impactedResources.push(res.instanceId)
                })
                /**
                 * Habilita novamente o console
                 */
                this.#util.enableConsole();

                /**
                 * Retorna os recursos com vulnerabilidades
                 */
                resolve(impactedResources);

            }).catch(error => {
                    /**
                 * Habilita o console
                 */
                this.#util.enableConsole();

                /**
                 * Rejeita a promise
                 */
                reject("Erro ao obter a lista de Recursos com Vulnerabilidades. \n\n" + error.message || error);
            });

        })
    
    }

}

module.exports = Vulnerabilities
