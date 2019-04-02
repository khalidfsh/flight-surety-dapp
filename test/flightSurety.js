
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const TruffleAssert = require('truffle-assertions')

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCallerContract(config.flightSuretyApp.address);
  });

  // afterEach('check app balance', async() => {
  //   let appBalance = new BigNumber(await web3.eth.getBalance(config.flightSuretyApp.address));
  //   let dataBalance = new BigNumber(await web3.eth.getBalance(config.flightSuretyData.address));
  //   console.log(appBalance);
  //   console.log(dataBalance);

  // })

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
      await TruffleAssert.eventEmitted(tx, 'OperationalStateToggled', 
        (ev) =>{
          return(currentOperationalState == !ev.operational)
        },
        "event ToggledOperationalState was not emited"
      );
    });

    it(`can block access to functions using requireIsOperational when operating status is false`, async function () {
      // opreational state is false
      await TruffleAssert.reverts(
        config.flightSuretyData.getRegistrationType.call(),
        "Contract is currently not operational",
        "Access not blocked for requireIsOperational"
      );
    });

    it(`can allow access to functions using requireIsOperational when operating status is true`, async function () {
      // toggle opreational state to true
      await config.flightSuretyData.toggleOperatingStatus();
      await TruffleAssert.passes(
        config.flightSuretyData.deauthorizeCallerContract(config.flightSuretyApp.address),
        "Access not blocked for requireIsOperational"
      );

      //reautorize
      await config.flightSuretyData.authorizeCallerContract(config.flightSuretyApp.address);
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

      let addedAirline = await config.flightSuretyApp.getAirline.call(config.airlinesByMediation[0]);
      assert.equal(addedAirline.name, 'TestAirline1', "airline dose not registered by app contract (registerAirline)");
    });

  });



