pragma solidity ^0.5.2;

interface FlightSuretyDataInterface {

/* ============================================================================================== */
/*                                        DATA ENUMARTIONS                                        */
/* ============================================================================================== */
    /// Contract Registeration type
    /// `BY_MEDIATION` when registered airline want to add another one
    /// `BY_VOTERS` when multi party registered airline votes for airline to be registered
    enum RegisterationType {
        BY_MEDIATION,
        BY_VOTERS
    }

    /// Airline registeration processing states 
    enum AirlineRegisterationState {
        WaitingForVotes,
        Registered,
        Funded
    }

    /// Insurance states
    enum InsuranceState {
        NotExist,
        WaitingForBuyer,
        Bought,
        Passed,
        Failed
    }

    /// Flight status codees
    // enum FlightStatus {
    //     UNKNOWN,        // 0
    //     ON_TIME,        // 1
    //     LATE_AIRLINE,   // 2
    //     LATE_WEATHER,   // 3
    //     LATE_TECHNICAL, // 4
    //     LATE_OTHER      // 5
    // }

/* ---------------------------------------------------------------------------------------------- */


/* ============================================================================================== */
/*                                         DATA STRUCTURES                                        */
/* ============================================================================================== */
    /// Airline data strudtures to be saved in data mapping
    struct Airline {
        string name;
        AirlineRegisterationState state;
        uint8 failureRate;
        bool isExist;
        Votes registeringVotes;
        Votes removingVotes;
        bytes32[] flightKeys;
    }

    /// Votes struct to save voters addresses
    struct Votes {
        uint numberOfVotes;
        mapping(address => bool) voters;
    }

    /// Insurance structure
    struct Insurance {
        address payable buyer;
        address airline;
        uint value;
        uint ticketNumber;
        InsuranceState state;
    }

    // /// Flight data structure to be saved in data mapping 
    // struct Flight {
    //     bool isRegistered;
    //     FlightStatus status;
    //     uint256 updatedTimestamp;        
    //     address airline;
    // }

/* ---------------------------------------------------------------------------------------------- */



/* ============================================================================================== */
/*                                        ABSTRACT FUNCTIONS                                      */
/* ============================================================================================== */
    function isOperational() external view returns(bool);
    function isAuthorized(address) external view returns(bool); 
    function getRegistrationType() external view returns(RegisterationType);
    function setRegistrationType(RegisterationType) external;

    function isAirlineExist(address) external view returns(bool);
    function isVotedForRegisteringAirline(address, address) external view returns(bool);
    function isVotedForRemovingAirline(address, address) external view returns(bool);

    function getNumberOfRegisteredAirlines() external view returns(uint256);
    function getNumberOfActiveAirlines() external view returns(uint256);
    function getAirline(address)
        external
        view
        returns(
            string memory,
            AirlineRegisterationState,
            uint,
            uint8,
            bool,
            bytes32[] memory
        );
    function getAirlineState(address) external view returns(AirlineRegisterationState);
    function getAirlineVotes(address) external view returns(uint256);
    
    function registerAirline(
        address, 
        string calldata, 
        AirlineRegisterationState
    ) external;
    function setAirlineState(
        address,
        AirlineRegisterationState
    ) external;
    function addAirlineVote(address) external;
    function updateAirlineFailureRate(address, uint8) external;

    function buildFlightInsurence(address, bytes32, uint) external;
    function getInsuranceState(bytes32, uint) external view returns(InsuranceState);
    function buy(address payable, bytes32) external payable;
    function creditInsurees() external pure;
    function pay() external pure;
    function fund() external payable;

/* ---------------------------------------------------------------------------------------------- */

}
