const fs = require('fs').promises;
const core = require('oci-core');
const ociCommon = require("oci-common");
const identity = require("oci-identity");
const rs = require("oci-resourcesearch");
var hash = require('object-hash');
var BootVolumes = require("./bootVolumes")

module.exports = class oci {
    
    #console = console;
    #configFile = "";
    #user = "";
    #fingerprint = "";
    #tenancy = "";
    #region = "";
    #key = "";
    #inst = "";
    #provider = "";

    constructor(config) {

        /**
         * Define as envs
         */
        this.#user = config.user;
        this.#fingerprint = config.fingerprint
        this.#tenancy = config.tenancy
        this.#region = config.region
        this.#key =  config.private_key
        this.#inst = hash(JSON.stringify(config));
        
        /**
         * Arquivo config
         */
        this.#configFile = `[DEFAULT]\n`;
        this.#configFile = this.#configFile + `user=${this.#user}\n`
        this.#configFile = this.#configFile + `fingerprint=${this.#fingerprint}\n`
        this.#configFile = this.#configFile + `tenancy=${this.#tenancy}\n`
        this.#configFile = this.#configFile + `region=${this.#region}\n`
        this.#configFile = this.#configFile + `key_file=/tmp/oci-${this.#inst}.pem\n`

        /**
         * Grava o arquivo oci
         */
        var wrcfg = fs.writeFile(`/tmp/oci-${this.#inst}.oci`, this.#configFile);

         /**
          * Grava o arquivo key
          */
        var wrkey = fs.writeFile(`/tmp/oci-${this.#inst}.pem`, this.#key);

        /**
         * retorna promise
         */
        return new Promise((resolve,reject)=>{
            Promise.all([wrcfg,wrkey]).then(async()=>{

                /**
                 * Define o arquivo de configuração
                 */
                this.#provider = await new ociCommon.ConfigFileAuthenticationDetailsProvider(`/tmp/oci-${this.#inst}.oci`);

                /**
                 * Retorna
                 */
                resolve(this);

            }).catch(reject);
        })
        
    }

    #disableConsole(){
        console = {
            log: function(){},
            error: function(){},
            info: function(){},
            warn: function(){}
        }
    }

    #enableConsole(){
        console = this.#console;
    }

    /**
     * Seta a região
     */
    setRegion(region){
        try {

            /**
             * Desabilita o console
             */
            this.#disableConsole();

            /**
             * Seta a região
             */
            this.#provider.setRegion(region);

            /**
             * Habilita o console
             */
            this.#enableConsole();
        } catch (error) {

             /**
              * Habilita o console
              */
            this.#enableConsole();

            /**
             * Retorna o erro
             */
            return new Error("Erro ao setar a região. \n\n" + error.message || error);
        }        
    }

    /**
     * Retorna a lista de todos os bootVolumesAttachments
     */
    getBootVolumeAttachments(compartmentId){

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
                this.#disableConsole();

                /**
                 * Realiza a consulta
                 */
                new core.ComputeClient({ authenticationDetailsProvider: this.#provider}).listBootVolumeAttachments({
                    compartmentId: compartmentId
                }).then(result=>{

                    /**
                     * Habilita o console
                     */
                    this.#enableConsole();

                    /**
                     * retorna a promise
                     */
                    resolve(result.items);

                }).catch(error=>{
                    /**
                     * Habilita o console
                     */
                    this.#enableConsole();

                    /**
                     * Rejeita a promise
                     */
                    reject("Erro ao obter a lista de Boot Volume Attachments. \n\n" + error.message || error);
                })
            }else{

                /**
                 * Obtem a lista de compartimentos
                 */
                this.getCompartments().then(async compartments=>{
                    for (const compartment of compartments) {

                        /**
                         * Obtem a lista de compartimentos
                         */
                        await this.getBootVolumeAttachments(compartment.id).then(result=>{
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
     * Retorna a lista de todos os blockVolumesAttachments
     */
    getBlockVolumeAttachments(compartmentId){

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
                this.#disableConsole();

                /**
                 * Realiza a consulta
                 */
                new core.ComputeClient({ authenticationDetailsProvider: this.#provider}).listVolumeAttachments({
                    compartmentId: compartmentId
                }).then(result=>{

                    /**
                     * Habilita o console
                     */
                    this.#enableConsole();

                    /**
                     * retorna a promise
                     */
                    resolve(result.items);

                }).catch(error=>{
                    /**
                     * Habilita o console
                     */
                    this.#enableConsole();

                    /**
                     * Rejeita a promise
                     */
                    reject("Erro ao obter a lista de Block Volume Attachments. \n\n" + error.message || error);
                });

            }else{

                /**
                 * Obtem a lista de compartimentos
                 */
                this.getCompartments().then(async compartments=>{
                    for (const compartment of compartments) {

                        /**
                         * Obtem a lista de compartimentos
                         */
                        await this.getBlockVolumeAttachments(compartment.id).then(result=>{
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

    getBootVolume(volumeId){
        
        /**
         * Retorna a promise
         */
        return new BootVolumes(this.#provider);
    }

    /**
     * Retorna a lista de todos os bootVolumes
     */
    getBootVolumes(volumeId){

        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Cria um array para armazenar as informações
             */
            var bv = [];

            /**
             * Se foi passado um compartimento
             */
            if(volumeId){

                /**
                 * Habilita o console
                 */
                this.#disableConsole();

                try {

                    /**
                     * 
                     */
                    var bv = await new core.BlockstorageClient({ authenticationDetailsProvider: this.#provider}).getBootVolume({
                        bootVolumeId: volumeId
                    });

                    /**
                     * Habilita o console
                     */
                    this.#enableConsole();

                } catch (error) {

                    /**
                     * Habilita o console
                     */
                    this.#enableConsole();

                    /**
                     * Rejeita a promise
                     */
                    reject(error.message || error)
                }

                /**
                 * Retorna a informação
                 */
                resolve(bv.bootVolume);

            }else{

                /**
                 * Obtem a lista de bootvolumes
                 */
                this.getBootVolumeAttachments().then(async bootVolumes=>{
                    
                    for (const bootVolume of bootVolumes) {

                        /**
                         * Obtem a lista de compartimentos
                         */
                        await this.getBootVolumes(bootVolume.bootVolumeId).then(result=>{
                            bv.push(result);
                        }).catch(error=>{
                            reject(error.message || error)
                        })
                    }
                    resolve(bv)
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
     * Retorna a lista de todos os blockVolumes
     */
    getBlockVolumes(volumeId){

        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Cria um array para armazenar as informações
             */
            var bv = [];

            /**
             * Se foi passado um compartimento
             */
            if(volumeId){

                /**
                 * Desabilita o console
                 */
                this.#disableConsole();

                try {

                    /**
                     * Realiza a consulta
                     */
                     var bv = await new core.BlockstorageClient({ authenticationDetailsProvider: this.#provider}).getVolume({
                        volumeId: volumeId
                    });

                } catch (error) {

                    /**
                     * Ativa o console
                     */
                    this.#enableConsole();

                    /**
                     * Rejeita a promise
                     */
                    reject(error.message || error)
                }

                /**
                 * Ativa o console
                 */
                this.#enableConsole();

                /**
                 * Retorna a informação
                 */
                resolve(bv.bootVolume);
            }else{

                /**
                 * Obtem a lista de bootvolumes
                 */
                this.getBlockVolumeAttachments().then(async blockVolumes=>{
                    
                    for (const blockVolume of blockVolumes) {

                        /**
                         * Obtem a lista de compartimentos
                         */
                        await this.getBlockVolumes(blockVolume.volumeId).then(result=>{
                            bv.push(result);
                        }).catch(error=>{
                            reject(error.message || error)
                        })
                    }
                    resolve(bv)
                }).catch(error=>{

                    /**
                     * Rejeita a promise
                     */
                    reject(error.message);
                })
            }
        })
    }

    searchResource(q){

        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Cria um array para armazenar as informações
             */
            var resources = [];

            /**
             * Cria uma variavel de ferencia para usar quando ouver o nextPage que representa uma nova requisição de paginação
             * que deve ser feito para seguir extraindo os dados
             */
            var nextPage = false;

            /**
             * Aqui criamos um looping infinito, pois não sabemos quantos requests será necessário realizar para obter as informações completas
             */
            while(true){

                /**
                 * instancia o resource 
                 */
                var searchClient = new rs.ResourceSearchClient({
                    authenticationDetailsProvider: this.#provider
                });

                /**
                 * Desativa o console
                 */
                this.#disableConsole();

                try {

                    /**
                     * Realizamos a consulta dos compartimentos
                     */
                     var result = await searchClient.searchResources({
                        searchDetails: {
                            query: `QUERY ${q} where (lifecycleState = 'AVAILABLE')`,
                            type: "Structured",
                            matchingContextType: rs.models.SearchDetails.MatchingContextType.None
                        }
                    })
                    
                    /**
                     * Ativa o console
                     */
                     this.#enableConsole();
                     
                } catch (error) {
                    
                    /**
                     * Ativa o console
                     */
                    this.#enableConsole();

                    /**
                     * Rejeita a promise
                     */
                    reject(error.message || error)
                }
                
                /**
                 * Varre a lista de resultados e vai adicionando no array
                 */
                (result ? result.resourceSummaryCollection.items : []).forEach(item => {
                    resources.push(item)
                });

                /**
                 * Valida se tem mais dados para serem buscados
                 */
                if(result && result.opcNextPage){

                    /**
                     * Define o nextPage para a próxima requisição
                     */
                    nextPage = result.opcNextPage;

                }else{

                    /**
                     * Retorna a promise com a lista dos compartimentos
                     */
                    return resolve(resources)
                }
            }
        })
    }

    getCompartments(compartment){

        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Cria um array para armazenar as informações
             */
            var resources = [];

            /**
             * Define as configurações de pesquisa
             */
             var lConfig = {
                compartmentId: compartment ? compartment : this.#provider.getTenantId(),
                compartmentIdInSubtree: true,
                lifecycleState: "ACTIVE",
                limit: 100
            }

            /**
             * Aqui criamos um looping infinito, pois não sabemos quantos requests será necessário realizar para obter as informações completas
             */
            while(true){

                /**
                 * Desabilita logs do console, oracle joga muita coisa desnecessária que você não consegue tratar
                 */
                this.#disableConsole()
                
                /**
                 * Realiza a consulta
                 */
                try {

                    /**
                     * Desativa o console
                     */
                    this.#disableConsole();

                    /**
                     * Realiza a consulta
                     */
                    var result = await new identity.IdentityClient({
                        authenticationDetailsProvider: this.#provider
                    }).listCompartments(lConfig);

                    /**
                     * Ativa o console
                     */
                    this.#enableConsole();
                    
                } catch (error) {

                    /**
                     * Habilita o console
                     */
                    this.#enableConsole()

                    /**
                     * Rejeita a promise
                     */
                    return reject("Erro a consultar a lista de compartimentos. \n\n" + error.message)
                }
                
                /**
                 * Varre a lista de resultados
                 */
                result.items.forEach(item => {
                    resources.push(item);
                });

                /**
                 * Valida se tem mais dados para serem buscados
                 */
                if(result.opcNextPage){

                    /**
                     * Define o nextPage para a próxima requisição
                     */
                    lConfig.page = result.opcNextPage;
                    
                }else{

                    /**
                     * Retorna a promise com a lista dos compartimentos
                     */
                    return resolve(resources)
                }
            }
        })
    }
}
