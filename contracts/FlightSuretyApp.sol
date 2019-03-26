pragma solidity ^0.5.2;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
 
 import "./FlightSuretyDataInterface.sol";

contract FlightSuretyApp {
    using SafeMath for uint256;
    using SafeMath for uint8;

/* ============================================================================================== */
/*                                         DATA STRUCTURES                                        */
/* ============================================================================================== */
    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
    }
/* ---------------------------------------------------------------------------------------------- */



/* ============================================================================================== */
/*                                    DATA CONSTANTS&VARIABLES                                    */
/* ============================================================================================== */
    // Flight status codees
    // uint8 private constant STATUS_CODE_UNKNOWN = 0;
    // uint8 private constant STATUS_CODE_ON_TIME = 10;
    // uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    // uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    // uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    // uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    /// Constant of allowed number of airline to be registered BY_MEDIATION
    uint8 MEDIATION_REGISTERATION_LIMET;

    /// Constant of persantage of active airline most votes for a new registered airline
    uint8 PERSANTAGE_OF_VOTER;

    /// Account used to deploy contract
    address private contractOwner;

    /// 
    mapping(bytes32 => Flight) private flights;

    ///
    FlightSuretyDataInterface flightSuretyData;
/* ---------------------------------------------------------------------------------------------- */



/* ============================================================================================== */
/*                                  CONSTRUCTOR&FALLBACK FUNCTION                                 */
/* ============================================================================================== */

    /// @dev Constructor
    /// The deploying account becomes contractOwner
    constructor
    (
        address payable dataContractAddress,
        uint8 mediationLimt,
        uint8 persantageOfVoters
    ) 
        public
    {
        flightSuretyData = FlightSuretyDataInterface(dataContractAddress);
        contractOwner = msg.sender;
        MEDIATION_REGISTERATION_LIMET = mediationLimt;
        PERSANTAGE_OF_VOTER = persantageOfVoters;
    }
/* ---------------------------------------------------------------------------------------------- */


    event AirlineRegistered(address airlineAddress);

/* ============================================================================================== */
/*                                       FUNCTION MODIFIERS                                       */
/* ============================================================================================== */
    /// @dev Modifier that requires the "operational" boolean variable to be "true"
    /// This is used on all state changing functions to pause the contract in the event 
    modifier requireIsOperational() 
    {
         // Modify to call data contract's status
        require(isOperational(), "Data contract is currently not operational");  
        require(flightSuretyData.isAuthorized(address(this)), "This app contract is currently not authorized");  
        _;
    }

    /// @dev Modifier that requires the "ContractOwner" account to be the function caller
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /// @dev Modifier that checks if airline address not existing in data
    modifier requireNotExistAirline(address airlineAddress) {
        require(!flightSuretyData.isAirlineExist(airlineAddress), "Cannot register a registered airline address");
        _;
    }

    /// @dev Modifier that checks if airline address existing in data
    modifier requireExistAirline(address airlineAddress) {
        require(flightSuretyData.isAirlineExist(airlineAddress), "Airline address not existing");
        _;
    }

    /// @dev Modifier that checks if airline address has registered
    modifier requireIsAirlineRegistered(address airlineAddress) {
        require(isAirlineRegistered(airlineAddress), "Airline not registered");
        _;
    }

    /// @dev Modifier that checks if airline address waiting for votes
    modifier requireIsAirlineWaitingForVotes(address airlineAddress) {
        require(isAirlineWaitingForVotes(airlineAddress), "Airline not waiting for votes");
        _;
    }

    /// @dev Modifier that checks if airline address has funded
    modifier requireIsAirlineFunded(address airlineAddress) {
         require(isAirlineFunded(airlineAddress), "Airline not funded");
        _;
    }

/* ---------------------------------------------------------------------------------------------- */



/* ============================================================================================== */
/*                                        UTILITY FUNCTIONS                                       */
/* ============================================================================================== */
    /// @dev Get operating status of data contract
    /// @return A bool that is the current operating status of data contract
    function isOperational() 
        public 
        view 
        returns(bool) 
    {
        return flightSuretyData.isOperational();
    }

    /// @dev Check if airline is waiting for votes
    /// @param airlineAddress airline address to check
    /// @return A boolean if airline state is `WaitingForVotes`
    function isAirlineWaitingForVotes(address airlineAddress)
        public
        view
        returns(bool)
    {
        return(
            flightSuretyData.getAirlineState(airlineAddress)
            == FlightSuretyDataInterface.AirlineRegisterationState.WaitingForVotes
        );
    }

    /// @dev Check if airline is registered
    /// @param airlineAddress airline address to check
    /// @return A boolean if airline state is `Registered`
    function isAirlineRegistered(address airlineAddress)
        public
        view
        returns(bool)
    {
        return(
            flightSuretyData.getAirlineState(airlineAddress)
            == FlightSuretyDataInterface.AirlineRegisterationState.Registered
        );
    }

    /// @dev Check if airline has funded
    /// @param airlineAddress airline address to check
    /// @return A boolean if airline state is `Funded`
    function isAirlineFunded(address airlineAddress)
        public
        view
        returns(bool)
    {
        return(
            flightSuretyData.getAirlineState(airlineAddress)
            == FlightSuretyDataInterface.AirlineRegisterationState.Funded
        );
    }

