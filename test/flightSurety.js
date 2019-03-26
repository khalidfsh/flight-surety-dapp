
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
        "cannot retrive existed airline"
      );
    });

    it(`registered airline can funds contract with minemum of 10 ether, more than that will be returnd to funder`, async() => {
      let airlineBalanceBefore = new BigNumber(await web3.eth.getBalance(config.airlinesByMediation[0]))
      let dataContractBalanceBefore = new BigNumber(await web3.eth.getBalance(config.flightSuretyData.address))
      let fundingValue = new BigNumber(web3.utils.toWei('10', "ether"))

      await TruffleAssert.reverts(
        config.flightSuretyApp.fundMyAirline({
          from: config.airlinesByMediation[0], 
          value: web3.utils.toWei('9.9', "ether")
        }),
        "Funding must be 10 Ether",
        "Funding less than 10 Ether accepted"
      );
      await TruffleAssert.passes(
        config.flightSuretyApp.fundMyAirline({
          from: config.airlinesByMediation[0], 
          value: fundingValue
        }),
        "funndig proccess did not passes"
      );

      let airlineBalanceAfter = new BigNumber(await web3.eth.getBalance(config.airlinesByMediation[0]))
      let dataContractBalanceAfter = new BigNumber(await web3.eth.getBalance(config.flightSuretyData.address))

      assert(airlineBalanceBefore.isGreaterThan(airlineBalanceAfter), "balance of funder did not change")
      assert(dataContractBalanceAfter.isGreaterThan(dataContractBalanceBefore), "balance of data contract did not change")
    });

    it(`airline will be active after success funding proccess`, async() => {
      assert(await config.flightSuretyApp.isAirlineFunded.call(config.airlinesByMediation[0]), 'not isAirlineFunded')
    });

    it(`new funds addesd to airline balance of funds`, async() => {

    });
    
  });



  describe(`\n💁🏾‍♂️👨🏼‍⚖️🙅🏻‍♂️ Multiparty 💁🏾‍♂️👨🏼‍⚖️🙅🏻‍♂️:`, async() => {
    it(`deployed with type of mediation registration`, async() => {
      /// RegisterationType.BY_MEDIATION == 0
      assert(await config.flightSuretyData.getRegistrationType.call(), '0', "registration type not BY_MEDIATION");
    });

    it(`only active airline (funded) can register new airline using`, async() => {
      await TruffleAssert.passes(
        config.flightSuretyApp.registerAirline(config.airlinesByMediation[1], 'TestAirline2', {from: config.airlinesByMediation[0]}),
      );

      let addedAirline = await config.flightSuretyData.getAirline.call(config.airlinesByMediation[1]);
      assert.equal(addedAirline.name, 'TestAirline2', "airline dose not registered by app contract (registerAirline)");
    });

    it(`first 4 registered airline added by mediation`, async() => {
      await TruffleAssert.passes(
        config.flightSuretyApp.registerAirline(config.airlinesByMediation[2], 'TestAirline3', {from: config.owner}),
      );
    });

    it(`registration type will be by votes after 4th registration`, async() => {
      /// RegisterationType.BY_VOTES == 1
      assert(await config.flightSuretyData.getRegistrationType.call(), '1', "registration type not BY_MEDIATION");
    });

    it(`the 5th register airline will be in (waiting for votes) state`, async() => {
      await TruffleAssert.passes(
        config.flightSuretyApp.registerAirline(config.airlinesByVotes[0], 'TestAirline4', {from: config.airlinesByVotes[0]}),
      );

      let addedAirline = await config.flightSuretyData.getAirline.call(config.airlinesByVotes[0]);
      //AirlineRegisterationState.WaitingForVotes == 0
      assert.equal(addedAirline.state, '0', "airline state not waiting for votes");
    });

    it(`only active (funded) airline can votes `, async() => {
      //adding extra fundded airline to make them 3 active airline (was 2 before)
      await config.flightSuretyApp.fundMyAirline({
        from: config.airlinesByMediation[1], 
        value: web3.utils.toWei('10', "ether")
      });

      await TruffleAssert.passes(
        config.flightSuretyApp.voteForAirline(config.airlinesByVotes[0], {from: config.owner}),
      );

      let addedAirline = await config.flightSuretyData.getAirline.call(config.airlinesByVotes[0]);
      assert.equal(addedAirline.numberOfVotes, '1', "votes did not change")
      assert.equal(addedAirline.state, '0', "state changed before 50% consensus")
    });

    it(`airline in waiting for votes state should not change its state untill 50% of active airline votes`, async() => {
      await TruffleAssert.passes(
        config.flightSuretyApp.voteForAirline(config.airlinesByVotes[0], {from: config.airlinesByMediation[1]}),
      );

      let addedAirline = await config.flightSuretyData.getAirline.call(config.airlinesByVotes[0]);
      assert.equal(addedAirline.numberOfVotes, '2')
      //AirlineRegisterationState.registered == 1
      assert.equal(addedAirline.state, '1')
    });

    it(`voting for non waiting for votes airline will fail using requireIsAirlineWaitingForVotes`, async() => {
      await TruffleAssert.reverts(
        config.flightSuretyApp.voteForAirline(config.airlinesByVotes[0], {
          from: config.airlinesByMediation[0], 
        }),
        "Airline not waiting for votes",
        "Airline is waiting for votes!!"
      );
    });

  });

});
