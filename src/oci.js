const fs = require('fs').promises;
const ociCommon = require("oci-common");
var hash = require('object-hash');
var BootVolumes = require("./bootVolumes")
var BlockVolumes = require("./blockVolumes")
var ResourceSearch = require("./resourceSearch")
var Compartments = require("./compartments")
var Regions = require("./regions")

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

            /**
             * Retorna
             */
            return this;
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

    

    

    searchResource(queryString, AllRegions){
        return new ResourceSearch(this.#provider).find(queryString,AllRegions)
    }

    getBlockVolume(volumeId){
        return new BlockVolumes(this.#provider).getBlockVolume(volumeId);
    }

    listBlockVolumes(){
        return new BlockVolumes(this.#provider).listBlockVolumes();
    }

    getBootVolume(volumeId){
        return new BootVolumes(this.#provider).getBootVolume(volumeId);
    }

    listBootVolumes(){
        return new BootVolumes(this.#provider).getAllBootVolumes();
    }

    listBootVolumeAttachments(){
        return new BootVolumes(this.#provider).listBootVolumeAttachments();
    }

    listBlockVolumeAttachments(){
        return new BlockVolumes(this.#provider).listBlockVolumeAttachments();
    }

    getRegionSubscriptions(){
        return new Regions(this.#provider).getRegionSubscriptions();
    }

    getCompartments(){
        return new Compartments(this.#provider).getCompartments();
    }
    
}
