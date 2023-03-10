const fs = require('fs').promises;
const ociCommon = require("oci-common");
var hash = require('object-hash');
var BootVolumes = require("./bootVolumes")
var BlockVolumes = require("./blockVolumes")
var ResourceSearch = require("./resourceSearch")
var Compartments = require("./compartments")
var Usage = require("./usage")
var Regions = require("./regions")
var Network = require("./network")
var Compute = require("./compute")
var Region = require("./regions")
var Monitoring = require("./monitoring")
var Database = require("./database")
var ObjectStorage = require("./objectStorage")
var FileStorage = require("./fileStorage")

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
                 * Define o arquivo de configura????o
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
     * Seta a regi??o
     */
    setRegion(region) {
        try {

            /**
             * Desabilita o console
             */
            this.#disableConsole();

            /**
             * Seta a regi??o
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
            return new Error("Erro ao setar a regi??o. \n\n" + error.message || error);
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

    listSummarizedUsage({ resourceId, startDate, endDate, granularity }) {
        return new Usage(this.#provider).listSummarizedUsage(
            resourceId,
            startDate,
            endDate,
            granularity
        );
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

    listDbSystems(){
        return new Database(this.#provider).listDbSystems();
    }

    getDbSystem(dbSystemId){
        return new Database(this.#provider).getDbSystem(dbSystemId);
    }

    listBuckets(){
        return new ObjectStorage(this.#provider).listBuckets();
    }

    getBucket(region, namespaceName, bucketName){
        return new ObjectStorage(this.#provider).getBucket(region, namespaceName, bucketName);
    }

    listFileSystems(){
        return new FileStorage(this.#provider).listFileSystems()
    }

    getFileSystem(fileSystemId){
        return new FileStorage(this.#provider).getFileSystem(fileSystemId)
    }

    listVolumesPolicies(){
        return new BlockVolumes(this.#provider).listVolumesPolicies()
    }
        
    getVolumePolicy(policyId){
        return new BlockVolumes(this.#provider).getVolumePolicy(policyId)
    }

    listRegionSubscriptions(){
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


    getNamespace(){
        return new ObjectStorage(this.#provider).getNamespace();
    }
    
    
}
