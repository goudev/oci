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
                ins.metrics.last24h = {}
                ins.metrics.last24hAverage = {}
                await new Monitoring(this.#provider).getCpuUsageByIntervals(ins, 1).then(async metrics => {
                    ins.metrics.last24h.cpu = metrics;
                });
                await new Monitoring(this.#provider).getMemoryUsageByIntervals(ins, 1).then(async metrics => {
                    ins.metrics.last24h.memory = metrics;
                });
                await new Monitoring(this.#provider).getCpuUsageAverage(ins, 1).then(async metrics => {
                    ins.metrics.last24hAverage.cpu = metrics;
                });
                await new Monitoring(this.#provider).getMemoryUsageAverage(ins, 1).then(async metrics => {
                    ins.metrics.last24hAverage.memory = metrics;
                });
                
                /**
                 * Retorna
                 */
                resolve(ins)
            } catch (error) {
                reject("Erro ao consultar a instance " + ins.id + "\n\n" + error)
            }
            
        
        })
    }
}

module.exports = Metrics