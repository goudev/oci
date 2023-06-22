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

      const { items } = result.configurationAggregation;

      const accountConfig = {};
      for (const config of items) {
        const { key, values } = config;
        accountConfig[key] = values;
      }

      return accountConfig;
    } catch (error) {
      if(error.statusCode === 503) {
        throw error.message;
      }
      throw error;
    }
  }

  async listAccountOverviewFromTime(timeStart, timeEnd) {
    try {
      const client = new usageapi.UsageapiClient({
        authenticationDetailsProvider: this.#provider,
      });

      timeStart = new Date(timeStart);
      timeEnd = new Date(timeEnd) > new Date() ? new Date() : new Date(timeEnd);

      let controller = new Date(timeStart);
      controller.setMonth(timeStart.getMonth() + 1);

      let currentSpent = 0;

      while (timeStart < timeEnd) {
        const usageDetails = {
          tenantId: this.#provider.getTenantId(),
          timeUsageStarted: this.#dateToUTC(new Date(timeStart)),
          timeUsageEnded: this.#dateToUTC(new Date(controller)),
          granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Daily,
          queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
          groupBy: ['currency', 'unit', 'service'],
        };

        const result = await client.requestSummarizedUsages({ requestSummarizedUsagesDetails: usageDetails });
        const { items } = result.usageAggregation;

        items.forEach(usage => {
          currentSpent += usage.computedAmount;
        });

        timeStart.setMonth(timeStart.getMonth() + 1);
        controller.setMonth(controller.getMonth() + 1);
      }

      return currentSpent;
    } catch (error) {
      throw error;
    }
  }

  async listAccountOverviewByService() {
    return new Promise(async (resolve, reject) => {
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

        for (const service in services) {
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
          if (!usage.computedAmount) {
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
        for (const month in services[service]) {
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

      resolve({ series, categories })
    })
  }

  async listAccountOverview() {
    return new Promise(async (resolve, reject) => {
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

      resolve({ categories, data, history })
    })
  }

  listSummarizedUsageByService(startDate, endDate, granularity) {
    return new Promise(async (resolve, reject) => {
      try {
        const client = new usageapi.UsageapiClient({
          authenticationDetailsProvider: this.#provider,
        });

        const usageByServiceCurrent = {};
        const usageByServiceLast = {};

        for (let i = 0; i < 2; i++) {
          const result = await client.requestSummarizedUsages({
            requestSummarizedUsagesDetails: {
              tenantId: this.#provider.getTenantId(),
              timeUsageStarted: this.#dateToUTC(startDate),
              timeUsageEnded: this.#dateToUTC(endDate),
              granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity[granularity],
              queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
              groupBy: ['currency', 'unit', 'service', 'skuName'],
            }
          });

          const { items } = result.usageAggregation;

          let storage = 0;
          if (i === 0) { // Current month
            for (const item of items) {
              if (item.service.match(/storage/i)) {
                storage += item.computedAmount;
                usageByServiceCurrent['Storage'] = storage;
              }
              if (!isNaN(usageByServiceCurrent[item.service])) {
                usageByServiceCurrent[item.service] += item.computedAmount;
              } else {
                usageByServiceCurrent[item.service] = 0;
              }
            }
          } else { // Last month
            for (const item of items) {
              if (item.service.match(/storage/i)) {
                storage += item.computedAmount;
                usageByServiceLast['Storage'] = storage;
              }
              if (!isNaN(usageByServiceLast[item.service])) {
                usageByServiceLast[item.service] += item.computedAmount;
              } else {
                usageByServiceLast[item.service] = 0;
              }
            }
          }

          startDate.setMonth(startDate.getMonth() - 1);
          endDate.setMonth(endDate.getMonth() - 1);
        }

        for (const service in usageByServiceCurrent) {
          let improvement = 0;
          if (usageByServiceCurrent[service] !== 0 && usageByServiceLast[service] !== 0) {
            improvement = (usageByServiceCurrent[service] - usageByServiceLast[service]) / usageByServiceLast[service] * 100;
          } else if (usageByServiceLast[service] === 0) {
            improvement = 0;
          }
          
          const formatted = usageByServiceCurrent[service].toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
          });
          
          usageByServiceCurrent[service] = {
            value: formatted,
            improvement
          };
        }
        
        resolve(usageByServiceCurrent);
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