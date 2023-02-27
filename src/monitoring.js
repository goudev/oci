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
     * 
     * @param {string} instanceId ocid da instância
     * @param {int} days intervalo dos dias em que a metrica sera exibida
     * @param {int} interval intervalo de valores
     * @returns 
     */
    getCpuMetrics(instanceData,days,interval=60){
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
                        compartmentId: instanceData.compartmentId,
                        summarizeMetricsDataDetails: {
                            namespace: "oci_computeagent",
                            query: `(CPUUtilization[${interval}m]{resourceId = "${instanceData.id}"}.mean())`,
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
    getMemoryMetrics(instanceData,days,interval=60){
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
                        compartmentId: instanceData.compartmentId,
                        summarizeMetricsDataDetails: {
                            namespace: "oci_computeagent",
                            query: `(MemoryUtilization[${interval}m]{resourceId = "${instanceData.id}"}.mean())`,
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
    getCpuUsage(instanceData,days,interval=60){
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
                        compartmentId: instanceData.compartmentId,
                        summarizeMetricsDataDetails: {
                            namespace: "oci_computeagent",
                            query: `(CPUUtilization[${interval}m]{resourceId = "${instanceData.id}"}.mean())`,
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

    /**
     * 
     * @param {string} instanceId ocid da instância
     * @param {int} days intervalo dos dias em que a metrica sera exibida
     * @param {int} interval intervalo de valores
     * @returns 
     */
    getMemoryUsage(instanceData,days,interval=60){
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
                        compartmentId: instanceData.compartmentId,
                        summarizeMetricsDataDetails: {
                            namespace: "oci_computeagent",
                            query: `(MemoryUtilization[${interval}m]{resourceId = "${instanceData.id}"}.mean())`,
                            startTime: new Date( Date.now() - days * 24 * 60 * 60 * 1000),
                            endTime: new Date(),
                        }
                    }
                ).then(result=>{
                    if(result.items && result.items[0] && result.items[0].aggregatedDatapoints){
                        let memory = 0;
                        result.items[0].aggregatedDatapoints.forEach(item => {
                            memory = memory + item.value;
                        });
                        resolve(memory / result.items[0].aggregatedDatapoints.length)
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
