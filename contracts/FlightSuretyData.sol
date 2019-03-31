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

    /// Insurance data states 
    mapping(bytes32 => Insurance) private insurances;
    mapping(bytes32 => bytes32[]) private flightInsuranceKeys;
    mapping(address => bytes32[]) private passengerInsuranceKeys;

/* ---------------------------------------------------------------------------------------------- */



/* ============================================================================================== */
/*                                        EVENT DEFINITIONS                                       */
/* ============================================================================================== */
    event OperationalStateToggled(bool operational);
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
        //fund(msg.sender);
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
/*                                    PUBLIC UTILITY FUNCTIONS                                    */
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
        requireIsOperational
        returns(bool)
    {
        return authorizedContracts[contractAddress];
    }

    /// @dev Get registration type state
    /// @return Current registration type as `RegisterationType` enum
    function getRegistrationType()
        external
        view
        requireIsOperational
        returns(RegisterationType)
    {
        return registerationType;
    }

/* ---------------------------------------------------------------------------------------------- */



/* ============================================================================================== */
/*                                     OWNER UTILITY FUNCTIONS                                    */
/* ============================================================================================== */
    /// @dev Sets contract operations on/off
    /// When operational mode is disabled, all write transactions except for this one will fail
    /// @return A boolean for new operating status
    function toggleOperatingStatus() 
        external
        requireContractOwner()
    {
        operational = !operational;
        emit OperationalStateToggled(operational);
    }

    /// @dev Authoriztion process for new version of app contract
    /// Only the owner of the contract can authrize a caller contract to start changing data state
    function authorizeCallerContract(address contractAddress)
        external
        requireContractOwner
        requireIsOperational
    {
        require(authorizedContracts[contractAddress] == false, "allready authorized");
        authorizedContracts[contractAddress] = true;
        emit ContractAuthorized(contractAddress);
    }

    /// @dev Deauthoriztion process for a version of app contract
    /// Only the owner of the contract can deauthrize a caller contract
    function deauthorizeCallerContract(address contractAddress)
        external
        requireContractOwner
        requireIsOperational
    {
        require(authorizedContracts[contractAddress] == true, "allready deauthorized");
        authorizedContracts[contractAddress] = false;
        emit ContractDeauthorized(contractAddress);
    }

/* ---------------------------------------------------------------------------------------------- */



