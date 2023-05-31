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

            /** Obtém as metricas dos discos
             */
            try {
                bv.metrics = {}
                bv.metrics.last24h = {}
                bv.metrics.last24hAverage = {}
                await new Monitoring(this.#provider).getVolumeReadThroughputByIntervals(bv, 1).then(async metrics => {
                    bv.metrics.last24h.readThroughputInMBs = metrics;
                });
                await new Monitoring(this.#provider).getVolumeWriteThroughputByIntervals(bv, 1).then(async metrics => {
                    bv.metrics.last24h.writeThroughputInMBs = metrics;
                });
                await new Monitoring(this.#provider).getVolumeGuaranteedThroughputByIntervals(bv, 1).then(async metrics => {
                    bv.metrics.last24h.guaranteedThroughputInMBs = metrics;
                });
                await new Monitoring(this.#provider).getVolumeReadThroughputAverage(bv, 1).then(async metrics => {
                    bv.metrics.last24hAverage.readThroughputInMBs = metrics;
                });
                await new Monitoring(this.#provider).getVolumeWriteThroughputAverage(bv, 1).then(async metrics => {
                    bv.metrics.last24hAverage.writeThroughputInMBs = metrics;
                });
                await new Monitoring(this.#provider).getVolumeGuaranteedThroughputAverage(bv, 1).then(async metrics => {
                    bv.metrics.last24hAverage.guaranteedThroughputInMBs = metrics;
                });
                
                /**
                 * Retorna
                 */
                resolve(bv)
            } catch (error) {
                console.log("Erro ao consultar o disco " + bv.id + "\n\n" + error)
                resolve()
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
                console.log("Erro ao consultar a instance " + ins.id + "\n\n" + error)
                resolve()
            }
            
        
        })
    }
}

module.exports = Metrics