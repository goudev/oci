let Util = require("./util");
const usageapi = require("oci-usageapi");
const { setTimeout } = require('timers/promises');

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

  async listAccountOverview(startDate, endDate) {
    try {
      /**
       * Usage API client
      */
      const client = new usageapi.UsageapiClient({
        authenticationDetailsProvider: this.#provider,
      });

      let currentMonth = new Date();
      let lastMonth = new Date(new Date().setDate(new Date().getDate() - 30));

      const categories = [];
      const data = []

      for (let i = 0; i <= 12; i++) {
        const usageDetails = {
          tenantId: this.#provider.getTenantId(),
          timeUsageStarted: this.#dateToUTC(new Date(lastMonth)),
          timeUsageEnded: this.#dateToUTC(new Date(currentMonth)),
          granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Daily,
          queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
          groupBy: ['currency', 'unit', 'service', 'skuName'],
        };

        const result = await client.requestSummarizedUsages({ requestSummarizedUsagesDetails: usageDetails });

        const month = String(lastMonth.toISOString()).slice(0, 7) + '-01T00:00:00.000Z';
        let amount = 0;

        for (const item of result.usageAggregation.items) {
          amount += item.computedAmount;
        }

        data.unshift(amount);
        categories.unshift(month);
  
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
      }

      return { categories, data }
      // categories.add(String(item.timeUsageStarted).slice(0, 7) + '-01T00:00:00.000Z');

      // const overview = {};

      // let currentMonth = new Date();
      // let lastMonth = new Date(new Date().setDate(new Date().getDate() - 30));

      /**
       * Últimos 12 meses
       */
      // for(let i = 0; i <= 12; i++){
      //   const currentDate = this.#setToFirstDay(currentMonth);
      //   const lastDate = this.#setToFirstDay(lastMonth);

      //   /**
      //    * Detalhes do request
      //    */
      //   const usageDetails = {
      //     tenantId: this.#provider.getTenantId(),
      //     timeUsageStarted: this.#dateToUTC(new Date(lastDate)),
      //     timeUsageEnded: this.#dateToUTC(new Date(currentDate)),
      //     granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Daily,
      //     queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
      //     groupBy: ['currency', 'unit', 'service', 'skuName'],
      //   };

      //   /**
      //    * Atualizar o "timeUsageStarted"
      //    * Atualizar o "timeUsageEnded"
      //    */
      //   currentMonth.setMonth(currentMonth.getMonth() - 1);
      //   lastMonth.setMonth(lastMonth.getMonth() - 1);

      //   /**
      //    * Criar um objeto com cada um dos últimos 12 meses
      //    */
      //   overview[lastDate.slice(0, 7)] = {};

      //   /**
      //    * Fazer o request
      //    */
      //   const result = await client.requestSummarizedUsages({ requestSummarizedUsagesDetails: usageDetails });
      //   for(const item of result.usageAggregation.items){
      //     services.add(item.service);
      //   }
      //   console.log(services)
      // }

    } catch (error) {
      throw error;
    }
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