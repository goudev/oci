let Util = require("./util");
const core = require('oci-core');
const resourceSearch = require('./resourceSearch');
const Compartments = require("./compartments");

class BlockVolume {

    #provider = "";
    #util = ""

    constructor(provider) {
        this.#provider = provider;
        this.#util = new Util();
        return this;
    }

    /**
     * Obtem um volume
     */
    getBlockVolume(volumeId) {
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
                await new core.BlockstorageClient({ authenticationDetailsProvider: this.#provider }).getVolume({
                    volumeId: volumeId
                }).then(async result => {
                    // result.volume.metrics = {}
                    // result.volume.metrics.last30 = {}
                    // await new Monitoring(this.#provider).getVolumeReadThroughput(result.volume, 30).then(async metrics => {
                    //     result.volume.metrics.last30.readThroughputInMBs = metrics;
                    // });
                    // await new Monitoring(this.#provider).getVolumeWriteThroughput(result.volume, 30).then(async metrics => {
                    //     result.volume.metrics.last30.writeThroughputInMBs = metrics;
                    // });
                    // await new Monitoring(this.#provider).getVolumeGuaranteedThroughput(result.volume, 30).then(async metrics => {
                    //     result.volume.metrics.last30.guaranteedThroughputInMBs = metrics;
                    // });
                    result.volume.backupPolicy = await this.getBackupPolicyAttachedToVolume(result.volume.id)
                
                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o bootVolume
                     */
                    resolve(result.volume)
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

    async* listBlockVolumesIterator() {
        try {
            const Search = new resourceSearch(this.#provider);
            const query = "volume resources where (lifecycleState = 'AVAILABLE')";
            for await (const volume of Search.findIterator(query)) {
                const blockvolume = await this.getBlockVolume(volume.identifier);
                yield blockvolume;
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Obtem a lista de todos os boot-volumes
     */
    listBlockVolumes() {

        /**
         * Retorna a promise
         */
        return new Promise(async (resolve, reject) => {

            /**
             * Define um array para armazenar
             */
            var bootVolumes = [];

            /**
             * Consulta a lista de bootVolumes
             */
            new resourceSearch(this.#provider).find("volume resources where (lifecycleState = 'AVAILABLE')").then(async bvs => {

                /**
                 * Varre a lista de boot volumes
                 */
                for (const bv of bvs) {
                    await this.getBlockVolume(bv.identifier).then(b => {
                        bootVolumes.push(b);
                    }).catch(error => {
                        reject("Erro ao consultar o disco " + bv.identifier + "\n\n" + error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(bootVolumes)
            }).catch(error => {
                reject(error);
            })
        })
    }

    /**
     * Retorna a lista de todos os blockVolumesAttachments
     */
    listBlockVolumeAttachments(compartmentId) {

        /**
         * Retorna a promise
         */
        return new Promise(async (resolve, reject) => {

            const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
            /**
             * Obtem a lista de compartimentos
             */
            var compartments = await new resourceSearch(this.#provider).find("compartment resources where (lifecycleState = 'ACTIVE')")

            /**
             * Cria um array para armazenar as informações
             */
            var bva = [];

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
                new core.ComputeClient({ authenticationDetailsProvider: this.#provider }).listVolumeAttachments({
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

                try {
                    for(const comp of compartments) {
                        const attachments = await this.listBlockVolumeAttachments(comp.identifier)
                        for(const a of attachments) {
                            bva.push(a)
                        }
                        await delay(100)
                    }
                } catch (error) {
                    console.log(error)
                }
                
                await this.listBlockVolumeAttachments(this.#provider.getTenantId()).then(result=>{
                    result.forEach(b => {
                        bva.push(b)
                    });
                }).catch(error=>{
                    reject(error.message || error)
                })
                resolve(bva)
            }
        })
    }

    /**
    * Obtem uma política de backup de um volume
    */
    getVolumePolicy(policyId) {
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
                await new core.BlockstorageClient({ authenticationDetailsProvider: this.#provider }).getVolumeBackupPolicy({
                    policyId: policyId
                }).then(result => {
                    /**
                    * Habilita novamente o console
                    */
                    this.#util.enableConsole();
                    /**
                    * Retorna a politica de backup
                    */
                    resolve(result.volumeBackupPolicy)
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
    * Obtem a lista de todas as politicas de backup dos volumes
    */
    listVolumesPolicies() {
        /**
        * Retorna a promise
        */
        return new Promise(async (resolve, reject) => {

            /**
            * Define um array para armazenar
            */
            var backupPolicies = [];

            /**
            * Consulta a lista de politicas de backup dos volumes
            */
            new resourceSearch(this.#provider).find("VolumeBackupPolicy resources").then(async bvps => {

                /**
                * Varre a lista de politicas de backup
                */
                for (const bvp of bvps) {
                    await this.getVolumePolicy(bvp.identifier).then(b => {
                        backupPolicies.push(b);
                    }).catch(error => {
                        reject("Erro ao consultar a politica de backup " + bvp.identifier + "\n\n" + error)
                    })
                } 

                await new core.BlockstorageClient({ authenticationDetailsProvider: this. #provider }).listVolumeBackupPolicies({}).then(async oracleBackupPolicies => {
                    for (const obp of oracleBackupPolicies.items) {
                        backupPolicies.push(obp);
                    }
                })

                /**
                * Retorna
                */
                resolve(backupPolicies)
            }).catch(error => {
                reject(error);
            })
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

    /**
     * Obtem um volume group
     */
    getVolumeGroup(volumeGroupId) {
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
                await new core.BlockstorageClient({ authenticationDetailsProvider: this.#provider }).getVolumeGroup({
                    volumeGroupId: volumeGroupId
                }).then(async result => {
                    result.volumeGroup.backupPolicy = await this.getBackupPolicyAttachedToVolume(result.volumeGroup.id)
                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o bootVolume
                     */
                    resolve(result.volumeGroup)
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


    listVolumeGroups() {
        /**
        * Retorna a promise
        */
        return new Promise(async (resolve, reject) => {

            try {
                /**
                * Define um array para armazenar
                */
                var volumeGroups = [];
                /**
                * Consulta a lista de volume groups
                */
                const vgs = await new resourceSearch(this.#provider).find("volumegroup resources")
                
                for (const bvp of vgs) {
                    try {
                        const vg = await this.getVolumeGroup(bvp.identifier)
                        volumeGroups.push(vg)
                    } catch (error) {
                        console.log(error)
                    }
                } 
                /**
                * Retorna
                */
                resolve(volumeGroups)
                
            } catch (error) {
                reject(error)
            }
            
        })
    }
}

module.exports = BlockVolume