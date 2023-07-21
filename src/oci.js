const fs = require('fs').promises;
const ociCommon = require("oci-common");
var hash = require('object-hash');
var BootVolumes = require("./bootVolumes")
var BlockVolumes = require("./blockVolumes")
var ResourceSearch = require("./resourceSearch")
var Compartments = require("./compartments")
var Usage = require("./usage")
var Cluster = require("./clusters")
var Regions = require("./regions")
var Network = require("./network")
var Compute = require("./compute")
var Region = require("./regions")
var Monitoring = require("./monitoring")
var Database = require("./database")
var ObjectStorage = require("./objectStorage")
var FileStorage = require("./fileStorage")
var Announcements = require("./announcements")
var Budgets = require("./budgets")
var ResourceActions = require("./resourceactions")
var Users = require("./users")
var Groups = require("./groups")
var Policies = require("./policies")
var Metrics = require('./metrics')
var Subscription = require('./subscription')

module.exports = class oci {

    #console = console;
    #configFile = "";
    #user = "";
    #fingerprint = "";
    #tenancy = "";
    #region = "";
    #key = "";
    #inst = "";
    #provider = "";

    constructor(config) {

        /**
         * Define as envs
         */
        this.#user = config.user;
        this.#fingerprint = config.fingerprint
        this.#tenancy = config.tenancy
        this.#region = config.region
        this.#key = config.private_key
        this.#inst = hash(JSON.stringify(config));

        /**
         * Arquivo config
         */
        this.#configFile = `[DEFAULT]\n`;
        this.#configFile = this.#configFile + `user=${this.#user}\n`
        this.#configFile = this.#configFile + `fingerprint=${this.#fingerprint}\n`
        this.#configFile = this.#configFile + `tenancy=${this.#tenancy}\n`
        this.#configFile = this.#configFile + `region=${this.#region}\n`
        this.#configFile = this.#configFile + `key_file=/tmp/oci-${this.#inst}.pem\n`

        /**
         * Grava o arquivo oci
         */
        var wrcfg = fs.writeFile(`/tmp/oci-${this.#inst}.oci`, this.#configFile);

        /**
         * Grava o arquivo key
         */
        var wrkey = fs.writeFile(`/tmp/oci-${this.#inst}.pem`, this.#key);

        /**
         * retorna promise
         */
        return new Promise((resolve, reject) => {
            Promise.all([wrcfg, wrkey]).then(async () => {

                /**
                 * Define o arquivo de configuração
                 */
                this.#provider = await new ociCommon.ConfigFileAuthenticationDetailsProvider(`/tmp/oci-${this.#inst}.oci`);

                /**
                 * Retorna
                 */
                resolve(this);

            }).catch(reject);
        })

    }

    #disableConsole() {
        console = {
            log: function () { },
            error: function () { },
            info: function () { },
            warn: function () { }
        }
    }

    #enableConsole() {
        console = this.#console;
    }

    /**
     * Seta a região
     */
    setRegion(region) {
        try {

            /**
             * Desabilita o console
             */
            this.#disableConsole();

            /**
             * Seta a região
             */
            this.#provider.setRegion(region);

            /**
             * Habilita o console
             */
            this.#enableConsole();

            /**
             * Retorna
             */
            return this;
        } catch (error) {

            /**
             * Habilita o console
             */
            this.#enableConsole();

            /**
             * Retorna o erro
             */
            return new Error("Erro ao setar a região. \n\n" + error.message || error);
        }
    }

    searchResource(queryString, AllRegions) {
        return new ResourceSearch(this.#provider).find(queryString, AllRegions)
    }

    getBlockVolume(volumeId) {
        return new BlockVolumes(this.#provider).getBlockVolume(volumeId);
    }

    listBlockVolumes() {
        return new BlockVolumes(this.#provider).listBlockVolumes();
    }

    listBlockVolumesBackup() {
        return new BlockVolumes(this.#provider).listBlockVolumesBackup();
    }

    async* listBlockVolumesIterator() {
        const Volume = new BlockVolumes(this.#provider);
        for await (const volume of Volume.listBlockVolumesIterator()) {
            yield volume;
        }
    }

    getBudget(budgetId) {
        return new Budgets(this.#provider).getBudget(budgetId);
    }

    listBudgets() {
        return new Budgets(this.#provider).listBudgets();
    }

    getBootVolume(volumeId) {
        return new BootVolumes(this.#provider).getBootVolume(volumeId);
    }

    listBootVolumes() {
        return new BootVolumes(this.#provider).listBootVolumes();
    }

    listBootVolumeAttachments() {
        return new BootVolumes(this.#provider).listBootVolumeAttachments();
    }

    listBlockVolumeAttachments() {
        return new BlockVolumes(this.#provider).listBlockVolumeAttachments();
    }

    getRegionSubscriptions() {
        return new Regions(this.#provider).getRegionSubscriptions();
    }

    listCompartments() {
        return new Compartments(this.#provider).listCompartments();
    }

    listAccountConfig() {
        return new Usage(this.#provider).listAccountConfig();
    }

    listAccountOverview(){
        return new Usage(this.#provider).listAccountOverview();
    }
    
    listAccountOverviewByService(services){
        return new Usage(this.#provider).listAccountOverviewByService(services);
    }

    listYearTotal() {
        return new Usage(this.#provider).listYearTotal();
    }

    listSummarizedUsage({ resourceId, startDate, endDate, granularity }) {
        return new Usage(this.#provider).listSummarizedUsage(
            resourceId,
            startDate,
            endDate,
            granularity
        );
    }

    listSummarizedUsageByService({ startDate, endDate, granularity }) {
        return new Usage(this.#provider).listSummarizedUsageByService(
            // service,
            startDate,
            endDate,
            granularity
        );
    }

    getCluster(clusterId) {
        return new Cluster(this.#provider).getCluster(clusterId)
    }

    listClusters() {
        return new Cluster(this.#provider).listClusters();
    }

    listVnicAttachments() {
        return new Network(this.#provider).listVnicAttachments();
    }

    listVnics() {
        return new Network(this.#provider).listVnics();
    }

    getVnic(vnicId) {
        return new Network(this.#provider).getVnic(vnicId);
    }

    listPublicIps() {
        return new Network(this.#provider).listPublicIps();
    }

    getPublicIp(publicIpId) {
        return new Network(this.#provider).getPublicIp(publicIpId);
    }

    listPrivateIps() {
        return new Network(this.#provider).listPrivateIps();
    }

    getPrivateIp(privateIpId) {
        return new Network(this.#provider).getPrivateIp(privateIpId);
    }

    listVcns() {
        return new Network(this.#provider).listVcns();
    }

    getVcn(vcnId) {
        return new Network(this.#provider).getVcn(vcnId);
    }

    listSubnets() {
        return new Network(this.#provider).listSubnets();
    }

    getSubnet(subnetId) {
        return new Network(this.#provider).getSubnet(subnetId);
    }

    listSecurityLists() {
        return new Network(this.#provider).listSecurityLists();
    }

    getSecurityList(securityListId) {
        return new Network(this.#provider).getSecurityList(securityListId);
    }

    listNetworkSecurityGroups() {
        return new Network(this.#provider).listNetworkSecurityGroups();
    }

    getNetworkSecurityGroup(networkSecurityGroupId) {
        return new Network(this.#provider).getNetworkSecurityGroup(networkSecurityGroupId);
    }

    listRouteTables() {
        return new Network(this.#provider).listRouteTables();
    }

    getRouteTable(routeTableId) {
        return new Network(this.#provider).getRouteTable(routeTableId);
    }

    listNatGateways() {
        return new Network(this.#provider).listNatGateways();
    }

    getNatGateway(natGatewayId) {
        return new Network(this.#provider).getNatGateway(natGatewayId);
    }

    listServiceGateways() {
        return new Network(this.#provider).listServiceGateways();
    }

    getServiceGateway(serviceGatewayId) {
        return new Network(this.#provider).getServiceGateway(serviceGatewayId);
    }

    listImages() {
        return new Compute(this.#provider).listImages();
    }

    getImage(imageId) {
        return new Compute(this.#provider).getImage(imageId);
    }

    listInstances() {
        return new Compute(this.#provider).listInstances();
    }

    getInstance(instanceId) {
        return new Compute(this.#provider).getInstance(instanceId);
    }

    listDbSystems() {
        return new Database(this.#provider).listDbSystems();
    }

    getDbSystem(dbSystemId) {
        return new Database(this.#provider).getDbSystem(dbSystemId);
    }

    listBuckets() {
        return new ObjectStorage(this.#provider).listBuckets();
    }

    getBucket(region, namespaceName, bucketName) {
        return new ObjectStorage(this.#provider).getBucket(region, namespaceName, bucketName);
    }

    listFileSystems() {
        return new FileStorage(this.#provider).listFileSystems()
    }

    getFileSystem(fileSystemId) {
        return new FileStorage(this.#provider).getFileSystem(fileSystemId)
    }

    listVolumesPolicies() {
        return new BlockVolumes(this.#provider).listVolumesPolicies()
    }

    getVolumePolicy(policyId) {
        return new BlockVolumes(this.#provider).getVolumePolicy(policyId)
    }

    getAnnouncement(announcementId) {
        return new Announcements(this.#provider).getAnnouncement(announcementId);
    }

    listAnnouncements() {
        return new Announcements(this.#provider).listAnnouncements();
    }

    getResourceAction(recommendationId) {
        return new ResourceActions(this.#provider).getResourceAction(recommendationId);
    }

    listResourceActions() {
        return new ResourceActions(this.#provider).listResourceActions();
    }

    listRegionSubscriptions() {
        return new Region(this.#provider).listRegionSubscriptions();
    }

    getCpuMetrics(resourceId, days, interval) {
        return new Monitoring(this.#provider).getCpuMetrics(resourceId, days, interval);
    }

    getMemoryMetrics(instanceData, days, interval) {
        return new Monitoring(this.#provider).getMemoryMetrics(instanceData, days, interval);   
    }


    getCpuUsage(resourceId, days, interval) {
        return new Monitoring(this.#provider).getCpuUsage(resourceId, days, interval);
    }

    getMemoryUsage(resourceId, days, interval) {
        return new Monitoring(this.#provider).getMemoryUsage(resourceId, days, interval);
    }


    getNamespace() {
        return new ObjectStorage(this.#provider).getNamespace();
    }

    listVolumeGroups() {
        return new BlockVolumes(this.#provider).listVolumeGroups();
    }

    getVolumeWriteThroughputAverage(data, days, interval) {
        return new Monitoring(this.#provider).getVolumeWriteThroughputAverage(data, days, interval);
    }

    getVolumeReadThroughputAverage(data, days, interval) {
        return new Monitoring(this.#provider).getVolumeReadThroughputAverage(data, days, interval);
    }

    getVolumeGuaranteedThroughputAverage(data, days, interval) {
        return new Monitoring(this.#provider).getVolumeGuaranteedThroughputAverage(data, days, interval);
    }

    async* listUsers() {
        const User = new Users(this.#provider);
        for await (const user of User.listUsers()) {
            yield user;
        }
    }

    async* searchResourceIterator(queryString) {
        const Search = new ResourceSearch(this.#provider);

        for await (const resource of Search.findIterator(queryString)) {
            yield resource;
        }
    }

    compartmentPath(compartmentId) {
        return new Compartments(this.#provider).compartmentPath(compartmentId)
    }

    getDiskMetrics(bv) {
        return new Metrics(this.#provider).getDiskMetrics(bv)
    }

    getInstanceMetrics(ins) {
        return new Metrics(this.#provider).getInstanceMetrics(ins)
    }

    listSubscriptions() {
        return new Subscription(this.#provider).listSubscriptions()
    }

    getIndividualResourcesActualUsage(service, resource) {
        return new Usage(this.#provider).getIndividualResourcesActualUsage(service, resource)
    }

    getLast12MUsageByServices() {
        return new Usage(this.#provider).getLast12MUsageByServices()
    }
    
    getActualYearTotalUsage() {
        return new Usage(this.#provider).getActualYearTotalUsage()
    }

    getLast12MTotalUsageByMonth() {
        return new Usage(this.#provider).getLast12MTotalUsageByMonth()
    }
}
