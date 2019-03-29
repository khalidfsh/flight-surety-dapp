
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {

    let owner = accounts[0];
    let firstAirline = owner;
    let airlinesByMediation = accounts.slice(1, 4);
    let airlinesByVotes = accounts.slice(4, 11);
    let passengers = accounts.slice(11, 15);

    let flightSuretyData = await FlightSuretyData.new({from: owner});
    let flightSuretyApp = await FlightSuretyApp.new(flightSuretyData.address, "4", "50",{from: owner});

    let flights = [
        {
            name: 'HR305',
            departure: Math.floor(Date.now() / 1000),
            ticketNumbers: ['102', '103', '124', '152', '161', '172', '173', '174', '201', '205'],
            extraTicketNumbers: ['101', '104', '131', '132', '133', '134', '141', '144', '202']
        },
        {
            name: 'JR225',
            departure: Math.floor(Date.now() / 1000),
            ticketNumber: ['101', '103', '104', '132', '161', '171', '172', '221', '231', '244']
        }
    ]

    return {
        owner: owner,
        firstAirline: firstAirline,
        airlinesByMediation: airlinesByMediation,
        airlinesByVotes: airlinesByVotes,
        passengers: passengers,
        flights: flights,
        weiMultiple: (new BigNumber(10)).pow(18),
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp
    }
}

module.exports = {
    Config: Config
};