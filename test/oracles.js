
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const TruffleAssert = require('truffle-assertions')


contract('Oracles', async (accounts) => {

  const TEST_ORACLES_COUNT = 20;
  var chosenStatusCode;
  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    chosenStatusCode = config.STATUS_CODE.ON_TIME;

    await config.flightSuretyData.authorizeCallerContract(config.flightSuretyApp.address);

    // register new flight to test it using orcales
    await config.flightSuretyApp.registerFlight(
      config.flights[0].name,
      config.flights[0].departure,
      config.flights[0].ticketNumbers,
      { from: config.firstAirline }
    );

    await config.flightSuretyApp.buyInsurance(
      config.firstTicket.airlineAddress,
      config.firstTicket.flightName,
      config.firstTicket.departure,
      config.firstTicket.number,
      { from: config.passengers[0], value: web3.utils.toWei('1', "ether") }
    );

    let insurance = await config.flightSuretyApp.getInsurance(
      config.firstTicket.airlineAddress,
      config.firstTicket.flightName,
      config.firstTicket.departure,
      config.firstTicket.number
    );
    console.log(insurance)

  });


  it('can register oracles', async () => {
    
    // ARRANGE
    let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();

    // ACT
    for(let a=1; a<TEST_ORACLES_COUNT; a++) {      
      await config.flightSuretyApp.registerOracle({ from: accounts[a], value: fee });
      let result = await config.flightSuretyApp.getMyIndexes.call({from: accounts[a]});
      ///console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
    }
  });

  it('can request flight status', async () => {
    
    var index;

    // Submit a request for oracles to get status information for a flight
    let ffstx = await config.flightSuretyApp.fetchFlightStatus(config.firstAirline, config.flights[0].name, config.flights[0].departure);
    TruffleAssert.eventEmitted(ffstx, 'OracleRequest', (ev) => {
      console.log(ev.index);
      index = ev.index;
      return true;
    });
    // ACT
    // Since the Index assigned to each test account is opaque by design
    // loop through all the accounts and for each account, all its Indexes (indices?)
    // and submit a response. The contract will reject a submission if it was
    // not requested so while sub-optimal, it's a good test of that feature
    for(let a=1; a<TEST_ORACLES_COUNT; a++) {

      // Get oracle information
      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a]});
      for(let idx=0;idx<3;idx++) {
        try {
          // Submit a response...it will only be accepted if there is an Index match
          let tx = await config.flightSuretyApp.submitOracleResponse(
            oracleIndexes[idx], 
            config.firstAirline, 
            config.flights[0].name, 
            config.flights[0].departure, 
            chosenStatusCode, 
            {from: accounts[a]}
          );
          
          TruffleAssert.eventEmitted(tx, 'OracleReport')
          TruffleAssert.eventEmitted(tx, 'FlightStatusInfo', (ev) => {
            return (ev.status.toString() == chosenStatusCode);
          })
        }
        catch(e) {
          // Enable this when debugging
          //console.log('\nError', idx, oracleIndexes[idx].toNumber(), config.flights[0].name, config.flights[0].departure);
        }
      }
    }

    let flight = await config.flightSuretyApp.getFlight.call(
      config.firstAirline,
      config.flights[0].name,
      config.flights[0].departure
    );

    console.log(flight.statusCode.toString(), chosenStatusCode);

    let insurance = await config.flightSuretyApp.getInsurance(
      config.firstTicket.airlineAddress,
      config.firstTicket.flightName,
      config.firstTicket.departure,
      config.firstTicket.number
    );
    console.log(insurance)

  });
 
});
