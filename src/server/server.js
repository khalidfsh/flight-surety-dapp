import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';
import BigNumber from 'bignumber.js'
import { createHash } from 'crypto';


let config = Config['localhost'];
let web3 = new Web3(config.url.replace('http', 'ws'));
// owner and first ailine account
//web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
var orcales = [];

(async() => {
  let accounts = await web3.eth.getAccounts();
  try {
    await flightSuretyData.methods.authorizeCallerContract(config.appAddress).send({from: accounts[0]});
  } catch(e) {
    //console.log(e)
  }

  let fee = await flightSuretyApp.methods.REGISTRATION_FEE().call()
  
  accounts.slice(15,35).forEach( async(oracleAddress) => {
    // const estimateGas = await flightSuretyApp.methods.registerOracle().estimateGas({from: oracleAddress, value: fee});
    try {
      await flightSuretyApp.methods.registerOracle().send({from: oracleAddress, value: fee, gas: 3000000});
      let indexesResult = await flightSuretyApp.methods.getMyIndexes().call({from: oracleAddress});
      orcales.push({
        address: oracleAddress,
        indexes: indexesResult
      });
    } catch(e) {
      //console.log(e)
    }
  });
})();

console.log("Registering Orcales && Getting Indexes...");

(function() {
  var P = ["\\", "|", "/", "-"];
  var x = 0;
  return setInterval(function() {
    process.stdout.write("\r" + P[x++]);
    x &= 3;
  }, 250);
})();

setTimeout(() => {
  orcales.forEach(orcale => {
    console.log(`Oracle Address: ${orcale.address}, has indexes: ${orcale.indexes}`);
  })
  console.log("\nStart watching for event OracleRequest to submit responses")
}, 25000)


flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(error)
    else {
      let randomStatusCode = Math.floor(Math.random() * 6) * 10;
      let eventValue = event.returnValues;
      console.log(`Got a new event with randome index: ${eventValue.index} for flight: ${eventValue.flight}`);

      orcales.forEach((oracle) => {
        oracle.indexes.forEach((index) => {
          flightSuretyApp.methods.submitOracleResponse(
            index, 
            eventValue.airline, 
            eventValue.flight, 
            eventValue.timestamp, 
            randomStatusCode
          ).send(
            { from: oracle.address , gas:5555555}
          ).then(res => {
            console.log(`--> Report from oracles(${oracle.address}).index(${index}) 👏🏽 accepted with status code ${randomStatusCode}`)
          }).catch(err => {
            console.log(`--> Report from oracles(${oracle.address}).index(${index}) ❌ rejected with status code ${randomStatusCode}`)
          });
        });
      });
    }
});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


