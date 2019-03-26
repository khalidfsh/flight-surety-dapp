pragma solidity ^0.5.2;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

import "./FlightSuretyDataInterface.sol";


contract FlightSuretyData is FlightSuretyDataInterface {
    using SafeMath for uint256;
    using SafeMath for uint8;

/* ============================================================================================== */
/*                                         DATA VARIABLES                                         */
/* ============================================================================================== */
    /// Account used to deploy contract
    address private contractOwner;  
    /// Blocks all state changes throughout the contract if false                     
    bool private operational = true;

    /// List of app contract addresses allowed to call this contract
    mapping(address => bool) private authorizedContracts;

    /// Registeration type state
    RegisterationType private registerationType;

    /// Number of registered Airlines
    uint256 private numberOfRegisteredAirlines;
    /// Number of funded Airlines
    uint256 private numberOfFundedAirlines; 

    /// List of airlins mapped by its addresses to Airline structure
    mapping(address => Airline) private airlines;

/* ---------------------------------------------------------------------------------------------- */



/* ============================================================================================== */
/*                                        EVENT DEFINITIONS                                       */
/* ============================================================================================== */
    event ToggledOperationalState(bool operational);
    event ContractAuthorized(address contractAddress);
    event ContractDeauthorized(address contractAddress);
/* ---------------------------------------------------------------------------------------------- */



/* ============================================================================================== */
/*                                  CONSTRUCTOR&FALLBACK FUNCTION                                 */
/* ============================================================================================== */
    /// @dev Constructor
    /// The deploying account becomes contractOwner and adding first airline 
    constructor() public payable
    {
        contractOwner = msg.sender;

        /// Adding 1st airline 
        addAirline(
            msg.sender,
            "SAUDIA",
            AirlineRegisterationState.Funded
        );
        
        registerationType = RegisterationType.BY_MEDIATION;
        numberOfFundedAirlines = 1;
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

    /// @dev Only authorized contract addresses can call this modifier
    modifier requireCallerAuthorized() {
        require(authorizedContracts[msg.sender] == true, "Contract Address not authorized to call this function");
        _;
    }

    /// @dev Modifier that checks if airline address not existing in data
    modifier requireNotExistAirline(address airlineAddress) {
        require(!airlines[airlineAddress].isExist, "Cannot register a registered airline address");
        _;
    }

    /// @dev Modifier that checks if airline address existing in data
    modifier requireExistAirline(address airlineAddress) {
        require(airlines[airlineAddress].isExist, "Airline address not existing");
        _;
    }

/* ---------------------------------------------------------------------------------------------- */



/* ============================================================================================== */
/*                                        UTILITY FUNCTIONS                                       */
/* ============================================================================================== */
    /// @dev Get operating status of contract
    /// @return A boolean that is the current operating status
    function isOperational() 
        external 
        view 
        returns(bool)
    {
        return operational;
    }

    /// @dev Get Authorization status of a contract address
    /// @param contractAddress Ethereum contract address to check
    /// @return Boolean if its authorized or not
    function isAuthorized(address contractAddress)
        external
        view
        returns(bool)
    {
        return authorizedContracts[contractAddress];
    }

    /// @dev Get registration type state
    /// @return Current registration type as `RegisterationType` enum
    function getRegistrationType()
        external
        view
        returns(RegisterationType)
    {
        return registerationType;
    }

    /// @dev Sets contract operations on/off
    /// When operational mode is disabled, all write transactions except for this one will fail
    /// @return A boolean for new operating status
    function toggleOperatingStatus() 
        external
        requireContractOwner()
    {
        operational = !operational;
        emit ToggledOperationalState(operational);
    }

    /// @dev Set registration type state
    /// Only an authorized contract caller can call this function
    /// @param _type Registration type to be the stat of registertion way
    function setRegistrationType(RegisterationType _type)
        external
        requireCallerAuthorized()
    {
        registerationType = _type;
    }

    /// @dev Authoriztion process for new version of app contract
    /// Only the owner of the contract can authrize a caller contract to start changing data state
    function authorizeCallerContract(address contractAddress)
        external
        requireContractOwner()
    {
        authorizedContracts[contractAddress] = true;
        emit ContractAuthorized(contractAddress);
    }

    /// @dev Deauthoriztion process for a version of app contract
    /// Only the owner of the contract can deauthrize a caller contract
    function deauthorizeCallerContract(address contractAddress)
        external
        requireContractOwner()
    {
        authorizedContracts[contractAddress] = false;
        emit ContractDeauthorized(contractAddress);
    }

    /// @dev Get existing state of an airline address
    /// @param airlineAddress Ethereum address of airline to check
    /// @return Boolean eather its exist or not
    function isAirlineExist(address airlineAddress) 
        external
        view
        requireIsOperational
        returns(bool)
    {
        return airlines[airlineAddress].isExist;
    }

    /// @dev Get the number of registered airlines
    /// @return Current number of registered airline as `uint256`
    function getNumberOfRegisteredAirlines()
        external
        view
        requireIsOperational
        returns(uint256)
    {
        return(numberOfRegisteredAirlines);
    }

    /// @dev Get the number of registered and funded airlines
    /// @return Current number of active airline (funded airline) as `uint256`
    function getNumberOfActiveAirlines()
        external
        view
        requireIsOperational
        returns(uint256)
    {
        return(numberOfFundedAirlines);
    }

    /// @dev Get registered airline
    /// @param airlineAddress Airline ethereum account to retrive its data
    /// @return tuple contain all airline struct data
    function getAirline(address airlineAddress)
        external
        view
        requireIsOperational
        requireExistAirline(airlineAddress)
        returns(
            string memory name,
            AirlineRegisterationState state,
            uint numberOfVotes,
            uint8 failureRate,
            bool isExist,
            bytes32[] memory flightKeys
        )
    {
        Airline memory _airline = airlines[airlineAddress];
        return(
            _airline.name,
            _airline.state,
            _airline.numberOfVotes,
            _airline.failureRate,
            _airline.isExist,
            _airline.flightKeys
        );
    }

    /// @dev Get airline registration state
    /// @param airlineAddress Ethereum address of airline to check
    /// @return Current registration of airline as `AirlineRegisterationState` enumeration
    function getAirlineState(address airlineAddress) 
        external
        view
        requireIsOperational
        requireExistAirline(airlineAddress)
        returns(AirlineRegisterationState)
    {
        return (airlines[airlineAddress].state);
    }

    /// @dev Get number of votes for an airline
    /// @notice Can only be called from authorized contract
    /// @param airlineAddress Airline ethereum account to get its number of votes
    /// @return Current number of votes for a spicefic airline
    function getAirlineVotes(address airlineAddress)
        external
        view
        requireIsOperational
        requireExistAirline(airlineAddress)
        returns(uint)
    {
        return airlines[airlineAddress].numberOfVotes;
    }


/* ---------------------------------------------------------------------------------------------- */



/* ============================================================================================== */
/*                                    SMART CONTRACT FUNCTIONS                                    */
/* ============================================================================================== */
    /// @dev Register an airline
    /// @notice Can only be called from authorized contract
    /// @param airlineAddress Ethereum account owned by airline to be saved
    /// @param name Airline name (company name)
    /// @param state Inital state of the airline **it'll be managed in App contract**
    function registerAirline
    (
        address airlineAddress,
        string calldata name,
        AirlineRegisterationState state
    )
        external
        requireCallerAuthorized()
    {
        addAirline(
            airlineAddress,
            name,
            state
        );
    }

    /// @dev Set airline state
    /// @notice Can only be called from authorized contract
    /// @param airlineAddress Airline ethereum account to change its state
    /// @param _state The new state of airline registeration to be updated
    function setAirlineState
    (
        address airlineAddress,
        AirlineRegisterationState _state
    )
        external
        requireCallerAuthorized()
    {
        airlines[airlineAddress].state = _state;
    }

    /// @dev Add vote for an airline
    /// @notice Can only be called from authorized contract
    /// @param airlineAddress Airline ethereum account to add vote
    function addAirlineVote(address airlineAddress)
        external
        requireCallerAuthorized()
    {
        uint currentNumber = airlines[airlineAddress].numberOfVotes;
        airlines[airlineAddress].numberOfVotes = currentNumber.add(1);
    }

    /// @dev Update airline failure rate
    /// @notice Can only be called from authorized contract
    /// @param airlineAddress Airline ethereum account to update its failure rate
    /// @param _rate The new rate to be sets
    function updateAirlineFailureRate
    (
        address airlineAddress,
        uint8 _rate
    )
        external
        requireCallerAuthorized()
    {
        airlines[airlineAddress].failureRate = _rate;
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

    ///@dev Initial funding for the insurance. 
    function fund()
        public
        payable
        requireExistAirline(tx.origin)
    {
        require(airlines[tx.origin].state == AirlineRegisterationState.Registered, "This airline address not registered yet!");
        numberOfFundedAirlines = numberOfFundedAirlines.add(1);
        airlines[tx.origin].state = AirlineRegisterationState.Funded;
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

/* ============================================================================================== */
/*                                       INTERNAL FUNCTIONS                                       */
/* ============================================================================================== */
    /// @dev Internally Add new airline intety to data mapping
    /// @param account The airline account address to be added
    /// @param name The airline company name
    /// @param state Whiche state will be assign when added airline
    function addAirline
    (
        address account,
        string memory name,
        AirlineRegisterationState state
    )
        private
    {
        numberOfRegisteredAirlines = numberOfRegisteredAirlines.add(1);

        airlines[account] = Airline({
            name: name,
            state: state,
            numberOfVotes: 0,
            failureRate: 0,
            isExist: true,
            flightKeys: new bytes32[](0)
        });
    }

/* ---------------------------------------------------------------------------------------------- */

}
