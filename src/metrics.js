let Util = require("./util");
const Monitoring = require('./monitoring')

class Metrics {

    #provider = "";
    #util = ""

    constructor(provider){
        this.#provider = provider;
        this.#util = new Util();
        return this;
    }

    getDiskMetrics(bv) {
        /**
         * Retorna a promise
         */
        return new Promise(async (resolve, reject) => {

            /** Obtém as metricas do disco
             */
            try {
                bv.metrics = {}
                bv.metrics.last1 = {}
                await new Monitoring(this.#provider).getVolumeReadThroughput(bv, 1).then(async metrics => {
                    bv.metrics.last1.readThroughputInMBs = metrics;
                });
                await new Monitoring(this.#provider).getVolumeWriteThroughput(bv, 1).then(async metrics => {
                    bv.metrics.last1.writeThroughputInMBs = metrics;
                });
                await new Monitoring(this.#provider).getVolumeGuaranteedThroughput(bv, 1).then(async metrics => {
                    bv.metrics.last1.guaranteedThroughputInMBs = metrics;
                });
                //console.log(bv)
                
                /**
                 * Retorna
                 */
                resolve(bv)
            } catch (error) {
                reject("Erro ao consultar o disco " + bv.id + "\n\n" + error)
            }
            
        
        })
    }

    getInstanceMetrics(ins) {
        /**
         * Retorna a promise
         */
        return new Promise(async (resolve, reject) => {

            /**
             * Obtém as métricas da instancia 
             */
            try {
                ins.metrics = {}
                ins.metrics.last1 = {}
                await new Monitoring(this.#provider).getCpuUsage(ins, 1).then(async metrics => {
                    ins.metrics.last1.cpu = metrics;
                });
                await new Monitoring(this.#provider).getMemoryUsage(ins, 1).then(async metrics => {
                    ins.metrics.last1.memory = metrics;
                });
                
                /**
                 * Retorna
                 */
                resolve(ins)
            } catch (error) {
                reject("Erro ao consultar a instance " + ar.id + "\n\n" + error)
            }
            
        
        })
    }
}

module.exports = Metrics