let Util = require("./util");
const usageapi = require("oci-usageapi");
const common = require("oci-common");
const { DateTime } = require('luxon');

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

        for(const item of items) {
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
      } else  {
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
      for(const i of result.usageAggregation.items) {
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
        }}).then(result => {

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
        }}).then(async result => {

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
              if(resource.resourceId.split('.')[1] == 'instance') {
                if(!groupedData['Instance']) {
                  groupedData['Instance'] = []
                }
                groupedData['Instance'].push({timeUsageStarted, computedAmount})
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
            finalResult[service].push({improvement: this.#calcImprovement(recentTwoValues[0], recentTwoValues[1]) }) 
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

        new usageapi.UsageapiClient({ authenticationDetailsProvider: this.#provider }).requestSummarizedUsages({
          requestSummarizedUsagesDetails: { 
          tenantId: this.#provider.getTenantId(),
          timeUsageStarted: this.#dateToUTC(monthStart),
          timeUsageEnded: this.#dateToUTC(monthEnd),
          granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Monthly,
          queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
          groupBy: ["service", "resourceId"]
        }}).then(result => {
          const instances = []
          result.usageAggregation.items.forEach(res => {
            if(res.service == "Compute" && res.resourceId.split('.')[1] == 'instance') instances.push(res)
          })

          // função para agrupar por "instances"
          function groupByInstance(data) {
            const groupedData = {};
            data.forEach((item) => {
              const { timeUsageStarted, computedAmount } = item;
              if (!groupedData['Instance']) {
                groupedData['Instance'] = [];
              }
              groupedData['Instance'].push({ timeUsageStarted, computedAmount });
            });
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
          const groupedByService = groupByInstance(instances);
          
          // Calcula a soma dos "computedAmount" por "timeUsageStarted"
          const summedComputedAmounts = sumComputedAmounts(groupedByService);
          
          // Preenche com valores padrão caso não tenha "timeUsageStarted"
          const finalResult = fillMissingTimeUsage(summedComputedAmounts);

          resolve(finalResult.Instance);
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
          groupBy: ["service", "resourceId"]
        }}).then(result => {
          var amount = 0
          result.usageAggregation.items.forEach(res => {
            amount += res.computedAmount
          })

          resolve({[year]: amount});
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
        var year = today.getFullYear();
        var month = today.getMonth() + 1
        var monthEnd = new Date(year, month, 1)
        var monthStart = new Date(year, month - 12, 1)

        /**
         * Client
         */
        new usageapi.UsageapiClient({ authenticationDetailsProvider: this.#provider }).requestSummarizedUsages({
          requestSummarizedUsagesDetails: { tenantId: this.#provider.getTenantId(),
          timeUsageStarted: this.#dateToUTC(monthStart),
          timeUsageEnded: this.#dateToUTC(monthEnd),
          granularity: usageapi.models.RequestSummarizedUsagesDetails.Granularity.Monthly,
          queryType: usageapi.models.RequestSummarizedUsagesDetails.QueryType.Cost,
          groupBy: ["service"]}
        }).then(async result => {
          
          function groupAndSumByTimeUsageStarted(objects) {
            const groups = {};
          
            objects.forEach((obj) => {
              const timeUsageStarted = obj.timeUsageStarted;
              if (!groups[timeUsageStarted]) {
                groups[timeUsageStarted] = {
                  timeUsageStarted,
                  computedAmountSum: 0,
                };
              }
              groups[timeUsageStarted].computedAmountSum += obj.computedAmount;
            });
          
            const sortedGroups = Object.values(groups).sort((a, b) => {
              return new Date(b.timeUsageStarted) - new Date(a.timeUsageStarted);
            });
          
            return sortedGroups;
          }

          const resultado = groupAndSumByTimeUsageStarted(result.usageAggregation.items);

          var twoRecentCosts = resultado.slice(0, 2).map(item => item.computedAmountSum);
          var history = {}
          history['currentMonth'] = twoRecentCosts[0]
          history['lastMonth'] = twoRecentCosts[1]
        
          resolve({data: resultado, history: history});
          
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