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
        uint numberOfVotes;
        uint8 failureRate;
        bool isExist;
        bytes32[] flightKeys;
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

    function buy() external payable;
    function creditInsurees() external pure;
    function pay() external pure;
    function fund() external payable;

/* ---------------------------------------------------------------------------------------------- */

}
