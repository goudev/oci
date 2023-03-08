let Util = require("./util");
const resourceSearch = require('./resourceSearch');
const os = require("oci-objectstorage");

class ObjectStorage {

    #provider = "";
    #util = ""

    constructor(provider){
        this.#provider = provider;
        this.#util = new Util();
        return this;
    }

    getNamespace(){
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

             try {

                /**
                 * Desabilita o console
                 */
                this.#util.disableConsole();

                /**
                 * Obtem a metrica
                 */
                new os.ObjectStorageClient({authenticationDetailsProvider: this.#provider}).getNamespace({}).then(result=>{

                    /**
                     * Habilita o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna
                     */
                    resolve(result);
                }).catch(error=>{

                    /**
                     * Habilita o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Obtem o erro
                     */
                    reject(error)
                })

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
                await new os.ObjectStorageClient({ authenticationDetailsProvider: this.#provider}).getBucket({
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
                    resolve(result.bucket)
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
            let namespace = await this.getNamespace()

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
                    await this.getBucket(namespace.value, bck.displayName).then(b=>{
                        buckets.push(b);
                    }).catch(error=>{
                        reject("Erro ao consultar o bucket " + bck.name + "\n\n" + error)
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

module.exports = ObjectStorage
