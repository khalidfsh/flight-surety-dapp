import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        this.config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(this.config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, this.config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, this.config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.passenger = null;
        this.airlines = [];
        this.flights = {};
    }

    async initialize(callback) {
        let accounts = await this.web3.eth.getAccounts();

        this.owner = accounts[0];
        this.passenger = accounts[10];

        const flightsNames = ['HR305', 'JR430', 'MH666', 'NN199'];
        const ticketsNumbers = [['321', '324'], ['433', '567'], ['132', '544'], ['635', '343']];
        
        console.log("Hello Passenger <name>, your adress is: "+ this.passenger);

        try {
            await this.flightSuretyData.methods.authorizeCallerContract(this.config.appAddress).send({from: this.owner})
        } catch(e) { }
        
        let airlinesAddresses = accounts.slice(0,4);

        for(let i=0; i<4; i++) {
            try {
                await this.flightSuretyApp.methods
                .registerAirline(airlinesAddresses[i], 'Airline'+i)
                .send({from: this.owner, gas: 1500000});
            } catch (e) { 
                //console.log(`Error while registring new airline, address: ${airlinesAddresses[i]}\n${e.message}`) 
            }

            try {
                await this.flightSuretyApp.methods
                .fundMyAirline()
                .send({
                    from: airlinesAddresses[i], 
                    value: this.web3.utils.toWei('10', "ether"), 
                    gas: 1500000
                });
            } catch (e) { 
                //console.log(`Error while funding airline, address: ${airlinesAddresses[i]}\n${e.message}`) 
            }

            this.flights[flightsNames[i]] = {
                airlineAddress: airlinesAddresses[i],
                name: flightsNames[i],
                departure: Math.floor(new Date(2019, 3, 1, 22, 30, 0, 0) / 1000),
                tickets: ticketsNumbers[i]
            };

            try {
                await this.flightSuretyApp.methods
                .registerFlight(
                    this.flights[flightsNames[i]].name,
                    this.flights[flightsNames[i]].departure,
                    ticketsNumbers[i]
                )
                .send({from: airlinesAddresses[i], gas: 1500000})
            } catch (e) { 
                //console.log(`Error while register new flight for airline, address: ${airlinesAddresses[i]}\n${e.message}`) 
            }

            let airline = await this.flightSuretyApp.methods.getAirline(airlinesAddresses[i]).call();
            console.log(`Airline Name: ${airline.name} has ben registered and funded with Address: ${airlinesAddresses[i]}`);
            //console.log(airline);

            let insurance1 = await this.flightSuretyApp.methods
            .getInsurance(
                airlinesAddresses[i],
                this.flights[flightsNames[i]].name,
                this.flights[flightsNames[i]].departure,
                this.flights[flightsNames[i]].tickets[0],
            )
            .call();
            let insurance2 = await this.flightSuretyApp.methods
            .getInsurance(
                airlinesAddresses[i],
                this.flights[flightsNames[i]].name,
                this.flights[flightsNames[i]].departure,
                this.flights[flightsNames[i]].tickets[1],
            )
            .call();
            
            console.log(`And registered flight number: ✈️ '${flightsNames[i]}' with tickets numbers: (🎫${insurance1.ticketNumber}, 🎫${insurance2.ticketNumber})`);
            //console.log(insurance1)  
        }

        callback();
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    fetchFlightStatus(flightName, callback) {
        let self = this;
        self.flightSuretyApp.methods
        .fetchFlightStatus(
            self.flights[flightName].airlineAddress,
            self.flights[flightName].name,
            self.flights[flightName].departure,
        )
        .send({ from: self.owner}, (err, res) => callback(err, self.flights[flightName]));
    }

    purchaseInsurance(flightName, ticketNumber, amount, callback){
        let self = this;
       
        this.flightSuretyApp.methods
        .purchaseInsurance(
            self.flights[flightName].airlineAddress,
            self.flights[flightName].name,
            self.flights[flightName].departure,
            ticketNumber
        )
        .send({
            from: self.passenger,
            value: self.web3.utils.toWei(amount, "ether"),
            gass: 1500000,
        }, (err, res) => callback(err, {flight: self.flights[flightName], ticket: ticketNumber}));
        
    }

    withdrawCredit(flightName, ticketNumber, callback) {
        let self = this;
        
        this.flightSuretyApp.methods
        .withdrawCredit(
            self.flights[flightName].airlineAddress,
            self.flights[flightName].name,
            self.flights[flightName].departure,
            ticketNumber
        )
        .send({
            from: self.passenger,
            gass: 1500000,
        }, (err, res) => callback(err, {flight: self.flights[flightName], ticket: ticketNumber}));
    }
}