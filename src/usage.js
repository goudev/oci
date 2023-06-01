let Util = require("./util");
const usageapi = require("oci-usageapi");
const servicesListOCI = require('../servicesListOCI');

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

  async listAccountConfig() {
    try {
      const client = new usageapi.UsageapiClient({
        authenticationDetailsProvider: this.#provider,
      });

      const result = await client.requestSummarizedConfigurations({
        tenantId: this.#provider.getTenantId(),
      });

      return result
    } catch (error) {
      throw error;
    }
  }

  async listAccountOverviewByService() {
    return new Promise(async(resolve, reject) => {
      /**
       * Defining the client to get the information
       */
      const client = new usageapi.UsageapiClient({
        authenticationDetailsProvider: this.#provider,
      });

      /**
       * Getting the month's scope
       */
      let monthEndFirstDate = new Date();
      monthEndFirstDate.setMonth(monthEndFirstDate.getMonth() + 1);
      monthEndFirstDate.setDate(1);

      let monthStartFirstDate = new Date();
      monthStartFirstDate.setDate(1);

      /**
       * Defining the lists we will need to return
       */
      const categories = [];
      const series = [];
      const services = {};

      /**
       * Populating an object with all the services OCI have
       */
      servicesListOCI.forEach(service => {
        services[service] = {};
      });

      /**
       * Get the data of the last last 12 months
       */
      for (let i = 0; i <= 12; i++) {
        /**
         * Adding the month key to each service in the object
        */
        const monthString = String(monthStartFirstDate.toISOString()).slice(0, 7) + '-01T00:00:00.000Z';

        for(const service in services) {
          services[service][monthString] = 0;
        }

        /**
         * Adding the month to a separated array
         */
        categories.push(monthString);
        
        /**
         * Request details
         */
        const usageDetails = {
          tenantId: this.#provider.getTenantId(),
          timeUsageStarted: this.#dateToUTC(new Date(monthStartFirstDate)),
          timeUsageEnded: this.#dateToUTC(new Date(monthEndFirstDate)),
          granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Daily,
          queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
          groupBy: ['currency', 'unit', 'service'],
        };

        /**
         * Making the request
         */
        const result = await client.requestSummarizedUsages({ requestSummarizedUsagesDetails: usageDetails });
        const { items } = result.usageAggregation;

        /**
         * Summing the cost for each specific month
         */
        items.forEach(usage => {
          if(!usage.computedAmount) {
            services[usage.service][monthString] += 0;
          } else {
            services[usage.service][monthString] += usage.computedAmount;
          }
        });

        /**
         * Changing the months
        */
       monthEndFirstDate.setMonth(monthEndFirstDate.getMonth() - 1);
       monthStartFirstDate.setMonth(monthStartFirstDate.getMonth() - 1);
      }

      /**
       * Formatting the output
       */
      for (const service in services) {
        const data = [];
        for (const month in services[service]){
          data.push(services[service][month]);
        }

        let improvement = 0;
        if (data[0] !== 0 && data[1] !== 0) {
          improvement = (data[0] - data[1]) / data[1] * 100;
        } else if (data[1] === 0) {
          improvement = 100;
        }

        series.push({
          name: service === ' ' ? 'Outros' : service,
          data,
          improvement,
        });
      }

      resolve ({ series, categories })
    })
  }

  async listAccountOverview() {
    return new Promise(async(resolve, reject) => {
      /**
       * Usage API client
      */
      const client = new usageapi.UsageapiClient({
        authenticationDetailsProvider: this.#provider,
      });

      let currentMonth = new Date();
      currentMonth.setMonth(currentMonth.getMonth() + 1);
      currentMonth.setDate(1);

      let lastMonth = new Date();
      lastMonth.setDate(1);

      const categories = [];
      const data = [];

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

      const history = {
        currentMonth: data[data.length - 1],
        lastMonth: data[data.length - 2]
      };

      resolve ({ categories, data, history })
    })
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
        let storage = 0;
        for (const item of result.usageAggregation.items) {
          if (item.service === 'Object Storage' || item.service === 'Block Storage' || item.service === 'File Storage') {
            storage += item.computedAmount;
            usageByService['Storage'] = storage;
          }
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