/* ---------------------------------------------------------------------------------------------- */



/* ============================================================================================== */
/*                                    SMART CONTRACT FUNCTIONS                                    */
/* ============================================================================================== */
    /// @dev Add an airline to the registration queue
    function registerAirline
    (
        address airlineAddress,
        string calldata name
    )
        external
        requireIsOperational()
        requireNotExistAirline(airlineAddress)
    {
        if (flightSuretyData.getRegistrationType() == FlightSuretyDataInterface.RegisterationType.BY_MEDIATION) {
            require(isAirlineFunded(msg.sender), "Airline should be funded to add new airline");
            flightSuretyData.registerAirline(
                airlineAddress,
                name,
                FlightSuretyDataInterface.AirlineRegisterationState.Registered
            );
            
            if (flightSuretyData.getNumberOfRegisteredAirlines() == MEDIATION_REGISTERATION_LIMET)
                flightSuretyData.setRegistrationType(
                    FlightSuretyDataInterface.RegisterationType.BY_VOTERS
                );
        }
        else {
            require(msg.sender == airlineAddress, "Only the owner of registring account can register himself");
            flightSuretyData.registerAirline(
                airlineAddress,
                name,
                FlightSuretyDataInterface.AirlineRegisterationState.WaitingForVotes
            );
        }
        emit AirlineRegistered(airlineAddress);
    }

    function fundMyAirline()
        external
        payable
        requireIsOperational()
        requireExistAirline(msg.sender)
        requireIsAirlineRegistered(msg.sender)
    {
        require(msg.value >= 10 ether, "Funding must be 10 Ether");

        (bool success, ) = address(flightSuretyData).call.value(10 ether)(abi.encodeWithSignature("empty()"));
        require(success, "somthing went rong, try again");

        //emit
    }

    function voteForAirline(address airlineAddress)
        external
        requireIsOperational
        requireExistAirline(airlineAddress)
        requireExistAirline(msg.sender)
        requireIsAirlineWaitingForVotes(airlineAddress)
        requireIsAirlineFunded(msg.sender)
    {
        flightSuretyData.addAirlineVote(airlineAddress);

        //check if airline passes consensus voters
        uint oddGarde = flightSuretyData.getNumberOfActiveAirlines().mod(2);
        uint consensusLimtNumber = flightSuretyData.getNumberOfActiveAirlines().mul(PERSANTAGE_OF_VOTER).div(100).add(oddGarde);

        if ((flightSuretyData.getAirlineVotes(airlineAddress)) >= consensusLimtNumber) {
            flightSuretyData.setAirlineState(
                airlineAddress,
                FlightSuretyDataInterface.AirlineRegisterationState.Registered
            );
        }
        ///emit
    }

    /// @dev Register a future flight for insuring.
    function registerFlight()
        external
        pure
    {

    }
    
    /// @dev Called after oracle has updated flight status 
    function processFlightStatus
    (
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    )
        internal
        pure
    {
    }


    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
    (
        address airline,
        string calldata flight,
        uint256 timestamp                            
    )
        external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
            requester: msg.sender,
            isOpen: true
        });

        emit OracleRequest(index, airline, flight, timestamp);
    }
/* ---------------------------------------------------------------------------------------------- */



/* ============================================================================================== */
/*                                        ORACLE MANAGEMENT                                       */
/* ============================================================================================== */
    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);


    // Register an oracle with the contract
    function registerOracle()
        external
        payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
            isRegistered: true,
            indexes: indexes
        });
    }

    function getMyIndexes()
        view
        external
        returns(uint8[3] memory)
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }




    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
    (
        uint8 index,
        address airline,
        string calldata flight,
        uint256 timestamp,
        uint8 statusCode
    )
        external
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
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

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
        (                       
            address account         
        )
        internal
        returns(uint8[3] memory)
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
    (
        address account
    )
        internal
        returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(
            uint256(
                keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))
            ) % maxValue
        );

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }
/* ---------------------------------------------------------------------------------------------- */

}   
