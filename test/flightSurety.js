
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const TruffleAssert = require('truffle-assertions')

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCallerContract(config.flightSuretyApp.address);
  });

/* ============================================================================================== */
/*                                     OPERATIONS AND SETTINGS                                    */
/* ============================================================================================== */
  describe('\n👑 Ownability 👑 :', async() => {
    it(`can block access to functions using requireContractOwner for non-Contract Owner account`, async function () {
      await TruffleAssert.reverts(
        config.flightSuretyData.toggleOperatingStatus({from: accounts[1]}), 
        "Caller is not contract owner",
        "Access not restricted to Contract Owner"
      );
    });
  
    it(`can allow access to functions using requireContractOwner for Contract Owner account`, async function () {
      await TruffleAssert.passes(
        await config.flightSuretyData.toggleOperatingStatus(),
        "Access not restricted to Contract Owner"
      )
      // reset oprational
      await config.flightSuretyData.toggleOperatingStatus();
    });

  });



  describe('\n🚫 Operational 🚫 :', async() => {
    it(`has correct initial isOperational() value`, async function () {
      // Get operating status
      let dataStatus = await config.flightSuretyData.isOperational.call();
      let appStatus = await config.flightSuretyApp.isOperational.call();
  
      assert.equal(dataStatus, true, "Incorrect initial operating status value for data contract");
      assert.equal(appStatus, true, "Incorrect initial operating status value");
    });

    it(`can change operational state using toggleOperatingStatus(), event ToggledOperationalState emited`, async function () {
      let currentOperationalState = await config.flightSuretyData.isOperational.call();
      let tx = await config.flightSuretyData.toggleOperatingStatus();
      await TruffleAssert.eventEmitted(tx, 'ToggledOperationalState', 
        (ev) =>{
          return(currentOperationalState == !ev.operational)
        },
        "event ToggledOperationalState was not emited"
      );
    });

    it(`can block access to functions using requireIsOperational when operating status is false`, async function () {
      // opreational state is false
      await TruffleAssert.reverts(
        config.flightSuretyData.getAirline.call(config.owner),
        "Contract is currently not operational",
        "Access not blocked for requireIsOperational"
      );
    });

    it(`can allow access to functions using requireIsOperational when operating status is true`, async function () {
      // toggle opreational state to true
      await config.flightSuretyData.toggleOperatingStatus();
      await TruffleAssert.passes(
        config.flightSuretyData.getAirline.call(config.owner),
        "Access not blocked for requireIsOperational"
      );
    });

  });



  describe('\n🚀 Locked Upgradability 🔐 :', async() => {
    it(`owner can deauthorized caller contract (version of app contract), event ContractDeauthorized emited`, async() => {
      let tx = await config.flightSuretyData.deauthorizeCallerContract(config.flightSuretyApp.address);
      await TruffleAssert.eventEmitted(tx, 'ContractDeauthorized', 
        (ev) =>{
          return(config.flightSuretyApp.address == ev.contractAddress);
        },
        "event ContractDeauthorized was not emited"
      );

      assert.equal(
        await config.flightSuretyData.isAuthorized.call(config.flightSuretyApp.address),
        false,
        "deauthorizeCallerContract() not working"
      );
    });

    it(`can block deauthorized contract from access to functions using requireCallerAuthorized `, async() => {
      await TruffleAssert.reverts(
        config.flightSuretyApp.registerAirline(config.airlinesByMediation[0], 'test'),
        "This app contract is currently not authorized",
        "Access not blocked for requireCallerAuthorized"
      );
    });

    it(`owner can authorized caller contract (new app contract version), event ContractAuthorized emited`, async() => {
      let tx = await config.flightSuretyData.authorizeCallerContract(config.flightSuretyApp.address);
      await TruffleAssert.eventEmitted(tx, 'ContractAuthorized', 
        (ev) =>{
          return(config.flightSuretyApp.address == ev.contractAddress);
        },
        "event ContractAuthorized was not emited"
      );

      assert.equal(
        await config.flightSuretyData.isAuthorized.call(config.flightSuretyApp.address),
        true,
        "authorizeCallerContract() not working"
      );
    });

    it(`can allow authorized contract access to functions using requireCallerAuthorized `, async() => {
      await TruffleAssert.passes(
        config.flightSuretyApp.registerAirline(config.airlinesByMediation[0], 'TestAirline1'),
        "Access not Allowed for requireCallerAuthorized"
      );

      let addedAirline = await config.flightSuretyData.getAirline.call(config.airlinesByMediation[0]);
      assert.equal(addedAirline.name, 'TestAirline1', "airline dose not registered by app contract (registerAirline)");
    });

  });



/* ============================================================================================== */
/*                                       MAIN FUNCTIONALITY                                       */
/* ============================================================================================== */

  describe(`\n✈️  Airlines ✈️ :`, async() => {
    it(`first airline was registered in deployment by constractor`, async() => {
      assert.equal(
        await config.flightSuretyData.isAirlineExist.call(config.owner),
        true,
        "No airline added in deployment for the owner"
      );
    });

    it(`can not register a registered airline by same address using requireNotExistAirline`, async() => {
      TruffleAssert.reverts(
        config.flightSuretyApp.registerAirline(config.owner, 'willnot'),
        "Cannot register a registered airline address",
        "Can register a registered airline!"
      );
    });

    it(`can retrive airline data if its exist only requireExistAirline`, async() => {
      await TruffleAssert.reverts(
        config.flightSuretyData.getAirline(config.airlinesByMediation[1]),
        "Airline address not existing",
        "Can retrive unexisted airline!"
      );

      await TruffleAssert.passes(
        config.flightSuretyData.getAirline(config.owner),
      );
    });

    it(`registered airline can funds contract with minemum of 10 ether, more than that will be returnd to funder`, async() => {
      let airlineBalanceBefore = new BigNumber(await web3.eth.getBalance(config.airlinesByMediation[0]))
      let fundingValue = new BigNumber(web3.utils.toWei('20', "ether"))
      await TruffleAssert.reverts(
        config.flightSuretyApp.fundMyAirline({
          from: config.airlinesByMediation[0], 
          value: web3.utils.toWei('9.9', "ether")
        }),
        "Funding must be 10 Ether"
      );
      await TruffleAssert.passes(
        config.flightSuretyApp.fundMyAirline({
          from: config.airlinesByMediation[0], 
          value: fundingValue
        }),
      );

      let airlineBalanceAfter = new BigNumber(await web3.eth.getBalance(config.airlinesByMediation[0]))
      assert(airlineBalanceBefore.isGreaterThan(airlineBalanceAfter))
      assert(airlineBalanceAfter.isGreaterThan(airlineBalanceBefore.minus(fundingValue)))
    });
    
  });



  //TODO
  describe(`\n💁🏾‍♂️👨🏼‍⚖️🙅🏻‍♂️ Multiparty 💁🏾‍♂️👨🏼‍⚖️🙅🏻‍♂️:`, async() => {
    it(``, async() => {

    });

    it(``, async() => {

    });

    it(``, async() => {

    });

  });

});
