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

  listSummarizedUsageByService(startDate, endDate, granularity) {
    return new Promise(async (resolve, reject) => {
      try {
        const client = new usageapi.UsageapiClient({
          authenticationDetailsProvider: this.#provider,
        });

        const usageDetails = {
          tenantId: this.#provider.getTenantId(),
          timeUsageStarted: this.#dateToUTC(startDate),
          timeUsageEnded: this.#dateToUTC(endDate),
          granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity[granularity],
          queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
          groupBy: ['currency', 'unit', 'service', 'skuName'],
          // filter: {
          //   operator: usageapi.models.Filter.Operator.And,
          //   dimensions: [{
          //     key: 'service',
          //     value: service
          //   }]
          // },
        };

        const usageRequest = {
          requestSummarizedUsagesDetails: usageDetails,
          limit: 1,
          page: 1
        };

        const result = await client.requestSummarizedUsages(usageRequest);

        const usageByService = {};
        for (const item of result.usageAggregation.items) {
          if (!isNaN(usageByService[item.service])) {
            usageByService[item.service] += item.computedAmount;
          } else {
            usageByService[item.service] = 0;
          }
        }

        for (const service in usageByService) {
          const formatted = usageByService[service].toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
          });

          usageByService[service] = formatted;
        }

        resolve(usageByService);
      } catch (error) {
        reject(error);
      }
    });
  }

  listSummarizedUsage(resourceId, startDate, endDate, granularity) {

    /**
     * Retorna a promise
     */
    return new Promise(async (resolve, reject) => {
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
          groupBy: ['skuPartNumber', 'skuName', 'unit', 'service'],
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