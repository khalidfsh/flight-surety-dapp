
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {

    let owner = accounts[0];
    let firstAirline = owner;
    let airlinesByMediation = accounts.slice(1, 4);
    let airlinesByVotes = accounts.slice(4, 11);
    let passengers = accounts.slice(11, 15);
    let oracles = accounts.slice(15,36);

    let flightSuretyData = await FlightSuretyData.new({from: owner});
    let flightSuretyApp = await FlightSuretyApp.new(flightSuretyData.address, {from: owner});

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
            ticketNumbers: ['101', '103', '104', '132', '161', '171', '172', '221', '231', '244']
        }
    ]

    let tickets = [
        {
            airlineAddress: firstAirline,
            flightName: flights[0].name,
            departure: flights[0].departure,
            number: flights[0].ticketNumbers[0],
        },
        {
            airlineAddress: firstAirline,
            flightName: flights[1].name,
            departure: flights[1].departure,
            number: flights[1].ticketNumbers[0],
        }
    ];

    // Watch contract events
    let STATUS_CODE = {
        UNKNOWN: '0',
        ON_TIME: '10',
        LATE_AIRLINE: '20',
        LATE_WEATHER: '30',
        LATE_TECHNICAL: '40',
        LATE_OTHER: '50'
    }

    return {
        owner: owner,
        firstAirline: firstAirline,
        airlinesByMediation: airlinesByMediation,
        airlinesByVotes: airlinesByVotes,
        passengers: passengers,
        oracles: oracles,
        flights: flights,
        tickets: tickets,
        STATUS_CODE: STATUS_CODE,
        weiMultiple: (new BigNumber(10)).pow(18),
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp
    }
}

module.exports = {
    Config: Config
};