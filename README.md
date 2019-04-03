# FlightSurety

FlightSurety is a sample application project

## Install

This repository contains Smart Contract code in Solidity (using Truffle), tests (also using Truffle), dApp scaffolding (using HTML, CSS and JS) and server app scaffolding.

To install, download or clone the repo, then:

`npm install`

`truffle compile`

## Develop Client

### To run local host development blockchain you can use ganache-gui or just use truffle:

`npm run dev` 

or 

`truffle develop`

### To run truffle tests:
if you're using ganache-gui:

`npm run test:ggui`

or inside truffle development `truffle(develop)>`run:

`test`


### To use the dapp:
migrate contracts to your running localhost node
if you use ganache-gui:

`npm run migrate:ggui`

or inside truffle development `truffle(develop)>`run: 

`migrate`

then you can now run dapp frontend by:
`npm run dapp`

### To view dapp:
`http://localhost:8000`

## Develop Server

`npm run server`

and watch for oracles response

## Deploy

To build dapp for prod:
`npm run dapp:prod`

Deploy the contents of the ./dapp folder
