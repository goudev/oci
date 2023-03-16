const Oracle = require('../../src/oci');
const sinon = require('sinon');

/** Mocks */
const cloudProvider = require('./mocks/cloudProviderMock');
const usageRequest = require('./mocks/usageApiRequestMock');
const successfulResponse = require('./mocks/successfulResponseMock');

describe('Usage API', () => {
  describe('listSummarizedUsage()', () => {
    it('must return the summarized usage for a given OCID', async () => {
      // Creating an instance of cloud account with credentials
      const oci = await new Oracle(cloudProvider);
  
      // Intercepting "requestSummarizedUsages" function
      const stub = sinon.stub(oci, oci.listSummarizedUsage.name);
      stub.withArgs(usageRequest).resolves(successfulResponse);
  
      // Making the request
      const results = await oci.listSummarizedUsage(usageRequest);
      sinon.assert.calledOnce(oci.listSummarizedUsage);
      expect(results).toEqual(successfulResponse);
    })
  });
})