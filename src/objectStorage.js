let Util = require("./util");
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

}

module.exports = ObjectStorage
