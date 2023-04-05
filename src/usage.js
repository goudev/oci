let Util = require("./util");
const usageapi = require("oci-usageapi");

class Usage {

  #provider = "";
  #util = ""

  constructor(provider) {
    this.#provider = provider;
    this.#util = new Util();
    return this;
  }

  #dateToUTC(date) {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDay(), 0, 0, 0, 0))
  }

  listSummarizedUsage(resourceId, startDate, endDate, granularity) {

    /**
     * Retorna a promise
     */
    return new Promise(async (resolve, reject) => {

      /**
       * Define um array para armazenar
       */
      const usage = [];

      /**
       * Desabilita o console
       */
      this.#util.disableConsole();

      try {

        /**
         * Client
         */
        const client = new usageapi.UsageapiClient({
          authenticationDetailsProvider: this.#provider,
        });

        /**
         * Usage details
         */
        const usageDetails = {
          tenantId: this.#provider.getTenantId(),
          timeUsageStarted: this.#dateToUTC(startDate),
          timeUsageEnded: this.#dateToUTC(endDate),
          granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity[granularity],
          queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
          groupBy: ['skuPartNumber', 'skuName'],
          filter: {
            operator: usageapi.models.Filter.Operator.And,
            dimensions: [{
              key: 'resourceId',
              value: resourceId
            }]
          },
        };

        /**
         * Request details
         */
        const usageRequest = {
          requestSummarizedUsagesDetails: usageDetails,
          limit: 899,
        };

        /**
         * Making the request
         */
        const result = await client.requestSummarizedUsages(usageRequest)
        resolve(result.usageAggregation.items);

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
}

module.exports = Usage