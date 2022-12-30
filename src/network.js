let Util = require("./util");
const core = require('oci-core');
const resourceSearch = require('./resourceSearch');
const Compartments = require("./compartments");

class Network {

    #provider = "";
    #util = ""

    constructor(provider){
        this.#provider = provider;
        this.#util = new Util();
        return this;
    }

    /**
     * Retorna a lista de todos os vnic attachments
     */
    listVnicAttachments(compartmentId){

        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Cria um array para armazenar as informações
             */
            var bva = [];

            /**
             * Se foi passado um compartimento
             */
            if(compartmentId){

                /**
                 * Habilita o console
                 */
                this.#util.disableConsole();

                /**
                 * Realiza a consulta
                 */
                new core.ComputeClient({ authenticationDetailsProvider: this.#provider}).listVnicAttachments({
                    compartmentId: compartmentId
                }).then(result=>{

                    /**
                     * Habilita o console
                     */
                    this.#util.enableConsole();

                    /**
                     * retorna a promise
                     */
                    resolve(result.items);

                }).catch(error=>{
                    /**
                     * Habilita o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Rejeita a promise
                     */
                    reject("Erro ao obter a lista de Block Volume Attachments. \n\n" + error.message || error);
                });

            }else{

                /**
                 * Obtem a lista de compartimentos
                 */
                new Compartments(this.#provider).getCompartments().then(async compartments=>{
                    for (const compartment of compartments) {

                        /**
                         * Obtem a lista de vnics
                         */
                        await this.listVnicAttachments(compartment.id).then(result=>{
                            result.forEach(b => {
                                bva.push(b)
                            });
                        }).catch(error=>{
                            reject(error.message || error)
                        })
                    }
                    resolve(bva)
                }).catch(error=>{

                    /**
                     * Rejeita a promise
                     */
                    reject(error.message);
                })
            }
        })
    }

    /**
     * Obtem a lista de todos os vnics
     */
    listVnics(){
        
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Define um array para armazenar
             */
            var vnics = [];

            /**
             * Consulta a lista de bootVolumes
             */
            new resourceSearch(this.#provider).find("vnic resources where (lifecycleState = 'AVAILABLE')").then(async vns=>{

                /**
                 * Varre a lista de boot volumes
                 */
                for (const vn of vns) {
                    await this.getVnic(vn.identifier).then(v=>{
                        vnics.push(v);
                    }).catch(error=>{
                        reject("Erro ao consultar a vnic " + vn.identifier + "\n\n" + error.message || error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(vnics)
            }).catch(error=>{
                reject(error);
            })
        })
    }

    /**
     * Obtem os dados da vnic
     */
    getVnic(vnicId){
        
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Desabilita o console
             */
            this.#util.disableConsole();

             try {

                /**
                 * Obte a vnic
                 */
                await new core.VirtualNetworkClient({ authenticationDetailsProvider: this.#provider}).getVnic({
                    vnicId: vnicId
                }).then(result=>{
                    
                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();
                    
                    /**
                     * Retorna o bootVolume
                     */
                    resolve(result.vnic)
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
     * Obtem um volume
     */
    getPublicIp(publicIpId){
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Desabilita o console
             */
            this.#util.disableConsole();

             try {

                /**
                 * 
                 */
                await new core.VirtualNetworkClient({ authenticationDetailsProvider: this.#provider}).getPublicIp({
                    publicIpId: publicIpId
                }).then(result=>{

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o bootVolume
                     */
                    resolve(result.publicIp)
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
     * Obtem a lista de todos os vnics
     */
    listPublicIps(){
        
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Define um array para armazenar
             */
            var lips = [];

            /**
             * Consulta a lista de bootVolumes
             */
            new resourceSearch(this.#provider).find("publicip resources where (lifecycleState = 'AVAILABLE')").then(async ips=>{

                /**
                 * Varre a lista de boot volumes
                 */
                for (const ip of ips) {
                    await this.getPublicIp(ip.identifier).then(i=>{
                        lips.push(i);
                    }).catch(error=>{
                        reject("Erro ao consultar a vnic " + ip.identifier + "\n\n" + error.message || error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(lips)
            }).catch(error=>{
                reject(error);
            })
        })
    }

    /**
     * Obtem um volume
     */
    getPrivateIp(privateIpId){
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Desabilita o console
             */
            this.#util.disableConsole();

             try {

                /**
                 * 
                 */
                await new core.VirtualNetworkClient({ authenticationDetailsProvider: this.#provider}).getPrivateIp({
                    privateIpId: privateIpId
                }).then(result=>{

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o bootVolume
                     */
                    resolve(result.privateIp)
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
     * Obtem a lista de todos os vnics
     */
    listPrivateIps(){
        
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Define um array para armazenar
             */
            var lips = [];

            /**
             * Consulta a lista de bootVolumes
             */
            new resourceSearch(this.#provider).find("privateip resources where (lifecycleState = 'AVAILABLE')").then(async ips=>{

                /**
                 * Varre a lista de boot volumes
                 */
                for (const ip of ips) {
                    await this.getPrivateIp(ip.identifier).then(i=>{
                        lips.push(i);
                    }).catch(error=>{
                        reject("Erro ao consultar a vnic " + ip.identifier + "\n\n" + error.message || error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(lips)
            }).catch(error=>{
                reject(error);
            })
        })
    }
}

module.exports = Network