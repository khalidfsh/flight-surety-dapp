pragma solidity ^0.5.2;

interface FlightSuretyDataInterface {
    function isOperational() external view returns(bool);
    function registerAirline() external pure;
    function buy() external payable;
    function creditInsurees() external pure;
    function pay() external pure;
}