let Util = require("./util");
const objectstorage = require('oci-objectstorage');
const resourceSearch = require('./resourceSearch');

class Storage {

    #provider = "";
    #util = ""

    constructor(provider){
        this.#provider = provider;
        this.#util = new Util();
        return this;
    }

    /**
     * Obtem um Bucket
     */
    getBucket(namespaceName, bucketName){
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
                await new objectstorage.ObjectStorageClient({ authenticationDetailsProvider: this.#provider}).getBucket({
                    namespaceName: namespaceName,
                    bucketName: bucketName
                }).then(result=>{

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o Bucket
                     */
                    resolve(result.dbSystem)
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
     * Obtem a lista de todos os Buckets
     */
    listBuckets(){
        
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Define um array para armazenar
             */
            var buckets = [];

            /**
             * Consulta a lista de Buckets
             */
            new resourceSearch(this.#provider,"allRegions").find("bucket resources").then(async bcks=>{

                /**
                 * Varre a lista de Buckets
                 */
                for (const bck of bcks) {
                    await this.getBucket(bck.namespaceName, bck.bucketName).then(b=>{
                        buckets.push(b);
                    }).catch(error=>{
                        reject("Erro ao consultar o banco " + bck.namespaceName, bck.bucketName + "\n\n" + error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(buckets)
            }).catch(error=>{
                reject(error);
            })
        })
    }
}

module.exports = Storage