/* ============================================================================================== */
/*                                       MAIN FUNCTIONALITY                                       */
/* ============================================================================================== */

  describe(`\n✈️  Airlines ✈️ :`, async() => {
    it(`first airline was registered in deployment by constractor`, async() => {
      assert.equal(
        await config.flightSuretyApp.isAirlineFunded.call(config.owner),
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
        config.flightSuretyApp.getAirline(config.airlinesByMediation[1]),
        "Airline address not existing",
        "Can retrive unexisted airline!"
      );

      await TruffleAssert.passes(
        config.flightSuretyApp.getAirline(config.owner),
        "cannot retrive existed airline"
      );
    });

    it(`registered airline can funds contract with minemum of 10 ether`, async() => {
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
    
  });



  describe(`\n💁🏾‍♂️👨🏼‍⚖️🙅🏻‍♂️ Multiparty 💁🏾‍♂️👨🏼‍⚖️🙅🏻‍♂️:`, async() => {
    it(`deployed with type of mediation registration`, async() => {
      /// RegisterationType.BY_MEDIATION == 0
      assert.equal(await config.flightSuretyData.getRegistrationType.call(), '0', "registration type not BY_MEDIATION");
    });

    it(`active airline (funded) can register new airline`, async() => {
      await TruffleAssert.passes(
        config.flightSuretyApp.registerAirline(config.airlinesByMediation[1], 'TestAirline2', {from: config.airlinesByMediation[0]}),
      );

      let addedAirline = await config.flightSuretyApp.getAirline.call(config.airlinesByMediation[1]);
      assert.equal(addedAirline.name, 'TestAirline2', "airline dose not registered by app contract (registerAirline)");
    });

    it(`register only airline (not funded) cannot add new airline by mediation`, async() => {
      TruffleAssert.reverts(
        config.flightSuretyApp.registerAirline(config.airlinesByMediation[2], 'TestAirline3', {from: config.airlinesByMediation[1]}),
        "Airline should be funded to add new airline",
        " can add new airline by mediation for not funded airline"
      )
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

    it(`cannot register new airline by mediation after 4th registeration`, async() => {
      TruffleAssert.reverts(
        config.flightSuretyApp.registerAirline(config.airlinesByVotes[0], 'TestAirline4'),
        "Only the owner of registring account can register himself",
        "Can register airline by medation after 4th registeration"
      );
    });

    it(`the 5th register airline will be in (waiting for votes) state`, async() => {
      await TruffleAssert.passes(
        config.flightSuretyApp.registerAirline(config.airlinesByVotes[0], 'TestAirline4', {from: config.airlinesByVotes[0]}),
      );

      let addedAirline = await config.flightSuretyApp.getAirline.call(config.airlinesByVotes[0]);
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

      let addedAirline = await config.flightSuretyApp.getAirline.call(config.airlinesByVotes[0]);
      assert.equal(addedAirline.numberOfRegistringVotes, '1', "votes did not change")
      assert.equal(addedAirline.state, '0', "state changed before 50% consensus")
    });

    it(`voter allready votes for an airline can not vote again using requireNewVoter `, async() => {
      await TruffleAssert.reverts(
        config.flightSuretyApp.voteForAirline(config.airlinesByVotes[0], {
          from: config.owner,
        }),
        "You voted for this airline",
        "voter can vote again!!"
      )
    });

    it(`airline in waiting for votes state should not change its state untill 50% of active airline votes`, async() => {
      await TruffleAssert.passes(
        config.flightSuretyApp.voteForAirline(config.airlinesByVotes[0], {from: config.airlinesByMediation[1]}),
      );

      let addedAirline = await config.flightSuretyApp.getAirline.call(config.airlinesByVotes[0]);
      assert.equal(addedAirline.numberOfRegistringVotes, '2')
      //AirlineRegisterationState.registered == 1
      assert.equal(addedAirline.state, '1')
    });

    it(`airline registered by votes can fund his account after voting finshed`, async() => {
      await TruffleAssert.passes(
        config.flightSuretyApp.fundMyAirline({
          from: config.airlinesByVotes[0], 
          value: web3.utils.toWei('10', "ether")
        }),
      );

      let addedAirline = await config.flightSuretyApp.getAirline.call(config.airlinesByVotes[0]);
      //AirlineRegisterationState.Funded == 2
      assert.equal(addedAirline.state, '2')
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



  describe(`\n🛫 Flights 🛬`, async() => {

    it(`airline can register a new flight`, async() => {
      await TruffleAssert.passes(
        config.flightSuretyApp.registerFlight(
          config.flights[0].name,
          config.flights[0].departure,
          config.flights[0].ticketNumbers,
          { from: config.flights[0].airlineAddress }
        ),
        "cannot add new flight `registerFlight`"
      );

      let flight = await config.flightSuretyApp.getFlight.call(
        config.flights[0].airlineAddress,
        config.flights[0].name,
        config.flights[0].departure
      );
      assert(flight.isRegistered, "flight didnt registered in app contract")

      // regidter another ailine
      await config.flightSuretyApp.registerFlight(
        config.flights[1].name,
        config.flights[1].departure,
        config.flights[1].ticketNumbers,
        { from: config.flights[1].airlineAddress }
      );
    });

    it(`airline can not register a registered flight`, async() => {
      await TruffleAssert.reverts(
        config.flightSuretyApp.registerFlight(
          config.flights[0].name,
          config.flights[0].departure,
          config.flights[0].ticketNumbers,
          { from: config.flights[0].airlineAddress }
        ),
        "Flight allredy registered",
        "can register allready registered flight see registerFlight function"
      );
    });

    it(`airline can add extra ticket numbers for a flight`, async() => {
      await TruffleAssert.passes(
        config.flightSuretyApp.addFlightTickets(
          config.flights[0].name,
          config.flights[0].departure,
          config.flights[0].extraTicketNumbers,
          { from: config.flights[0].airlineAddress }
        ),
        "cannot add extra ticket for flight `addFlightInsurances`"
      );
    });

    it(`airline cannot add doublecated ticket numbers for a flight`, async() => {
      await TruffleAssert.reverts(
        config.flightSuretyApp.addFlightTickets(
          config.flights[0].name,
          config.flights[0].departure,
          config.flights[0].extraTicketNumbers,
          { from: config.flights[0].airlineAddress }
        ),
        "Ticket number for this flight allready built",
        "can register allready registered flight see registerFlight function"
      );
    });

    it(`data state will add insurance keys to its flight array`, async() => {
      let flightInsuranceKeys = await config.flightSuretyApp.getInsuranceKeysOfFlight(
        config.flights[0].airlineAddress,
        config.flights[0].name,
        config.flights[0].departure
      );
      assert(flightInsuranceKeys, config.flights[0].extraTicketNumbers.length+config.flights[0].ticketNumbers.length);
    });

  });



  describe(`\n🕴 Oracles 🔮`, async() => {
    it('can register oracles', async () => {
      // ARRANGE
      let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();
  
      // ACT
      for(let i=0; i<config.oracles.length; i++) {
        await TruffleAssert.passes(
          await config.flightSuretyApp.registerOracle({ from: config.oracles[i], value: fee })
        );
      }
    });

    it(`can get oracle indexes`, async() => {
      let result = await config.flightSuretyApp.getMyIndexes.call({from: config.oracles[0]});
      assert(result.length == 3);
    });

  });



  describe(`\n🧳 Passengers 🎫`, async() => {
    it(`passenger can buy insurance for his ticket`, async() => {
      
      await TruffleAssert.passes(
        config.flightSuretyApp.buyInsurance(
          config.tickets[0].flight.airlineAddress,
          config.tickets[0].flight.name,
          config.tickets[0].flight.departure,
          config.tickets[0].number,
          { from: config.passengers[0], value: web3.utils.toWei('1', "ether") }
        ),
        "passanger cannot buy insurance for his ticket using `buyInsurance`"
      );

      let insurance = await config.flightSuretyApp.getInsurance(
        config.tickets[0].flight.airlineAddress,
        config.tickets[0].flight.name,
        config.tickets[0].flight.departure,
        config.tickets[0].number
      );

      assert.equal(insurance.buyer, config.passengers[0], "bouyer of insurance didnt match the data in contract");
      // InsuranceState.Bought == 2
      assert.equal(insurance.state, "2", "state of insurance not in bought state")
    });

    it(`passangers cannot buy insurance again`, async() => {
      TruffleAssert.reverts(
        config.flightSuretyApp.buyInsurance(
          config.tickets[0].flight.airlineAddress,
          config.tickets[0].flight.name,
          config.tickets[0].flight.departure,
          config.tickets[0].number,
          { from: config.passengers[0], value: config.tickets[0].insuranceValue }
        ),
        "Insurance for this ticket allredy bought"
      )
    });

    it(`insurance cannot be bought with more than 1 ether`, async() => {
      TruffleAssert.reverts(
        config.flightSuretyApp.buyInsurance(
          config.tickets[1].flight.airlineAddress,
          config.tickets[1].flight.name,
          config.tickets[1].flight.departure,
          config.tickets[1].number,
          { from: config.passengers[1], value: web3.utils.toWei('1.1', "ether") }
        ),
        "Insurance can accept less than 1 ether"
      );
    });

    it(`data state will add insurance keys to its buyer (passanger) array`, async() => {
      let passangerInsuranceKeys = await config.flightSuretyApp.getInsuranceKeysOfPassanger(config.passengers[0]);
      assert(passangerInsuranceKeys.length, 1)
    });

    it(`can request flight status, event OracleRequest emited`, async() => {
      let promiseTx = config.flightSuretyApp.fetchFlightStatus(
        config.tickets[0].flight.airlineAddress,
        config.tickets[0].flight.name,
        config.tickets[0].flight.departure,
        {from: config.passengers[0]}
      );
      await TruffleAssert.passes(promiseTx);
      TruffleAssert.eventEmitted(await promiseTx, 'OracleRequest', (ev) => {
        config.tickets[0].flight.chosenIndex = ev.index
        return true;
      });

      // ticket2 asking for fetchFlightStatus
      await config.flightSuretyApp.fetchFlightStatus(
        config.tickets[1].flight.airlineAddress,
        config.tickets[1].flight.name,
        config.tickets[1].flight.departure,
        {from: config.passengers[1]}
      );
    });

    it(`oracles can update status code of flight using submitOracleResponse, event OracleReport emited`, async() => {
      let reseponseCounter = 0
      for (let i = 0; i < config.oracles.length; i++) {
        let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({from: config.oracles[i]});
        for (let idx = 0; idx < 3; idx++) {
          try {
            let tx = await config.flightSuretyApp.submitOracleResponse(
              oracleIndexes[idx], 
              config.tickets[0].flight.airlineAddress,
              config.tickets[0].flight.name,
              config.tickets[0].flight.departure,
              config.tickets[0].flight.statusCode,
              {from: config.oracles[i]}
            );

            reseponseCounter += 1;
            if (reseponseCounter >= 3) {
              TruffleAssert.eventEmitted(tx, 'FlightStatusInfo', (ev) => {
                console.log(`**--> Report from oracles[${i}].index[${idx}]:(${oracleIndexes[idx]}) 👏🏽👏🏽👏🏽👏🏽 updated flight with status code ${ev.status}`);
                return true;
              });
            } else {
              TruffleAssert.eventEmitted(tx, 'OracleReport', (ev) => {
                console.log(`--> Report from oracles[${i}].index[${idx}]:(${oracleIndexes[idx]}) 👏🏽 accepted with status code ${ev.status}`);
                return true;
              });
            }

          } catch(e) {
            if (e.reason != 'Flight or timestamp do not match oracle request')
              console.log(e)
          }
        }
      }
    });

    it(`oracles trying to manipulate status code will not change real world data`, async() => {
      let rightReseponseCounter = 0;
      let wrongReseponseCounter = 0;
      let tx;
      for (let i = 0; i < config.oracles.length; i++) {
        let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({from: config.oracles[i]});
        for (let idx = 0; idx < 3; idx++) {
          try {
            if (i == 1 || i == 5 || i == 10 || i == 15) {
              tx = await config.flightSuretyApp.submitOracleResponse(
                oracleIndexes[idx], 
                config.tickets[1].flight.airlineAddress,
                config.tickets[1].flight.name,
                config.tickets[1].flight.departure,
                config.STATUS_CODE.LATE_AIRLINE,
                {from: config.oracles[i]}
              );
              wrongReseponseCounter += 1;
            } else {
              tx = await config.flightSuretyApp.submitOracleResponse(
                oracleIndexes[idx], 
                config.tickets[1].flight.airlineAddress,
                config.tickets[1].flight.name,
                config.tickets[1].flight.departure,
                config.tickets[1].flight.statusCode,
                {from: config.oracles[i]}
              );
              rightReseponseCounter += 1;
            }
            
            if (rightReseponseCounter >= 3 || wrongReseponseCounter >= 3) {
              TruffleAssert.eventEmitted(tx, 'FlightStatusInfo', (ev) => {
                console.log(`**--> Report from oracles[${i}].index[${idx}]:(${oracleIndexes[idx]}) 👏🏽👏🏽👏🏽👏🏽 updated flight with status code ${ev.status}`);
                return true;
              });
            } else {
              TruffleAssert.eventEmitted(tx, 'OracleReport', (ev) => {
                console.log(`--> Report from oracles[${i}].index[${idx}]:(${oracleIndexes[idx]}) 👏🏽 accepted with status code ${ev.status}`);
                return true;
              });
            }

          } catch(e) {
            if (e.reason != 'Flight or timestamp do not match oracle request')
              console.log(e)
          }
        }
      }
    });

    it(`flights status code updated after oracles respones`, async() => {
      let flight1 = await config.flightSuretyApp.getFlight.call(
        config.flights[0].airlineAddress,
        config.flights[0].name,
        config.flights[0].departure
      );

      assert.equal(flight1.statusCode, config.flights[0].statusCode);

      let flight2 = await config.flightSuretyApp.getFlight.call(
        config.flights[1].airlineAddress,
        config.flights[1].name,
        config.flights[1].departure
      );

      assert.equal(flight2.statusCode, config.flights[1].statusCode);
    });

    it(`value of insurance which bought by passenger crideted after oracles respones if status code == 20`, async() => {
      let insurance = await config.flightSuretyApp.getInsurance.call(
        config.tickets[0].flight.airlineAddress,
        config.tickets[0].flight.name,
        config.tickets[0].flight.departure,
        config.tickets[0].number,
      );

      let insuranceValue15X = config.tickets[0].insuranceValue*1.5;

      assert.equal(insurance.value.toString(), insuranceValue15X.toString());
      // InsuranceState.Passed == 3
      assert.equal(insurance.state, '3');
    });

    it(`value of insurance which bought by passenger will not crideted after oracles respones if status code != 20`, async() => {
      let insurance = await config.flightSuretyApp.getInsurance.call(
        config.tickets[1].flight.airlineAddress,
        config.tickets[1].flight.name,
        config.tickets[1].flight.departure,
        config.tickets[1].number,
      );

      let insuranceValue15X = 0;

      assert.equal(insurance.value.toString(), insuranceValue15X.toString());
      // InsuranceState.Expired == 4
      assert.equal(insurance.state, '4');
    });

    it(`state of insurance which not bought by passenger should expire after oracles respones`, async() => {
      let insurance = await config.flightSuretyApp.getInsurance.call(
        config.flights[0].airlineAddress,
        config.flights[0].name,
        config.flights[0].departure,
        config.flights[0].extraTicketNumbers[0],
      );

      let insuranceValue15X = 0;

      assert.equal(insurance.value.toString(), insuranceValue15X.toString());
      // InsuranceState.Expired == 4
      assert.equal(insurance.state, '4');
    });

    it(`passanger who bought insurance for a flight and passed with status code == 20 can withdrow his insurance value`, async() => {
      let passengerBalanceBefore = new BigNumber(await web3.eth.getBalance(config.passengers[0]));
      let insuranceCredit15X = config.tickets[0].insuranceValue*1.5;
  
      await TruffleAssert.passes(
        config.flightSuretyApp.withdrowCredit(
          config.tickets[0].flight.airlineAddress,
          config.tickets[0].flight.name,
          config.tickets[0].flight.departure,
          config.tickets[0].number,
          { from: config.passengers[0] }
        ),
        "withdrowCredit() function did not passes"
      );
  
      let passengerBalanceAfter = new BigNumber(await web3.eth.getBalance(config.passengers[0]));
      let passengerBalanceShouldBe = passengerBalanceBefore.plus(insuranceCredit15X);
      assert(passengerBalanceShouldBe.isGreaterThanOrEqualTo(passengerBalanceAfter) &&
        passengerBalanceAfter.isGreaterThan(passengerBalanceBefore)
      );
    });

  });

});