/* ============================================================================================== */
/*                                   CONTRACT UTILITY FUNCTIONS                                   */
/* ============================================================================================== */
    /// @dev Get existing state of an airline address
    /// @notice Can only be called from authorized contract
    /// @param airlineAddress Ethereum address of airline to check
    /// @return Boolean eather its exist or not
    function isAirlineExist(address airlineAddress) 
        external
        view
        requireIsOperational
        requireCallerAuthorized
        returns(bool)
    {
        return airlines[airlineAddress].isExist;
    }

    /// @dev Get an airline registring voter state
    /// @notice Can only be called from authorized contract
    /// @param airlineAddress Ethereum address of airline to check
    /// @param voterAddress Ethereum address of voter to check
    /// @return Boolean eather its voted or not
    function isVotedForRegisteringAirline(address airlineAddress, address voterAddress) 
        external
        view
        requireIsOperational
        requireCallerAuthorized
        returns(bool)
    {
        return airlines[airlineAddress].registeringVotes.voters[voterAddress];
    }

    /// @dev Get an airline removing voter state
    /// @notice Can only be called from authorized contract
    /// @param airlineAddress Ethereum address of airline to check
    /// @param voterAddress Ethereum address of voter to check
    /// @return Boolean eather its voted or not
    function isVotedForRemovingAirline(address airlineAddress, address voterAddress) 
        external
        view
        requireIsOperational
        requireCallerAuthorized
        returns(bool)
    {
        return airlines[airlineAddress].removingVotes.voters[voterAddress];
    }

    /// @dev Get the number of registered airlines
    /// @notice Can only be called from authorized contract
    /// @return Current number of registered airline as `uint256`
    function getNumberOfRegisteredAirlines()
        external
        view
        requireIsOperational
        requireCallerAuthorized
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
        requireCallerAuthorized
        returns(uint256)
    {
        return(numberOfFundedAirlines);
    }

    /// @dev Get airline registration state
    /// @notice Can only be called from authorized contract
    /// @param airlineAddress Ethereum address of airline to check
    /// @return Current registration of airline as `AirlineRegisterationState` enumeration
    function getAirlineState(address airlineAddress) 
        external
        view
        requireIsOperational
        requireCallerAuthorized
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
        requireCallerAuthorized
        requireExistAirline(airlineAddress)
        returns(uint)
    {
        return airlines[airlineAddress].registeringVotes.numberOfVotes;
    }

    /// @dev Get registered airline
    /// @notice Can only be called from authorized contract
    /// @param airlineAddress Airline ethereum account to retrive its data
    /// @return tuple contain some airline struct data
    function fetchAirlineData(address airlineAddress)
        external
        view
        requireIsOperational
        requireCallerAuthorized
        requireExistAirline(airlineAddress)
        returns(
            bool isExist,
            string memory name,
            AirlineRegisterationState state,
            uint numberOfRegistringVotes,
            uint numberOfRemovingVotes,
            uint8 failureRate,
            bytes32[] memory flightKeys,
            uint numberOfInsurance
        )
    {
        Airline memory _airline = airlines[airlineAddress];
        return(
            _airline.isExist,
            _airline.name,
            _airline.state,
            _airline.registeringVotes.numberOfVotes,
            _airline.removingVotes.numberOfVotes,            
            _airline.failureRate,
            _airline.flightKeys,
            _airline.numberOfInsurance
        );
    }

    /// @dev Get insurance data by its key
    /// @notice Can only be called from authorized contract
    /// @param insuranceKey Insurance key to fetch its data
    /// @return tuple contain all Insurance struct data
    function fetchInsuranceData(bytes32 insuranceKey)
        external
        view
        requireIsOperational
        requireCallerAuthorized
        returns(
            address buyer,
            address airline,
            uint value,
            uint ticketNumber,
            InsuranceState state
        )
    {
        Insurance memory _insurance = insurances[insuranceKey];
        return(
            _insurance.buyer,
            _insurance.airline,
            _insurance.value,
            _insurance.ticketNumber,
            _insurance.state
        );
    }

    /// @dev Get insurances keys for a flight
    /// @notice Can only be called from authorized contract
    /// @param flightKey Key of a flight as bytes32 
    /// @return array of keys as bytes32 data type
    function fetchFlightInsurances(bytes32 flightKey)
        external
        view
        requireIsOperational
        requireCallerAuthorized
        returns(bytes32[] memory)
    {
        return flightInsuranceKeys[flightKey];
    }

    /// @dev Get insurances keys for a passenger(buyer)
    /// @notice Can only be called from authorized contract
    /// @param passengerAddress Passenger ethereum account to retrive its keys
    /// @return array of keys as bytes32 data type
    function fetchPasengerInsurances(address passengerAddress)
        external
        view
        requireIsOperational
        requireCallerAuthorized
        returns(bytes32[] memory)
    {
        return passengerInsuranceKeys[passengerAddress];
    }

    /// @dev Set registration type state
    /// @notice Can only be called from authorized contract
    /// @param _type Registration type to be the stat of registertion way
    function setRegistrationType(RegisterationType _type)
        external
        requireCallerAuthorized()
    {
        registerationType = _type;
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

    /// @dev Update exist airline data
    /// @notice Can only be called from authorized contract
    /// For future using if needed
    function updateAirline
    (
        address airlineAddress,
        bool isExist,
        string calldata name,
        AirlineRegisterationState state,
        uint8 failureRate,
        bytes32[] calldata flightKeys,
        uint numberOfInsurance
    )
        external
        requireCallerAuthorized()
        requireExistAirline(airlineAddress)
    {
        Airline storage _airline = airlines[airlineAddress];
        _airline.isExist = isExist;
        _airline.name = name;
        _airline.state = state;
        _airline.failureRate = failureRate;
        _airline.flightKeys = flightKeys;
        _airline.numberOfInsurance = numberOfInsurance;
    }

    /// @dev Delete existing airline 
    /// For future using if needed
    function deleteAirline
    (
        address airlineAddress
    )
        external
        requireCallerAuthorized()
        requireExistAirline(airlineAddress)
    {
        delete airlines[airlineAddress];
    }

    /// @dev Transfer owned airline
    /// @notice Can only be called from authorized contract
    /// For future use if needed
    function transferAirline
    (
        address airlineAddress,
        address newAirlineAddress
    )
        external
        requireCallerAuthorized()
        requireExistAirline(airlineAddress)
        requireNotExistAirline(newAirlineAddress)
    {
        Airline memory _airline = airlines[airlineAddress];
        delete airlines[airlineAddress];

        airlines[newAirlineAddress] = _airline;
    }

    /// @dev Add airline's flight to its structure
    /// @notice Can only be called from authorized contract
    /// @param airlineAddress Airline ethereum account to add to
    /// @param flightKey new flight key that added to flight mapping
    function addFlightKeyToAirline
    (
        address airlineAddress,
        bytes32 flightKey
    )
        external
        requireCallerAuthorized()
    {
        airlines[airlineAddress].flightKeys.push(flightKey);
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
    /// @param airlineAddress Airline ethereum account to add vote to
    /// @param voterAddress Voter address used to call this function
    function addAirlineVote(address airlineAddress, address voterAddress)
        external
        requireCallerAuthorized()
    {
        uint currentNumber = airlines[airlineAddress].registeringVotes.numberOfVotes;
        airlines[airlineAddress].registeringVotes.voters[voterAddress] = true;
        airlines[airlineAddress].registeringVotes.numberOfVotes = currentNumber.add(1);
    }

    /// @dev Build new single insurance for a flight
    /// @notice Can only be called from authorized contract
    /// @param airlineAddress Airline ethereum account used to call theis function
    /// @param flightKey Key for a flight to add insurance to
    /// @param ticketNumber Uniqe number for ticket owned produced by airline
    function buildFlightInsurance
    (
        address airlineAddress,
        bytes32 flightKey,
        uint ticketNumber
    )
        external
        requireCallerAuthorized()
    {
        bytes32 insuranceKey = getInsuranceKey(flightKey, ticketNumber);
        require(insurances[insuranceKey].state == InsuranceState.NotExist, "Ticket number for this flight allready built");

        insurances[insuranceKey] = Insurance({
            buyer: address(0),
            airline: airlineAddress,
            value: 0,
            ticketNumber: ticketNumber,
            state: InsuranceState.WaitingForBuyer
        });

        flightInsuranceKeys[flightKey].push(insuranceKey);
    }

    /// @dev Buy insurance for a flight
    /// @notice Can only be called from authorized contract
    /// @param buyer Pasnnger address used to buy insurance
    /// @param insuranceKey Insurance key to buy it
    function buyInsurance
    (
        address payable buyer,
        bytes32 insuranceKey
    )
        external
        payable
        requireCallerAuthorized()
    {
        require(insurances[insuranceKey].state == InsuranceState.WaitingForBuyer, "Insurance allredy bought, or expired");
        insurances[insuranceKey].value = msg.value;
        insurances[insuranceKey].buyer = buyer;
        insurances[insuranceKey].state = InsuranceState.Bought;

        passengerInsuranceKeys[buyer].push(insuranceKey);
    }

    /// @dev Credits payouts to insurees
    /// @notice Can only be called from authorized contract
    /// @param flightKey Flight key to update is insurnce
    /// @param creditRate Rate of credit for insuree out of 100 == 1
    function creditInsurees
    (
        bytes32 flightKey,
        uint8 creditRate
    )
        external
        requireCallerAuthorized()
    {
        bytes32[] storage _insurancesKeys = flightInsuranceKeys[flightKey];

        for (uint i = 0; i < _insurancesKeys.length; i++) {
            Insurance storage _insurance = insurances[_insurancesKeys[i]];

            if (_insurance.state == InsuranceState.Bought || _insurance.value > 0) {
                _insurance.value = _insurance.value.mul(creditRate).div(100);
                if (_insurance.value > 0)
                    _insurance.state = InsuranceState.Passed;
                else
                    _insurance.state = InsuranceState.Expired;
            } else {
                _insurance.state = InsuranceState.Expired;
            }
        }  
    }

    /// @dev Transfers eligible payout funds to insuree
    /// @notice Can only be called from authorized contract
    /// @param insuranceKey Insurance key to pay its buyer
    function payInsuree(bytes32 insuranceKey)
        external
        requireCallerAuthorized()
    {
        Insurance storage _insurance = insurances[insuranceKey];
        require(_insurance.state == InsuranceState.Passed, "no value to withdrow");
        require(address(this).balance > _insurance.value, "try again later");

        uint _value = _insurance.value;
        _insurance.value = 0;
        _insurance.state = InsuranceState.Expired;
        _insurance.buyer.transfer(_value);

    }

    /// @dev Initial funding for the insurance. 
    function fund(address funder)
        external
        payable
    {
        require(airlines[funder].state == AirlineRegisterationState.Registered, "Airline address not registered yet!");
        numberOfFundedAirlines = numberOfFundedAirlines.add(1);
        airlines[funder].state = AirlineRegisterationState.Funded;
    }

/* ---------------------------------------------------------------------------------------------- */



/* ============================================================================================== */
/*                                   PRIVATE CONTRACT FUNCTIONS                                   */
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
            isExist: true,
            name: name,
            state: state,
            failureRate: 0,
            registeringVotes: Votes(0),
            removingVotes: Votes(0),
            flightKeys: new bytes32[](0),
            numberOfInsurance: 0
        });
    }

    /// @dev Internally helper function to get flight key
    /// @notice This function is pure make sure to handle existing of airline and flight when using returned key
    /// @param airline Address of airline 
    /// @param flight The name of flight as string data type
    /// @param timestamp Depurture time of the flight as uint data type
    /// @return Key as static array of 32 bytes to make it uniqe
    function getFlightKey
    (
        address airline,
        string memory flight,
        uint256 timestamp
    )
        private
        pure 
        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /// @dev Internally helper function to get insurance key
    /// @notice This function is pure make sure to handle existing of airline, flight and insurance when using returned key
    /// @param flightKey Address of airline 
    /// @param ticketNumber Uniqe number for ticket owned by one passanger
    /// @return Key as static array of 32 bytes to make it uniqe
    function getInsuranceKey
    (
        bytes32 flightKey,
        uint ticketNumber

    )
        private
        pure 
        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(flightKey, ticketNumber));
    }

/* ---------------------------------------------------------------------------------------------- */

}
