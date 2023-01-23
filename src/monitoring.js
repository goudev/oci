let Util = require("./util");
let Compute = require("./compute");
var monitoring = require("oci-monitoring");

class Monitoring {

    #provider = "";
    #util = ""

    constructor(provider){
        this.#provider = provider;
        this.#util = new Util();
        return this;
    }

    /**
     * Obtem o compartimento da instância
     */
    getCompartmentInstance(instanceId){
        return new Promise((resolve,reject)=>{
            new Compute(this.#provider).getInstance(instanceId).then(result=>{
                if(result.compartmentId){
                    resolve(result.compartmentId)
                }else{
                    reject("Nenhuma instância encontrada.")
                }
            }).catch(error=>{
                reject(error)
            })
        })
    }

    /**
     * 
     * @param {string} instanceId ocid da instância
     * @param {int} days intervalo dos dias em que a metrica sera exibida
     * @param {int} interval intervalo de valores
     * @returns 
     */
    getCpuMetrics(instanceId,days,interval=60){
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

             try {

                /**
                 * Obtem a metrica
                 */
                new monitoring.MonitoringClient({ authenticationDetailsProvider: this.#provider }).summarizeMetricsData(
                    {
                        compartmentId: await this.getCompartmentInstance(instanceId),
                        summarizeMetricsDataDetails: {
                            namespace: "oci_computeagent",
                            query: `(CPUUtilization[${interval}m]{resourceId = "${instanceId}"}.mean())`,
                            startTime: new Date( Date.now() - days * 24 * 60 * 60 * 1000),
                            endTime: new Date(),
                        }
                    }
                ).then(result=>{
                    resolve(result);
                }).catch(error=>{
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
     * 
     * @param {string} instanceId ocid da instância
     * @param {int} days intervalo dos dias em que a metrica sera exibida
     * @param {int} interval intervalo de valores
     * @returns 
     */
    getCpuUsage(instanceId,days,interval=60){
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

             try {

                /**
                 * Obtem a metrica
                 */
                new monitoring.MonitoringClient({ authenticationDetailsProvider: this.#provider }).summarizeMetricsData(
                    {
                        compartmentId: await this.getCompartmentInstance(instanceId),
                        summarizeMetricsDataDetails: {
                            namespace: "oci_computeagent",
                            query: `(CPUUtilization[${interval}m]{resourceId = "${instanceId}"}.mean())`,
                            startTime: new Date( Date.now() - days * 24 * 60 * 60 * 1000),
                            endTime: new Date(),
                        }
                    }
                ).then(result=>{
                    if(result.items && result.items[0] && result.items[0].aggregatedDatapoints){
                        let cpu = 0;
                        result.items[0].aggregatedDatapoints.forEach(item => {
                            cpu = cpu + item.value;
                        });
                        resolve(cpu / result.items[0].aggregatedDatapoints.length)
                    }else{
                        resolve(null);
                    }
                }).catch(error=>{
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

module.exports = Monitoring