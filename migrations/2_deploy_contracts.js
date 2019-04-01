const FlightSuretyData = artifacts.require("FlightSuretyData");
const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const fs = require('fs');

module.exports = async function(deployer, network, accounts) {

  const firstAirline = accounts[1];

  await deployer.deploy(FlightSuretyData);
  const dataContract = await FlightSuretyData.deployed();


  
  await deployer.deploy(FlightSuretyApp, dataContract.address);
  const appContract = await FlightSuretyData.deployed();

  let config = {
    localhost: {
      url: 'http://localhost:9545',
      dataAddress: dataContract.address,
      appAddress: appContract.address
    }
  }
  
  fs.writeFileSync(__dirname + '/../src/dapp/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
  fs.writeFileSync(__dirname + '/../src/server/config.json',JSON.stringify(config, null, '\t'), 'utf-8');

  console.log(network)
}
