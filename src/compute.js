let Util = require("./util");
const core = require('oci-core');
const resourceSearch = require('./resourceSearch');

class Compute {

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
    getImage(imageId){
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
                await new core.ComputeClient({ authenticationDetailsProvider: this.#provider}).getImage({
                    imageId: imageId
                }).then(result=>{

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o bootVolume
                     */
                    resolve(result.image)
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
     * Obtem a lista de todas as images
     */
    async listImages() {

        /**
         * Retorna a promise
         */
        return new Promise(async (resolve, reject) => {

            /**
             * Obtem a lista de Instancias
             */
            var instances = await this.listInstances()

            /**
             * Obtem a lista de images
             */
            var images = [];

            var imagesSearch = await new resourceSearch(this.#provider).find("image resources where (lifecycleState = 'AVAILABLE')")

            await Promise.all(imagesSearch.map(async img => {
                try {
                    const im = await this.getImage(img.identifier)
                    images.push(im)
                } catch (error) {
                    console.log(error)
                }
            }))
            
            for (const inst of instances) {
                /**
                 * Obtem a lista de images
                 */
                try {
                    const image = await this.getImage(inst.imageId)
                    images.push(image)
                } catch (error) {
                    console.log(error)
                }
            }

            resolve(images)
                
        }).catch(error => {
            reject(error)
        })
    }

    /**
     * Obtem um volume
     */
    getInstance(instanceId){
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Desabilita o console
             */
            //this.#util.disableConsole();

             try {

                /**
                 * 
                 */
                await new core.ComputeClient({ authenticationDetailsProvider: this.#provider}).getInstance({
                    instanceId: instanceId
                }).then(async result=>{
                    // result.instance.metrics = {}
                    // result.instance.metrics.cpu = {}
                    // result.instance.metrics.memory = {}
                    // result.instance.metrics.cpu["last30"]=await new Monitoring(this.#provider).getCpuUsage(result.instance,30)
                    // await new monitoring(this.#provider).getMemoryUsage(result.instance,30).then(async metrics=>{
                    //     result.instance.metrics.memory["last30"]=metrics;
                    // });
//                     await new monitoring(this.#provider).getCpuUsage(result.instance,15).then(async metrics=>{
//                         result.instance.metrics.cpu["last15"]=metrics;
//                     })
//                     await new monitoring(this.#provider).getCpuUsage(result.instance,7).then(async metrics=>{
//                         result.instance.metrics.cpu["last7"]=metrics;
//                     })

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o bootVolume
                     */
                    resolve(result.instance)
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
    listInstances(){
        
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Define um array para armazenar
             */
            var linstancesList = [];

            /**
             * Consulta a lista de bootVolumes
             */
            new resourceSearch(this.#provider).find("instance resources").then(async insts=>{
                /**
                 * Varre a lista de boot volumes
                 */
                for (const inst of insts) {
                    await this.getInstance(inst.identifier).then(i=>{
                        linstancesList.push(i);
                    }).catch(error=>{
                        console.log("Erro ao consultar a instance " + inst.identifier + "\n\n" + error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(linstancesList)
            }).catch(error=>{
                reject(error);
            })
        })
    }
}

module.exports = Compute
