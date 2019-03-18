pragma solidity ^0.5.2;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

 import "./FlightSuretyDataInterface.sol";


contract FlightSuretyData is FlightSuretyDataInterface {
    using SafeMath for uint256;

/* ============================================================================================== */
/*                                         DATA VARIABLES                                         */
/* ============================================================================================== */
    /// Account used to deploy contract
    address private contractOwner;  

    /// Blocks all state changes throughout the contract if false                     
    bool private operational = true;

    /// List of contract addresses allowed to call this contract
    mapping(address => bool) public authorizedContracts;
/* ---------------------------------------------------------------------------------------------- */



/* ============================================================================================== */
/*                                        EVENT DEFINITIONS                                       */
/* ============================================================================================== */


/* ---------------------------------------------------------------------------------------------- */



/* ============================================================================================== */
/*                                  CONSTRUCTOR&FALLBACK FUNCTION                                 */
/* ============================================================================================== */
    /// @dev Constructor
    /// The deploying account becomes contractOwner
    constructor() public 
    {
        contractOwner = msg.sender;
    }

    /// @dev Fallback function for funding smart contract.
    function() 
        external 
        payable 
    {
        fund();
    }
/* ---------------------------------------------------------------------------------------------- */



/* ============================================================================================== */
/*                                       FUNCTION MODIFIERS                                       */
/* ============================================================================================== */
    /// @dev Modifier that requires the "operational" boolean variable to be "true"
    /// This is used on all state changing functions to pause the contract in the event
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;
    }

    /// @dev Modifier that requires the "ContractOwner" account to be the function caller
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }
/* ---------------------------------------------------------------------------------------------- */



/* ============================================================================================== */
/*                                        UTILITY FUNCTIONS                                       */
/* ============================================================================================== */
    /// @dev Get operating status of contract
    /// @return A bool that is the current operating status
    function isOperational() 
        external 
        view 
        returns(bool)
    {
        return operational;
    }

    /// @dev Sets contract operations on/off
    /// When operational mode is disabled, all write transactions except for this one will fail
    function setOperatingStatus(bool mode) 
        external
        requireContractOwner
    {
        operational = mode;
    }

    /// @dev Authoriztion process for new version of app contract
    /// Only the owner of the contract can authrize a caller contract to start changing data state
    function authorizeCaller(address contractAddress)
        external
        requireContractOwner
        requireIsOperational
    {
        authorizedContracts[contractAddress] = true;
    }
/* ---------------------------------------------------------------------------------------------- */



/* ============================================================================================== */
/*                                    SMART CONTRACT FUNCTIONS                                    */
/* ============================================================================================== */
    /// @dev Add an airline to the registration queue
    /// @notice Can only be called from FlightSuretyApp contract
    function registerAirline()
        external
        pure
    {
    }

    /// @dev Buy insurance for a flight
    function buy()
        external
        payable
    {

    }

    /// @dev Credits payouts to insurees
    function creditInsurees()
        external
        pure
    {
    }
    
    /// @dev Transfers eligible payout funds to insuree
    function pay()
        external
        pure
    {
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    */   
    function fund()
        public
        payable
    {
    }

    function getFlightKey
    (
        address airline,
        string memory flight,
        uint256 timestamp
    )
        pure
        internal
        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }
/* ---------------------------------------------------------------------------------------------- */

}

