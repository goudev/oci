let Util = require("./util");
const identity = require("oci-identity");

class Regions {

    #provider = "";
    #util = ""

    constructor(provider){
        this.#provider = provider;
        this.#util = new Util();
        return this;
    }

    /**
     * Obtem um volume
     */
    getRegionSubscriptions(){

        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Define um array para armazenar
             */
            var regions = [];

            /**
             * Desabilita o console
             */
            this.#util.disableConsole();

             try {

                /**
                 * Instancia o identity
                 */
                const identityClient = new identity.IdentityClient({
                    authenticationDetailsProvider: this.#provider
                });

                /**
                 * 
                 */
                await identityClient.listRegionSubscriptions({
                    tenancyId: this.#provider.getTenantId()
                }).then(result=>{

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Faz a consulta
                     */
                    result.items.forEach(item => {

                        /**
                         * Varre a lista
                         */
                        regions.push(item);
                    });
                    
                    /**
                     * Retorna o bootVolume
                     */
                    resolve(regions)
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

module.exports = Regions