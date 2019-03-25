
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {

    let owner = accounts[0];
    let airlinesByMediation = accounts.slice(1, 4);
    let airlinesByVotes = accounts.slice(4, 11);

    let flightSuretyData = await FlightSuretyData.new({from: owner});
    let flightSuretyApp = await FlightSuretyApp.new(flightSuretyData.address, "4", "50",{from: owner});

    
    return {
        owner: owner,
        airlinesByMediation: airlinesByMediation,
        airlinesByVotes: airlinesByVotes,
        weiMultiple: (new BigNumber(10)).pow(18),
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp
    }
}

module.exports = {
    Config: Config
};