let Util = require("./util");
const resourceSearch = require('./resourceSearch');
const Instance = require('./compute')
const BlockVolume = require('./blockVolumes')
const BootVolume = require('./bootVolumes')
const Monitoring = require('./monitoring')

class Metrics {

    #provider = "";
    #util = ""

    constructor(provider){
        this.#provider = provider;
        this.#util = new Util();
        return this;
    }

    getBootVolumesMetrics() {

        /**
         * Retorna a promise
         */
        return new Promise(async (resolve, reject) => {

            /**
             * Define um array para armazenar
             */
            var bootVolumes = [];

            /**
             * Consulta a lista de bootVolumes
             */
            new resourceSearch(this.#provider).find("bootvolume resources where (lifecycleState = 'AVAILABLE')").then(async bvs => {

                /**
                 * Varre a lista de boot volumes
                 */
                for (const bv of bvs) {
                    await new BootVolume(this.#provider).getBootVolume(bv.identifier).then(async b => {
                        b.metrics = {}
                        b.metrics.last30 = {}
                        await new Monitoring(this.#provider).getVolumeReadThroughput(b, 30).then(async metrics => {
                            b.metrics.last30.readThroughputInMBs = metrics;
                        });
                        await new Monitoring(this.#provider).getVolumeWriteThroughput(b, 30).then(async metrics => {
                            b.metrics.last30.writeThroughputInMBs = metrics;
                        });
                        await new Monitoring(this.#provider).getVolumeGuaranteedThroughput(b, 30).then(async metrics => {
                            b.metrics.last30.guaranteedThroughputInMBs = metrics;
                        });
                        bootVolumes.push(b);
                    }).catch(error => {
                        reject("Erro ao consultar o disco " + bv.identifier + "\n\n" + error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(bootVolumes)
            }).catch(error => {
                reject(error);
            })
        })
    }

    getBlockVolumesMetrics() {

        /**
         * Retorna a promise
         */
        return new Promise(async (resolve, reject) => {

            /**
             * Define um array para armazenar
             */
            var blockVolumes = [];

            /**
             * Consulta a lista de blockVolumes
             */
            new resourceSearch(this.#provider).find("volume resources where (lifecycleState = 'AVAILABLE')").then(async bvs => {

                /**
                 * Varre a lista de block volumes
                 */
                for (const bv of bvs) {
                    await new BlockVolume(this.#provider).getBlockVolume(bv.identifier).then(async b => {
                        b.metrics = {}
                        b.metrics.last30 = {}
                        await new Monitoring(this.#provider).getVolumeReadThroughput(b, 30).then(async metrics => {
                            b.metrics.last30.readThroughputInMBs = metrics;
                        });
                        await new Monitoring(this.#provider).getVolumeWriteThroughput(b, 30).then(async metrics => {
                            b.metrics.last30.writeThroughputInMBs = metrics;
                        });
                        await new Monitoring(this.#provider).getVolumeGuaranteedThroughput(b, 30).then(async metrics => {
                            b.metrics.last30.guaranteedThroughputInMBs = metrics;
                        });
                        blockVolumes.push(b);
                    }).catch(error => {
                        reject("Erro ao consultar o disco " + bv.identifier + "\n\n" + error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(blockVolumes)
            }).catch(error => {
                reject(error);
            })
        })
    }

    getInstancesMetrics() {

        /**
         * Retorna a promise
         */
        return new Promise(async (resolve, reject) => {

            /**
             * Define um array para armazenar
             */
            var instances = [];

            /**
             * Consulta a lista de bootVolumes
             */
            new resourceSearch(this.#provider).find("instance resources").then(async insts => {

                /**
                 * Varre a lista de boot volumes
                 */
                for (const inst of insts) {
                    await new Instance(this.#provider).getInstance(inst.identifier).then(async i => {
                        i.metrics = {}
                        i.metrics.last30 = {}
                        await new Monitoring(this.#provider).getCpuUsage(i, 30).then(async metrics => {
                            i.metrics.last30.cpu = metrics;
                        });
                        await new Monitoring(this.#provider).getMemoryUsage(i, 30).then(async metrics => {
                            i.metrics.last30.memory = metrics;
                        });
                        instances.push(i);
                    }).catch(error => {
                        reject("Erro ao consultar a instance " + inst.identifier + "\n\n" + error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(instances)
            }).catch(error => {
                reject(error);
            })
        })
    }
}

module.exports = Metrics