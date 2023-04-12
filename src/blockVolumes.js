let Util = require("./util");
const core = require('oci-core');
const resourceSearch = require('./resourceSearch');
const Compartments = require("./compartments");
const Monitoring = require('./monitoring');

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
                    await new core.BlockstorageClient({ authenticationDetailsProvider: this.#provider }).getVolumeBackupPolicyAssetAssignment({
                        assetId: volumeId
                    }).then(backup => {
                        result.volume.backupPolicy = backup.items[0]
                    }).then(async () => {
                        result.volume.metrics = {}
                        await new Monitoring(this.#provider).getDiskMetrics(result.volume, 30).then(async metrics => {

                            result.volume.metrics['last30'] = metrics;
                            
                            });
                    })
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

                /**
                 * Obtem a lista de compartimentos
                 */
                new Compartments(this.#provider).listCompartments().then(async compartments => {
                    for (const compartment of compartments) {

                        /**
                         * Obtem a lista de compartimentos
                         */
                        await this.listBlockVolumeAttachments(compartment.id).then(result => {
                            result.forEach(b => {
                                bva.push(b)
                            });
                        }).catch(error => {
                            reject(error.message || error)
                        })
                    }
                    resolve(bva)
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

                /**
                * Retorna
                */
                resolve(backupPolicies)
            }).catch(error => {
                reject(error);
            })
        })
    }

    listVolumeGroups() {

        /**
         * Retorna a promise
         */
        return new Promise(async (resolve, reject) => {

            /**
             * Define um array para armazenar
             */
            var volumeGroups = [];

            /**
             * Consulta a lista de volumeGroups
             */
            new resourceSearch(this.#provider).find("volumegroup resources").then(async bvs => {

                /**
                 * Varre a lista de boot volumes
                 */
                for (const bv of bvs) {
                    await this.getVolumeGroups(bv.identifier).then(b => {
                        volumeGroups.push(b);
                    }).catch(error => {
                        reject("Erro ao consultar o disco " + bv.identifier + "\n\n" + error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(volumeGroups)
            }).catch(error => {
                reject(error);
            })
        })
    }

    getVolumeGroups(volumeGroupId) {
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
                }).then(result => {
                    
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
}

module.exports = BlockVolume