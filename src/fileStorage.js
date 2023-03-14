let Util = require("./util");
const resourceSearch = require('./resourceSearch');
const fs = require("oci-filestorage");

class FileStorage {

    #provider = "";
    #util = ""

    constructor(provider){
        this.#provider = provider;
        this.#util = new Util();
        return this;
    }

    /**
     * Obtem um File System
     */
    getFileSystem(fileSystemId){
        
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
                await new fs.FileStorageClient({ authenticationDetailsProvider: this.#provider}).getFileSystem({
                    fileSystemId: fileSystemId
                }).then(result=>{

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o File System
                     */
                    resolve(result.fileSystem)
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
     * Obtem a lista de todos os File Systems
     */
    listFileSystems(){
        
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Define um array para armazenar
             */
            var fileSystems = [];

            /**
             * Consulta a lista de File Systems
             */
            new resourceSearch(this.#provider,"allRegions").find("filesystem resources").then(async fs=>{

                /**
                 * Varre a lista de File Systems
                 */
                for (const f of fs) {
                    await this.getFileSystem(f.identifier).then(f=>{
                        fileSystems.push(f);
                    }).catch(error=>{
                        reject("Erro ao consultar o filesystem " + f.identifier + "\n\n" + error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(fileSystems)
            }).catch(error=>{
                reject(error);
            })
        })
    }

}

module.exports = FileStorage
