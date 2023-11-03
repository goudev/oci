let Util = require("./util");
const usageapi = require("oci-usageapi");
const common = require("oci-common");
const { DateTime } = require('luxon');
const _ = require('lodash');

class Usage {

  #provider = "";
  #util = ""
  #client;

  constructor(provider) {
    this.#provider = provider;
    this.#util = new Util();

    this.#client = new usageapi.UsageapiClient({
      authenticationDetailsProvider: this.#provider,
    });

    return this;
  }

  #dateToUTC(date) {
    return new Date(DateTime.fromJSDate(date).toUTC().toFormat('ccc LLL d 00:00:00 \'UTC\' yyyy'));
  }

  /**
   * Calc how much the spent has increased or decreased
   * @param {number} currentMonth current month spent
   * @param {number} lastMonth last month spent
   * @returns percent increased or decreased
   */
  #calcImprovement(currentMonth, lastMonth) {
    let improvement = 0;
    if (currentMonth !== 0 && lastMonth !== 0) {
      improvement = (currentMonth - lastMonth) / lastMonth * 100;
    } else if (currentMonth === 0 && lastMonth === 0) {
      improvement = 0;
    } else if (lastMonth === 0) {
      improvement = 100;
    } else {
      improvement = -100;
    }

    return improvement;
  }

  #listUsageCategories(quantity) {
    let monthStartFirstDate = new Date();
    monthStartFirstDate.setDate(1);

    const categories = [];

    for (let i = 0; i <= quantity; i++) {
      const monthString = new Date(String(this.#dateToUTC(monthStartFirstDate)));
      categories.push(monthString);
      monthStartFirstDate.setMonth(monthStartFirstDate.getMonth() - 1);
    }

    return categories;
  }

  async showServiceUsage(service, startDate, endDate) {
    try {
      const client = new usageapi.UsageapiClient({
        authenticationDetailsProvider: this.#provider,
      }, {
        retryConfiguration: {
          delayStrategy: new common.ExponentialBackoffDelayStrategy(30),
          terminationStrategy: new common.MaxTimeTerminationStrategy(60 * 60),
        }
      });

      const result = await client.requestSummarizedUsages({
        requestSummarizedUsagesDetails: {
          isAggregateByTime: true,
          tenantId: this.#provider.getTenantId(),
          timeUsageStarted: this.#dateToUTC(new Date(startDate)),
          timeUsageEnded: this.#dateToUTC(new Date(endDate)),
          granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Daily,
          queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
          groupBy: ['service'],
          filter: {
            operator: usageapi.models.Filter.Operator.And,
            dimensions: [
              {
                key: 'service',
                value: service
              }
            ]
          }
        }
      });

      const { items } = result.usageAggregation;
      return items;
    } catch (error) {
      throw error;
    }
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
      if (error.statusCode === 503) {
        throw error.message;
      }
      throw error;
    }
  }

  async getLast3MUsage() {
    /**
     * Retorna a promise
     */
    return new Promise(async (resolve, reject) => {
      /**
       * Desabilita o console
       */
      this.#util.disableConsole();

      try {
        var total = 0

        var today = new Date();
        var monthEnd = new Date()
        monthEnd.setDate(today.getDate() - 1)
        monthEnd.setHours(0, 0, 0, 0)
        var monthStart = new Date(monthEnd)
        monthStart.setMonth(monthStart.getMonth() - 3)

        /**
         * Client
         */
        new usageapi.UsageapiClient({ authenticationDetailsProvider: this.#provider }).requestSummarizedUsages({
          requestSummarizedUsagesDetails: {
            tenantId: this.#provider.getTenantId(),
            timeUsageStarted: this.#dateToUTC(new Date(monthStart)),
            timeUsageEnded: this.#dateToUTC(new Date(monthEnd)),
            granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Monthly,
            queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
            groupBy: ["service"]
          }
        }).then(result => {
          result.usageAggregation.items.forEach(res => {

            if (res.computedAmount === null) res.computedAmount = 0

            total += res.computedAmount

          })

          resolve(total)
        })

      } catch (error) {
        console.log(error)
      }


      /**
       * Habilita o console
       */
      this.#util.enableConsole();


    })
  }

  async listYearTotal() {
    try {
      /**
       * Getting months
       */
      const yearStart = new Date();
      yearStart.setMonth(0);
      yearStart.setDate(1);

      const nextDate = new Date();
      nextDate.setMonth(yearStart.getMonth() + 1);
      nextDate.setDate(1);

      const currentMonth = new Date().getMonth() + 1;

      let total = 0;

      for (let i = 0; i < currentMonth; i++) {
        /**
         * Making the request
         */
        const client = new usageapi.UsageapiClient({
          authenticationDetailsProvider: this.#provider,
        });

        const result = await client.requestSummarizedUsages({
          requestSummarizedUsagesDetails: {
            isAggregateByTime: true,
            tenantId: this.#provider.getTenantId(),
            timeUsageStarted: this.#dateToUTC(yearStart),
            timeUsageEnded: this.#dateToUTC(nextDate),
            granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Daily,
            queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
          }
        });

        const { items } = result.usageAggregation;

        for (const item of items) {
          total += item.computedAmount;
        }

        yearStart.setMonth(yearStart.getMonth() + 1);
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      return { [yearStart.getFullYear()]: total };
    } catch (error) {
      throw error;
    }
  }

  async listForecasting({ resourceId = null, days }) {
    try {
      const timeStarted = new Date();
      timeStarted.setDate(1);

      const forecastStarted = new Date();
      forecastStarted.setDate(forecastStarted.getUTCDate() - 1);

      const forecastEnded = new Date();
      forecastEnded.setDate(forecastStarted.getUTCDate() + days + 1);

      let requestSummarizedUsagesDetails;

      if (!days) {
        return { forecastCost: 0, forecastStarted, forecastEnded };
      }

      if (resourceId) {
        requestSummarizedUsagesDetails = {
          tenantId: this.#provider.getTenantId(),
          isForecast: true,
          timeUsageStarted: this.#dateToUTC(timeStarted),
          timeUsageEnded: this.#dateToUTC(forecastStarted),
          granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Monthly,
          queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
          forecast: {
            forecastType: usageapi.models.Forecast.ForecastType.Basic,
            timeForecastStarted: this.#dateToUTC(forecastStarted),
            timeForecastEnded: this.#dateToUTC(forecastEnded)
          },
          filter: {
            operator: usageapi.models.Filter.Operator.And,
            dimensions: [
              {
                key: 'resourceId',
                value: resourceId,
              }
            ]
          }
        };
      } else {
        requestSummarizedUsagesDetails = {
          tenantId: this.#provider.getTenantId(),
          isForecast: true,
          timeUsageStarted: this.#dateToUTC(timeStarted),
          timeUsageEnded: this.#dateToUTC(forecastStarted),
          granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Monthly,
          queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
          forecast: {
            forecastType: usageapi.models.Forecast.ForecastType.Basic,
            timeForecastStarted: this.#dateToUTC(forecastStarted),
            timeForecastEnded: this.#dateToUTC(forecastEnded)
          },
        };
      }

      const result = await this.#client.requestSummarizedUsages({
        requestSummarizedUsagesDetails,
      });

      let forecastCost = 0;
      for (const i of result.usageAggregation.items) {
        forecastCost += i.computedAmount;
      }

      return { forecastCost, forecastStarted, forecastEnded };
    } catch (error) {
      throw error;
    }
  }

  async listAccountOverviewByService(services) {
    try {
      /**
       * Consulting each service
      */
      const series = [];


      for (const service of services) {
        /**
         * Getting the month's scope
         */
        let monthEndFirstDate = new Date();
        monthEndFirstDate.setMonth(monthEndFirstDate.getMonth() + 1);
        monthEndFirstDate.setDate(1);

        let monthStartFirstDate = new Date();
        monthStartFirstDate.setDate(1);

        /**
         * Consulting each month of the last year
        */
        const data = [];

        for (let i = 0; i <= 11; i++) {
          const result = await this.showServiceUsage(service, monthStartFirstDate, monthEndFirstDate);
          /**
           * Summing the value of each month
          */
          let amount = 0;

          for (const item of result) {
            amount += item.computedAmount;
          }

          data.push(amount);

          /**
           * Updating month's scope
           */
          monthEndFirstDate.setMonth(monthEndFirstDate.getMonth() - 1);
          monthStartFirstDate.setMonth(monthStartFirstDate.getMonth() - 1);
        }

        /**
         * Calculating the improvement over the last month
         */
        const improvement = this.#calcImprovement(data[0], data[1]);
        series.push({ name: service, data, improvement });
      }

      /**
       * Merging storage services
       */
      const storageData = [];
      for (const service of series) {
        if (service.name.match(/storage/i) || service.name.match(/store/i)) {
          for (let i = 0; i < service.data.length; i++) {
            if (!storageData[i]) storageData[i] = service.data[i];
            else storageData[i] += service.data[i];
          }
        }
      }

      const improvement = this.#calcImprovement(storageData[0], storageData[1]);
      series.push({ name: 'STORAGE', data: storageData, improvement })
      const categories = this.#listUsageCategories(11);
      return { categories, series };
    } catch (error) {
      throw error;
    }
  }

  async listAccountOverview() {
    try {
      /**
       * Client to connect to the OCI
       */
      const client = new usageapi.UsageapiClient({
        authenticationDetailsProvider: this.#provider,
      });

      /**
       * Setting up MONTH's scope
       */
      let currentMonth = new Date();
      currentMonth.setMonth(currentMonth.getMonth() + 1);
      currentMonth.setDate(1);

      let lastMonth = new Date();
      lastMonth.setDate(1);

      /**
       * Valores agregados
       */
      const categories = [];
      const data = [];

      for (let i = 0; i <= 12; i++) {
        const result = await client.requestSummarizedUsages({
          requestSummarizedUsagesDetails: {
            tenantId: this.#provider.getTenantId(),
            timeUsageStarted: this.#dateToUTC(new Date(lastMonth)),
            timeUsageEnded: this.#dateToUTC(new Date(currentMonth)),
            granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Daily,
            queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
          }
        });

        const { items } = result.usageAggregation;

        let amount = 0;
        for (const item of items) {
          amount += item.computedAmount;
        }

        const month = new Date(String(this.#dateToUTC(lastMonth)))

        data.push(amount);
        categories.push(month);

        currentMonth.setMonth(currentMonth.getMonth() - 1);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
      }

      const history = {
        currentMonth: data[0],
        lastMonth: data[1]
      };

      return { categories, data, history };
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

  // Pega o custo atual dos recursos individuais
  getIndividualResourcesActualUsage() {
    /**
     * Retorna a promise
     */
    return new Promise(async (resolve, reject) => {
      /**
       * Desabilita o console
       */
      this.#util.disableConsole();

      try {

        let monthStart = new Date();
        monthStart.setDate(1);

        let monthEnd = new Date();
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setDate(1);

        /**
         * Client
         */
        new usageapi.UsageapiClient({ authenticationDetailsProvider: this.#provider }).requestSummarizedUsages({
          requestSummarizedUsagesDetails: {
            tenantId: this.#provider.getTenantId(),
            timeUsageStarted: this.#dateToUTC(monthStart),
            timeUsageEnded: this.#dateToUTC(monthEnd),
            granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Monthly,
            queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
            groupBy: ["resourceId", "service"]
          }
        }).then(result => {
          result.usageAggregation.items.forEach(i => {
            if (i.computedAmount == null) i.computedAmount = 0
          })

          resolve(result.usageAggregation.items);
        })

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

  // Pega o uso total por mês dos últimos 12 meses, por service
  getLast12MUsageByServices() {
    /**
     * Retorna a promise
     */
    return new Promise(async (resolve, reject) => {
      /**
       * Desabilita o console
       */
      this.#util.disableConsole();

      try {
        var x = []
        var today = new Date();
        var year = today.getFullYear();
        var month = today.getMonth() + 1
        var monthEnd = new Date(year, month, 1)
        var monthStart = new Date(year, month - 12, 1)
        /**
         * Client
         */
        new usageapi.UsageapiClient({ authenticationDetailsProvider: this.#provider }).requestSummarizedUsages({
          requestSummarizedUsagesDetails: {
            tenantId: this.#provider.getTenantId(),
            timeUsageStarted: this.#dateToUTC(monthStart),
            timeUsageEnded: this.#dateToUTC(monthEnd),
            granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Monthly,
            queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
            groupBy: ["service", "resourceId"]
          }
        }).then(async result => {

          // Função para agrupar por "service"
          function groupByService(data) {
            const groupedData = {};
            groupedData['Database'] = []
            groupedData['File Storage'] = []
            groupedData['Container Engine for Kubernetes'] = []
            data.forEach((item) => {
              const { service, timeUsageStarted, computedAmount } = item;
              if (!groupedData[service]) {
                groupedData[service] = [];
              }
              groupedData[service].push({ timeUsageStarted, computedAmount });
            });
            data.forEach(resource => {
              var { computedAmount, timeUsageStarted } = resource
              if (resource.resourceId.split('.')[1] == 'instance') {
                if (!groupedData['Instance']) {
                  groupedData['Instance'] = []
                }
                groupedData['Instance'].push({ timeUsageStarted, computedAmount })
              }
            })
            return groupedData;
          }

          // Função para calcular a soma dos "computedAmount" com base no "timeUsageStarted"
          function sumComputedAmounts(groupedData) {
            for (const service in groupedData) {
              const entries = groupedData[service];
              const sums = {};
              entries.forEach((entry) => {
                const { timeUsageStarted, computedAmount } = entry;
                sums[timeUsageStarted] = (sums[timeUsageStarted] || 0) + computedAmount;
              });
              groupedData[service] = Object.entries(sums).map(([timeUsageStarted, computedAmount]) => ({
                timeUsageStarted,
                computedAmount,
              }));
            }
            return groupedData;
          }

          // Função para preencher com valores padrão caso não tenha "timeUsageStarted"
          function fillMissingTimeUsage(groupedData) {
            const timeUsages = new Set();
            for (const service in groupedData) {
              const entries = groupedData[service];
              entries.forEach((entry) => {
                timeUsages.add(entry.timeUsageStarted);
              });
            }
            const sortedTimeUsages = Array.from(timeUsages).sort((a, b) => new Date(b) - new Date(a));

            for (const service in groupedData) {
              const entries = groupedData[service];
              const timeUsageSet = new Set(entries.map((entry) => entry.timeUsageStarted));
              sortedTimeUsages.forEach((timeUsage) => {
                if (!timeUsageSet.has(timeUsage)) {
                  entries.push({ timeUsageStarted: timeUsage, computedAmount: 0 });
                }
              });
              entries.sort((a, b) => new Date(b.timeUsageStarted) - new Date(a.timeUsageStarted));
            }

            return groupedData;
          }

          // Agrupa os objetos por "service"
          const groupedByService = groupByService(result.usageAggregation.items);

          // Calcula a soma dos "computedAmount" por "timeUsageStarted"
          const summedComputedAmounts = sumComputedAmounts(groupedByService);

          // Preenche com valores padrão caso não tenha "timeUsageStarted"
          const finalResult = fillMissingTimeUsage(summedComputedAmounts);

          function isStorage(name) {
            return name.toLowerCase().includes('storage') || name.toLowerCase().includes('store');
          }

          // Função para calcular a soma dos valores do mesmo índice nos arrays de storage
          function calculateStorageSum(data) {
            const storageSum = [];
            for (let i = 0; i < data['Compute'].length; i++) {
              const sum = Object.keys(data).reduce((acc, key) => {
                if (isStorage(key)) {
                  acc += data[key][i].computedAmount;
                }
                return acc;
              }, 0);

              // Cria um objeto com os campos 'timeUsageStarted' e 'computedAmount'
              const storageObj = {
                timeUsageStarted: data['Compute'][i].timeUsageStarted,
                computedAmount: sum,
              };

              storageSum.push(storageObj);
            }
            return storageSum;
          }

          // Adiciona o novo array "storage" ao objeto "data"
          finalResult['Storage'] = calculateStorageSum(finalResult);

          for (const service in finalResult) {
            const serviceData = finalResult[service].slice(0, 2);
            const recentTwoValues = serviceData.map((item) => item.computedAmount);
            finalResult[service].push({ improvement: this.#calcImprovement(recentTwoValues[0], recentTwoValues[1]) })
          }


          resolve(finalResult);

        })

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

  // Pega o gasto total do ano atual
  getActualYearTotalUsage() {
    /**
     * Retorna a promise
     */
    return new Promise(async (resolve, reject) => {
      /**
       * Desabilita o console
       */
      this.#util.disableConsole();

      try {
        var today = new Date();
        var year = today.getFullYear();
        var month = today.getMonth()
        var yearStart = new Date(year, 0, 1)
        var nextMonth = new Date(year, month + 1, 1)

        new usageapi.UsageapiClient({ authenticationDetailsProvider: this.#provider }).requestSummarizedUsages({
          requestSummarizedUsagesDetails: {
            tenantId: this.#provider.getTenantId(),
            timeUsageStarted: this.#dateToUTC(yearStart),
            timeUsageEnded: this.#dateToUTC(nextMonth),
            granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Monthly,
            queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
            groupBy: ["service"]
          }
        }).then(result => {
          var amount = 0
          result.usageAggregation.items.forEach(res => {
            amount += res.computedAmount
          })

          resolve({ [year]: amount });
        })

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

  // Pega o uso total por mes dos último 12 meses
  getLast12MTotalUsageByMonth() {
    /**
     * Retorna a promise
     */
    return new Promise(async (resolve, reject) => {
      /**
       * Desabilita o console
       */
      this.#util.disableConsole();

      try {
        var today = new Date();
        var monthStart = new Date(today.getFullYear(), today.getMonth() - 12, today.getDate())
        var monthFinish = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

        /**
         * Client
         */
        new usageapi.UsageapiClient({ authenticationDetailsProvider: this.#provider }).requestSummarizedUsages({
          requestSummarizedUsagesDetails: {
            tenantId: this.#provider.getTenantId(),
            timeUsageStarted: this.#dateToUTC(monthStart),
            timeUsageEnded: this.#dateToUTC(monthFinish),
            granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Monthly,
            queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
            groupBy: ["service"]
          }
        }).then(async result => {

          function groupAndSumByTimeUsageStarted(objects) {
            const groups = {};
            objects.forEach((obj) => {
              var refferDate = obj.timeUsageStarted.split('T')[0].split('-');
              refferDate = refferDate[0] + "-" + refferDate[1] + "-01";

              if (!groups[refferDate]) {
                groups[refferDate] = {
                  timeUsageStarted: refferDate,
                  computedAmountSum: 0,
                };
              }
              if (obj.computedAmount) {
                groups[refferDate].computedAmountSum += obj.computedAmount;
              }
            });

            const sortedGroups = Object.values(groups)
              .sort((a, b) => new Date(b.timeUsageStarted).getTime() - new Date(a.timeUsageStarted).getTime());


            return sortedGroups;
          }

          const resultParsed = groupAndSumByTimeUsageStarted(result.usageAggregation.items);

          var twoRecentCosts = resultParsed.slice(0, 2).map(item => item.computedAmountSum);
          var history = {
            currentMonth: twoRecentCosts[0] || 0,
            lastMonth: twoRecentCosts[1] || 0,
          }

          resolve({ data: resultParsed, history });

        })

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


  groupAndSum(data) {
    return _.chain(data)
      .groupBy('timeUsageStarted')
      .map((group, timeUsageStarted) => ({
        timeUsageStarted,
        computedAmount: _.sumBy(group, 'computedAmount')
      }))
      .orderBy('timeUsageStarted', 'desc')
      .value();
  }

  listCostWithoutFilter (baseDate = new Date(), granularity = 'DAILY') {
    return new Promise(async (resolve, reject) => {
      this.#util.disableConsole();
      

      try {
        let timeUsageStarted
        let timeUsageEnded
       
        switch (granularity) {
          case 'DAILY':
            const startDate = new Date(baseDate)
            startDate.setDate(baseDate.getDate() - 90)    
            timeUsageStarted = this.#dateToUTC(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()))
            timeUsageEnded = this.#dateToUTC(new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate()))
            break
          case 'MONTHLY':
            timeUsageStarted = this.#dateToUTC(new Date(baseDate.getFullYear(), baseDate.getMonth() - 11, 1))
            timeUsageEnded = this.#dateToUTC(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1))
            break
          
        }
        
        new usageapi.UsageapiClient({ authenticationDetailsProvider: this.#provider }).requestSummarizedUsages({
          requestSummarizedUsagesDetails: {
            tenantId: this.#provider.getTenantId(),
            timeUsageStarted,
            timeUsageEnded,
            granularity,
            queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
            groupBy: ["tagKey", "tagValue", "service"],

          }
        }).then(async result => {
          const items = result.usageAggregation.items.map(item => {
             return {
              amount: item.computedAmount || 0,
              quantity: item.computedQuantity || 0,
              service: item.service,
              tags: item.tags,
              timeUsageStarted: item.timeUsageStarted,
              timeUsageEnded: item.timeUsageEnded,
              granularity
             }
          })

          resolve(items)          
        })
      } catch (error) {
        this.#util.enableConsole();
        reject(error.message || error)
      }
    })
  }

  listCostDaily() {
    return new Promise(async (resolve, reject) => {
      this.#util.disableConsole();

      try {
        const today = new Date();
        const firstDate = new Date(today)
        firstDate.setDate(today.getDate() - 90)

        const monthStart = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate())
        const monthEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate())

        new usageapi.UsageapiClient({ authenticationDetailsProvider: this.#provider }).requestSummarizedUsages({
          requestSummarizedUsagesDetails: {
            tenantId: this.#provider.getTenantId(),
            timeUsageStarted: this.#dateToUTC(monthStart),
            timeUsageEnded: this.#dateToUTC(monthEnd),
            granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Daily,
            queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
            groupBy: ["service"],

          }
        }).then(async result => {
          const uniqueTimeUsageStarted = [...new Set(result.usageAggregation.items.map(entry => entry.timeUsageStarted))];
          const groupedSummedAndFilledData = {};

          // Iterate through the usageData array to initialize the structure and sum services with "storage" or "store" in their names
          result.usageAggregation.items.forEach(entry => {
            const service = entry.service;
            const timeUsageStarted = entry.timeUsageStarted;
            const computedAmount = entry.computedAmount;

            // Check if the service name contains "storage" or "store"
            const isStorageService = /storage|store/i.test(service);

            if (!groupedSummedAndFilledData[service]) {
              groupedSummedAndFilledData[service] = []
            }


            groupedSummedAndFilledData[service].push({
              timeUsageStarted,
              computedAmount: computedAmount || 0
            })

            if (isStorageService) {
              if (!groupedSummedAndFilledData["Storage"]) {
                groupedSummedAndFilledData["Storage"] = [];
              }


              groupedSummedAndFilledData["Storage"].push({
                timeUsageStarted,
                computedAmount: computedAmount || 0
              })
            }
          });

          uniqueTimeUsageStarted.sort((a, b) => new Date(b) - new Date(a));
          // Fill in missing timeUsageStarted entries with a computedAmount of 0
          for (const service in groupedSummedAndFilledData) {
            for (const time of uniqueTimeUsageStarted) {
              const entry = groupedSummedAndFilledData[service].find(item => item.timeUsageStarted === time)


              if (!entry) {
                groupedSummedAndFilledData[service].push({ timeUsageStarted: time, computedAmount: 0 });
              }
            }
          }

          // Sort the uniqueTimeUsageStarted values in descending order

          // Sort the entries within each service based on timeUsageStarted
          for (const service in groupedSummedAndFilledData) {
            const serviceData = groupedSummedAndFilledData[service];
            const sortedServiceData = this.groupAndSum(serviceData);

            groupedSummedAndFilledData[service] = sortedServiceData;
          }

          groupedSummedAndFilledData['Instance'] = await this.listCostDailyInstances()

          resolve(groupedSummedAndFilledData)
        })
      } catch (error) {
        this.#util.enableConsole();
        reject(error.message || error)
      }
    })
  }

  listCostDailyWithTags() {
    return new Promise(async (resolve, reject) => {
      this.#util.disableConsole();

      try {
        const today = new Date();
        const firstDate = new Date(today);
        firstDate.setDate(today.getDate() - 90);

        const monthStart = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate());
        const monthEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        new usageapi.UsageapiClient({ authenticationDetailsProvider: this.#provider }).requestSummarizedUsages({
          requestSummarizedUsagesDetails: {
            tenantId: this.#provider.getTenantId(),
            timeUsageStarted: this.#dateToUTC(monthStart),
            timeUsageEnded: this.#dateToUTC(monthEnd),
            granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Daily,
            queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
            groupBy: ["service"]
          }
        }).then(async result => {
          var itens = [];
          result.usageAggregation.items.forEach(entry => {
            const isStorageService = /storage|store/i.test(entry.service);
            var service = isStorageService ? "Storage" : entry.service

            itens.push({
              service: service == null ? " " : service,
              timeUsageStarted: entry.timeUsageStarted,
              currency: entry.currency,
              computedAmount: entry.computedAmount,
              tags: entry.tags
            });
          });

          // Agrupar por data e por serviço
          const groupedItems = itens.reduce((acc, item) => {
            const day = item.timeUsageStarted.split('T')[0]; // Obtém apenas a parte da data

            acc[day] = acc[day] || {};
            acc[day][item.service] = acc[day][item.service] || [];
            acc[day][item.service].push(item);

            return acc;
          }, {});

          // Obter e ordenar as chaves (datas)
          const sortedDates = Object.keys(groupedItems).sort();

          // Criar um novo objeto ordenado
          const orderedGroupedItems = {};
          sortedDates.forEach(day => {
            orderedGroupedItems[day] = groupedItems[day];
          });

          // Ordenar cada grupo por serviço e por data
          for (const day in orderedGroupedItems) {
            for (const service in orderedGroupedItems[day]) {
              orderedGroupedItems[day][service] = orderedGroupedItems[day][service].sort((a, b) => {
                const valueA = a['timeUsageStarted'];
                const valueB = b['timeUsageStarted'];
                return valueA < valueB ? -1 : (valueA > valueB ? 1 : 0);
              });
            }
          }

          resolve(orderedGroupedItems);
        });
      } catch (error) {
        this.#util.enableConsole();
        reject(error.message || error);
      }
    });
  }

  filterPeriodCostWithTags(startAt, finishAt) {
    return new Promise(async (resolve, reject) => {
      try {
        new usageapi.UsageapiClient({ authenticationDetailsProvider: this.#provider }).requestSummarizedUsages({
          requestSummarizedUsagesDetails: {
            tenantId: this.#provider.getTenantId(),
            timeUsageStarted: this.#dateToUTC(startAt),
            timeUsageEnded: this.#dateToUTC(finishAt),
            granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Daily,
            queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
            groupBy: ["service"]
          }
        }).then(async result => {
          var itens = [];
          result.usageAggregation.items.forEach(entry => {
            const isStorageService = /storage|store/i.test(entry.service);
            var service = isStorageService ? "Storage" : entry.service

            itens.push({
              service: service == null ? " " : service,
              timeUsageStarted: entry.timeUsageStarted,
              currency: entry.currency,
              computedAmount: entry.computedAmount,
              tags: entry.tags
            });
          });

          resolve(itens);
        });
      } catch (error) {
        reject(error.message || error);
      }
    });
  }

  listCostDailyInstances() {
    /**
     * Retorna a promise
     */
    return new Promise(async (resolve, reject) => {
      /**
       * Desabilita o console
       */
      this.#util.disableConsole();

      try {
        const today = new Date();
        const firstDate = new Date(today)
        firstDate.setDate(today.getDate() - 90)

        const monthStart = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate())
        const monthEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        /**
         * Client
         */
        new usageapi.UsageapiClient({ authenticationDetailsProvider: this.#provider }).requestSummarizedUsages({
          requestSummarizedUsagesDetails: {
            tenantId: this.#provider.getTenantId(),
            timeUsageStarted: this.#dateToUTC(monthStart),
            timeUsageEnded: this.#dateToUTC(monthEnd),
            granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Daily,
            queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
            groupBy: ["service", "resourceId"],
            filter: {
              operator: usageapi.models.Filter.Operator.And,
              dimensions: [
                {
                  key: "service",
                  value: "COMPUTE"
                }
              ]
            }
          }
        }).then(async result => {
          var x = []
          result.usageAggregation.items.forEach(i => {
            if (i.resourceId.split('.')[1] == 'instance') {
              x.push(i)
            }
          })
          const uniqueTimeUsageStarted = [...new Set(x.map(entry => entry.timeUsageStarted))];

          // Create an empty object to store the grouped, summed, and filled data
          const groupedSummedAndFilledData = {};

          // Iterate through the usageData array to initialize the structure and sum services with "storage" or "store" in their names
          x.forEach(entry => {
            const timeUsageStarted = entry.timeUsageStarted;
            const computedAmount = entry.computedAmount;

            if (!groupedSummedAndFilledData["Instance"]) {
              groupedSummedAndFilledData["Instance"] = []
            }

            groupedSummedAndFilledData["Instance"].push({
              timeUsageStarted,
              computedAmount: computedAmount || 0
            })

          });

          uniqueTimeUsageStarted.sort((a, b) => new Date(b) - new Date(a));
          // Fill in missing timeUsageStarted entries with a computedAmount of 0
          for (const service in groupedSummedAndFilledData) {
            for (const time of uniqueTimeUsageStarted) {
              const entry = groupedSummedAndFilledData[service].find(item => item.timeUsageStarted === time)


              if (!entry) {
                groupedSummedAndFilledData[service].push({ timeUsageStarted: time, computedAmount: 0 });
              }
            }
          }
          // Sort the entries within each service based on timeUsageStarted
          for (const service in groupedSummedAndFilledData) {
            const serviceData = groupedSummedAndFilledData[service];
            const sortedServiceData = this.groupAndSum(serviceData);

            groupedSummedAndFilledData[service] = sortedServiceData;
          }

          resolve(groupedSummedAndFilledData.Instance)

        })
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

  listLast12MUsageByService() {
    /**
     * Retorna a promise
     */
    return new Promise(async (resolve, reject) => {
      /**
       * Desabilita o console
       */
      this.#util.disableConsole();

      try {
        var today = new Date();
        var year = today.getFullYear();
        var month = today.getMonth() + 1
        var monthEnd = new Date(year, month, 1)
        var monthStart = new Date(year, month - 12, 1)
        /**
         * Client
         */


        new usageapi.UsageapiClient({ authenticationDetailsProvider: this.#provider }).requestSummarizedUsages({
          requestSummarizedUsagesDetails: {
            tenantId: this.#provider.getTenantId(),
            timeUsageStarted: this.#dateToUTC(monthStart),
            timeUsageEnded: this.#dateToUTC(monthEnd),
            granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Monthly,
            queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
            groupBy: ["service"]
          }
        }).then(async result => {

          const uniqueTimeUsageStarted = [...new Set(result.usageAggregation.items.map(entry => entry.timeUsageStarted))];

          // Create an empty object to store the grouped, summed, and filled data
          const groupedSummedAndFilledData = {};

          // Iterate through the usageData array to initialize the structure and sum services with "storage" or "store" in their names
          result.usageAggregation.items.forEach(entry => {
            const service = entry.service;
            const timeUsageStarted = entry.timeUsageStarted;
            const computedAmount = entry.computedAmount;

            // Check if the service name contains "storage" or "store"
            const isStorageService = /storage|store/i.test(service);

            if (!groupedSummedAndFilledData[service]) {
              groupedSummedAndFilledData[service] = []
            }


            groupedSummedAndFilledData[service].push({
              timeUsageStarted,
              computedAmount: computedAmount || 0
            })

            if (isStorageService) {
              if (!groupedSummedAndFilledData["Storage"]) {
                groupedSummedAndFilledData["Storage"] = [];
              }


              groupedSummedAndFilledData["Storage"].push({
                timeUsageStarted,
                computedAmount: computedAmount || 0
              })
            }
          });

          uniqueTimeUsageStarted.sort((a, b) => new Date(b) - new Date(a));
          // Fill in missing timeUsageStarted entries with a computedAmount of 0
          for (const service in groupedSummedAndFilledData) {
            for (const time of uniqueTimeUsageStarted) {
              const entry = groupedSummedAndFilledData[service].find(item => item.timeUsageStarted === time)


              if (!entry) {
                groupedSummedAndFilledData[service].push({ timeUsageStarted: time, computedAmount: 0 });
              }
            }
          }

          // Sort the uniqueTimeUsageStarted values in descending order

          // Sort the entries within each service based on timeUsageStarted
          for (const service in groupedSummedAndFilledData) {
            const serviceData = groupedSummedAndFilledData[service];
            const sortedServiceData = this.groupAndSum(serviceData);

            groupedSummedAndFilledData[service] = sortedServiceData;
          }


          for (const service in groupedSummedAndFilledData) {
            const serviceData = groupedSummedAndFilledData[service];
            const firstTwoValues = serviceData.slice(0, 2).map((entry) => entry.computedAmount);
            const processedResult = this.#calcImprovement(...firstTwoValues);

            // Add the processed result at the end of the service entry
            serviceData.push({ improvement: processedResult });
          }

          groupedSummedAndFilledData['Instance'] = await this.getLast12MInstancesUsage()

          resolve(groupedSummedAndFilledData)
        })


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

  // Pega o uso total por mês dos últimos 12 meses das instances
  getLast12MInstancesUsage() {
    /**
     * Retorna a promise
     */
    return new Promise(async (resolve, reject) => {
      /**
       * Desabilita o console
       */
      this.#util.disableConsole();

      try {
        var today = new Date();
        var year = today.getFullYear();
        var month = today.getMonth() + 1
        var monthEnd = new Date(year, month, 1)
        var monthStart = new Date(year, month - 12, 1)
        /**
         * Client
         */
        new usageapi.UsageapiClient({ authenticationDetailsProvider: this.#provider }).requestSummarizedUsages({
          requestSummarizedUsagesDetails: {
            tenantId: this.#provider.getTenantId(),
            timeUsageStarted: this.#dateToUTC(monthStart),
            timeUsageEnded: this.#dateToUTC(monthEnd),
            granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Monthly,
            queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
            groupBy: ["service", "resourceId"],
            filter: {
              operator: usageapi.models.Filter.Operator.And,
              dimensions: [
                {
                  key: "service",
                  value: "COMPUTE"
                }
              ]
            }
          }
        }).then(async result => {
          var x = []
          result.usageAggregation.items.forEach(i => {
            if (i.resourceId.split('.')[1] == 'instance') {
              x.push(i)
            }
          })
          const uniqueTimeUsageStarted = [...new Set(x.map(entry => entry.timeUsageStarted))];

          // Create an empty object to store the grouped, summed, and filled data
          const groupedSummedAndFilledData = {};

          // Iterate through the usageData array to initialize the structure and sum services with "storage" or "store" in their names
          x.forEach(entry => {
            const timeUsageStarted = entry.timeUsageStarted;
            const computedAmount = entry.computedAmount;

            if (!groupedSummedAndFilledData["Instance"]) {
              groupedSummedAndFilledData["Instance"] = []
            }

            groupedSummedAndFilledData["Instance"].push({
              timeUsageStarted,
              computedAmount: computedAmount || 0
            })

          });

          uniqueTimeUsageStarted.sort((a, b) => new Date(b) - new Date(a));
          // Fill in missing timeUsageStarted entries with a computedAmount of 0
          for (const service in groupedSummedAndFilledData) {
            for (const time of uniqueTimeUsageStarted) {
              const entry = groupedSummedAndFilledData[service].find(item => item.timeUsageStarted === time)


              if (!entry) {
                groupedSummedAndFilledData[service].push({ timeUsageStarted: time, computedAmount: 0 });
              }
            }
          }
          // Sort the entries within each service based on timeUsageStarted
          for (const service in groupedSummedAndFilledData) {
            const serviceData = groupedSummedAndFilledData[service];
            const sortedServiceData = this.groupAndSum(serviceData);

            groupedSummedAndFilledData[service] = sortedServiceData;
          }

          for (const service in groupedSummedAndFilledData) {
            const serviceData = groupedSummedAndFilledData[service];
            const firstTwoValues = serviceData.slice(0, 2).map((entry) => entry.computedAmount);
            const processedResult = this.#calcImprovement(...firstTwoValues);

            // Add the processed result at the end of the service entry
            serviceData.push({ improvement: processedResult });
          }

          resolve(groupedSummedAndFilledData.Instance)

        })
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

  forecastInstances() {
    /**
     * Retorna a promise
     */
    return new Promise(async (resolve, reject) => {
      /**
       * Desabilita o console
       */
      this.#util.disableConsole();

      var forecasts = [7, 15, 30, 60]
      var today = new Date();
      var monthEnd = new Date()
      monthEnd.setDate(today.getDate() - 1)
      monthEnd.setHours(0, 0, 0, 0)
      var monthStart = new Date(monthEnd)
      monthStart.setMonth(monthStart.getMonth() - 1)
      var forecastResults = []

      try {
        for (const day of forecasts) {
          var forecastEnd = new Date(today)
          forecastEnd.setDate(today.getDate() + day)
          /**
         * Client
         */
          const result = await new usageapi.UsageapiClient({ authenticationDetailsProvider: this.#provider }).requestSummarizedUsages({
            requestSummarizedUsagesDetails: {
              tenantId: this.#provider.getTenantId(),
              timeUsageStarted: this.#dateToUTC(monthStart),
              timeUsageEnded: this.#dateToUTC(monthEnd),
              granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Monthly,
              forecast: {
                forecastType: usageapi.models.Forecast.ForecastType.Basic,
                timeForecastStarted: this.#dateToUTC(monthEnd),
                timeForecastEnded: this.#dateToUTC(forecastEnd)
              },
              queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
              groupBy: ["resourceId"],
              filter: {
                operator: usageapi.models.Filter.Operator.And,
                dimensions: [
                  {
                    key: "service",
                    value: "COMPUTE"
                  }
                ]
              }
            }
          })

          result.usageAggregation.items.forEach(i => {
            if (i.isForecast === true && i.resourceId?.split(".")[1] === 'instance') {
              if (i.computedAmount == null) i.computedAmount = 0
              const existingResource = forecastResults.find(
                o => o.resourceId === i.resourceId
              );

              if (existingResource) {
                existingResource.forecast[day] =
                  (existingResource.forecast[day] || 0) + i.computedAmount;
              } else {
                forecastResults.push({
                  resourceId: i.resourceId,
                  forecast: { [day]: i.computedAmount }
                });
              }
            }
          })

        }
      } catch (error) {
        console.log(error)
      }

      resolve(forecastResults)

      /**
       * Habilita o console
       */
      this.#util.enableConsole();

    })
  }

  forecastBlockVolumes() {
    /**
     * Retorna a promise
     */
    return new Promise(async (resolve, reject) => {
      /**
       * Desabilita o console
       */
      this.#util.disableConsole();

      var forecasts = [7, 15, 30, 60]
      var today = new Date();
      var monthEnd = new Date()
      monthEnd.setDate(today.getDate() - 1)
      monthEnd.setHours(0, 0, 0, 0)
      var monthStart = new Date(monthEnd)
      monthStart.setMonth(monthStart.getMonth() - 1)
      var forecastResults = []

      try {
        for (const day of forecasts) {
          var forecastEnd = new Date(today)
          forecastEnd.setDate(today.getDate() + day)
          /**
         * Client
         */
          const result = await new usageapi.UsageapiClient({ authenticationDetailsProvider: this.#provider }).requestSummarizedUsages({
            requestSummarizedUsagesDetails: {
              tenantId: this.#provider.getTenantId(),
              timeUsageStarted: this.#dateToUTC(monthStart),
              timeUsageEnded: this.#dateToUTC(monthEnd),
              granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Monthly,
              forecast: {
                forecastType: usageapi.models.Forecast.ForecastType.Basic,
                timeForecastStarted: this.#dateToUTC(monthEnd),
                timeForecastEnded: this.#dateToUTC(forecastEnd)
              },
              queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
              groupBy: ["resourceId"],
              filter: {
                operator: usageapi.models.Filter.Operator.And,
                dimensions: [
                  {
                    key: "service",
                    value: "BLOCK_STORAGE"
                  }
                ]
              }
            }
          })

          result.usageAggregation.items.forEach(i => {
            if (i.isForecast === true && i.resourceId?.split(".")[1] === 'volume') {
              if (i.computedAmount == null) i.computedAmount = 0
              const existingResource = forecastResults.find(
                o => o.resourceId === i.resourceId
              );

              if (existingResource) {
                existingResource.forecast[day] =
                  (existingResource.forecast[day] || 0) + i.computedAmount;
              } else {
                forecastResults.push({
                  resourceId: i.resourceId,
                  forecast: { [day]: i.computedAmount }
                });
              }
            }
          })

        }
      } catch (error) {
        console.log(error)
      }

      resolve(forecastResults)

      /**
       * Habilita o console
       */
      this.#util.enableConsole();

    })
  }

  forecastBootVolumes() {
    /**
     * Retorna a promise
     */
    return new Promise(async (resolve, reject) => {
      /**
       * Desabilita o console
       */
      this.#util.disableConsole();

      var forecasts = [7, 15, 30, 60]
      var today = new Date();
      var monthEnd = new Date()
      monthEnd.setDate(today.getDate() - 1)
      monthEnd.setHours(0, 0, 0, 0)
      var monthStart = new Date(monthEnd)
      monthStart.setMonth(monthStart.getMonth() - 1)
      var forecastResults = []

      try {
        for (const day of forecasts) {
          var forecastEnd = new Date(today)
          forecastEnd.setDate(today.getDate() + day)
          /**
         * Client
         */
          const result = await new usageapi.UsageapiClient({ authenticationDetailsProvider: this.#provider }).requestSummarizedUsages({
            requestSummarizedUsagesDetails: {
              tenantId: this.#provider.getTenantId(),
              timeUsageStarted: this.#dateToUTC(monthStart),
              timeUsageEnded: this.#dateToUTC(monthEnd),
              granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Monthly,
              forecast: {
                forecastType: usageapi.models.Forecast.ForecastType.Basic,
                timeForecastStarted: this.#dateToUTC(monthEnd),
                timeForecastEnded: this.#dateToUTC(forecastEnd)
              },
              queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
              groupBy: ["resourceId"],
              filter: {
                operator: usageapi.models.Filter.Operator.And,
                dimensions: [
                  {
                    key: "service",
                    value: "BLOCK_STORAGE"
                  }
                ]
              }
            }
          })

          result.usageAggregation.items.forEach(i => {
            if (i.isForecast === true && i.resourceId?.split(".")[1] === 'bootvolume') {
              if (i.computedAmount == null) i.computedAmount = 0
              const existingResource = forecastResults.find(
                o => o.resourceId === i.resourceId
              );

              if (existingResource) {
                existingResource.forecast[day] =
                  (existingResource.forecast[day] || 0) + i.computedAmount;
              } else {
                forecastResults.push({
                  resourceId: i.resourceId,
                  forecast: { [day]: i.computedAmount }
                });
              }
            }
          })

        }
      } catch (error) {
        console.log(error)
      }

      resolve(forecastResults)

      /**
       * Habilita o console
       */
      this.#util.enableConsole();

    })
  }

  forecastEnvironment() {
    /**
     * Retorna a promise
     */
    return new Promise(async (resolve, reject) => {
      /**
       * Desabilita o console
       */
      this.#util.disableConsole();

      var forecasts = [7, 15, 30, 60, 90, 180]
      var today = new Date();
      var monthEnd = new Date()
      monthEnd.setDate(today.getDate() - 1)
      monthEnd.setHours(0, 0, 0, 0)
      var monthStart = new Date(monthEnd)
      monthStart.setMonth(monthStart.getMonth() - 1)
      var forecast = {}

      try {
        for (const day of forecasts) {
          var forecastEnd = new Date(today)
          forecastEnd.setDate(today.getDate() + day)
          /**
         * Client
         */
          const result = await new usageapi.UsageapiClient({ authenticationDetailsProvider: this.#provider }).requestSummarizedUsages({
            requestSummarizedUsagesDetails: {
              tenantId: this.#provider.getTenantId(),
              timeUsageStarted: this.#dateToUTC(monthStart),
              timeUsageEnded: this.#dateToUTC(monthEnd),
              granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Monthly,
              forecast: {
                forecastType: usageapi.models.Forecast.ForecastType.Basic,
                timeForecastStarted: this.#dateToUTC(monthEnd),
                timeForecastEnded: this.#dateToUTC(forecastEnd)
              },
              queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
              groupBy: ["service"]
            }
          })

          result.usageAggregation.items.forEach(i => {

            if (i.isForecast === true) {
              if (i.computedAmount == null) i.computedAmount = 0

              forecast[day] = (forecast[day] || 0) + i.computedAmount;

            }
          })

        }
      } catch (error) {
        console.log(error)
      }
      resolve(forecast)

      /**
       * Habilita o console
       */
      this.#util.enableConsole();

    })
  }

  listLast12MUsageByRegion() {
    /**
     * Retorna a promise
     */
    return new Promise(async (resolve, reject) => {
      /**
       * Desabilita o console
       */
      this.#util.disableConsole();

      try {
        var today = new Date();
        var year = today.getFullYear();
        var month = today.getMonth() + 1
        var monthEnd = new Date(year, month, 1)
        var monthStart = new Date(year, month - 12, 1)
        /**
         * Client
         */
        new usageapi.UsageapiClient({ authenticationDetailsProvider: this.#provider }).requestSummarizedUsages({
          requestSummarizedUsagesDetails: {
            tenantId: this.#provider.getTenantId(),
            timeUsageStarted: this.#dateToUTC(monthStart),
            timeUsageEnded: this.#dateToUTC(monthEnd),
            granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Monthly,
            queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
            groupBy: ["region"]
          }
        }).then(async result => {

          const uniqueTimeUsageStarted = [...new Set(result.usageAggregation.items.map(entry => entry.timeUsageStarted))];

          // Create an empty object to store the grouped, summed, and filled data
          const groupedSummedAndFilledData = {};

          result.usageAggregation.items.forEach(entry => {
            const region = entry.region;
            const timeUsageStarted = entry.timeUsageStarted;
            const computedAmount = entry.computedAmount;


            if (!groupedSummedAndFilledData[region]) {
              groupedSummedAndFilledData[region] = []
            }


            groupedSummedAndFilledData[region].push({
              timeUsageStarted,
              computedAmount: computedAmount || 0
            })

          });

          uniqueTimeUsageStarted.sort((a, b) => new Date(b) - new Date(a));
          // Fill in missing timeUsageStarted entries with a computedAmount of 0
          for (const service in groupedSummedAndFilledData) {
            for (const time of uniqueTimeUsageStarted) {
              const entry = groupedSummedAndFilledData[service].find(item => item.timeUsageStarted === time)


              if (!entry) {
                groupedSummedAndFilledData[service].push({ timeUsageStarted: time, computedAmount: 0 });
              }
            }
          }


          // Sort the entries within each service based on timeUsageStarted
          for (const service in groupedSummedAndFilledData) {
            const serviceData = groupedSummedAndFilledData[service];
            const sortedServiceData = this.groupAndSum(serviceData);

            groupedSummedAndFilledData[service] = sortedServiceData;
          }


          resolve(groupedSummedAndFilledData)
        })

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