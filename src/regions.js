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

    /**
     * Obtem a lista de todos os boot-volumes
     */
     getAllBootVolumes(){
        
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Define um array para armazenar
             */
            var bootVolumes = [];

            /**
             * Consulta a lista de bootVolumes
             */
            new resourceSearch(this.#provider,"allRegions").find("bootvolume resources where (lifecycleState = 'AVAILABLE')").then(async bvs=>{

                /**
                 * Varre a lista de boot volumes
                 */
                for (const bv of bvs) {
                    await this.getBootVolume(bv.identifier).then(b=>{
                        bootVolumes.push(b);
                    }).catch(error=>{
                        reject("Erro ao consultar o disco " + bv.identifier + "\n\n" + error.message || error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(bootVolumes)
            }).catch(error=>{
                reject(error);
            })
        })
    }
}

module.exports = Regions