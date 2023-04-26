let Util = require("./util");
const core = require('oci-core');
const resourceSearch = require('./resourceSearch');
const Compartments = require("./compartments");

class BootVolume {

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
    getBootVolume(volumeId){
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
                await new core.BlockstorageClient({ authenticationDetailsProvider: this.#provider}).getBootVolume({
                     bootVolumeId: volumeId
                }).then(async result => {
                        // result.bootVolume.metrics = {}
                        // result.bootVolume.metrics.last30 = {}
                        // await new Monitoring(this.#provider).getVolumeReadThroughput(result.bootVolume, 30).then(async metrics => {
                        //     result.bootVolume.metrics.last30.readThroughputInMBs = metrics;
                        // });
                        // await new Monitoring(this.#provider).getVolumeWriteThroughput(result.bootVolume, 30).then(async metrics => {
                        //     result.bootVolume.metrics.last30.writeThroughputInMBs = metrics;
                        // });
                        // await new Monitoring(this.#provider).getVolumeGuaranteedThroughput(result.bootVolume, 30).then(async metrics => {
                        //     result.bootVolume.metrics.last30.guaranteedThroughputInMBs = metrics;
                        // });
                        result.bootVolume.backupPolicy = await this.getBackupPolicyAttachedToVolume(volumeId)
                    
                    resolve(result.bootVolume)
                })

                 /*
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
    listBootVolumes(){
        
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
                        reject("Erro ao consultar o disco " + bv.identifier + "\n\n" + error)
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

    /**
     * Retorna a lista de todos os bootVolumesAttachments
     */
    listBootVolumeAttachments(compartmentId){

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
                 * Desabilita o console
                 */
                this.#util.disableConsole();

                /**
                 * Realiza a consulta
                 */
                new core.ComputeClient({ authenticationDetailsProvider: this.#provider}).listBootVolumeAttachments({
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
                    reject("Erro ao obter a lista de Boot Volume Attachments. \n\n" + error.message || error);
                })
            }else{

                /**
                 * Obtem a lista de compartimentos
                 */
                new Compartments(this.#provider).listCompartments().then(async compartments=>{
                    for (const compartment of compartments) {

                        /**
                         * Obtem a lista de compartimentos
                         */
                        await this.listBootVolumeAttachments(compartment.id).then(result=>{
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

    getBackupPolicyAttachedToVolume(volumeId) {
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
                await new core.BlockstorageClient({ authenticationDetailsProvider: this.#provider }).getVolumeBackupPolicyAssetAssignment({
                    assetId: volumeId
                }).then(result => {
                    /**
                    * Habilita novamente o console
                    */
                    this.#util.enableConsole();
                    /**
                    * Retorna a politica de backup
                    */
                    resolve(result.items[0] ? result.items[0].policyId : null )
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

module.exports = BootVolume