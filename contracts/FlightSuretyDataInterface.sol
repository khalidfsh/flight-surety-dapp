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
        Expired
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
        bool isExist;
        string name;
        AirlineRegisterationState state;
        uint8 failureRate;
        Votes registeringVotes;
        Votes removingVotes;
        bytes32[] flightKeys;
        uint numberOfInsurance;
    }

    /// Votes struct to save voters addresses
    struct Votes {
        uint numberOfVotes;
        mapping(address => bool) voters;
    }

    /// Insurance structure
    struct Insurance {
        address buyer;
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
    /// PUBLIC UTILITY FUNCTIONS
    function isOperational() external view returns(bool);
    function isAuthorized(address) external view returns(bool); 
    function getRegistrationType() external view returns(RegisterationType);

    /// CONTRACT UTILITY FUNCTIONS
    function isAirlineExist(address) external view returns(bool);
    function isVotedForRegisteringAirline(address, address) external view returns(bool);
    function isVotedForRemovingAirline(address, address) external view returns(bool);
    function getNumberOfRegisteredAirlines() external view returns(uint256);
    function getNumberOfActiveAirlines() external view returns(uint256);
    function getAirlineState(address) external view returns(AirlineRegisterationState);
    function getAirlineVotes(address) external view returns(uint256);
    function fetchAirlineData(address)
        external
        view
        returns(
            bool,
            string memory,
            AirlineRegisterationState,
            uint,
            uint,
            uint8,
            bytes32[] memory,
            uint
        );
    function fetchInsuranceData(bytes32)
        external
        view
        returns(
            address,
            address,
            uint,
            uint,
            InsuranceState
        );
    function fetchFlightInsurances(bytes32) external view returns(bytes32[] memory);
    function fetchPasengerInsurances(address) external view returns(bytes32[] memory);
    function setRegistrationType(RegisterationType) external;
    
    /// SMART CONTRACT FUNCTIONS
    function registerAirline(
        address, 
        string calldata, 
        AirlineRegisterationState
    ) external;
    function updateAirline
    (
        address,
        bool,
        string calldata,
        AirlineRegisterationState,
        uint8,
        bytes32[] calldata,
        uint
    ) external;
    function deleteAirline(address) external;
    function transferAirline(address, address) external;
    function addFlightKeyToAirline(address, bytes32) external;
    function setAirlineState(address, AirlineRegisterationState) external;
    function addAirlineVote(address, address) external;
    function buildFlightInsurance(address, bytes32, uint) external;
    function buyInsurance(address, bytes32) external payable;
    function creditInsurees(bytes32, uint8) external;
    function payInsuree(bytes32) external;
    function fund(address) external payable;

/* ---------------------------------------------------------------------------------------------- */

}
