pragma solidity 0.4.24;
import "../base/Module.sol";
import "../base/ModuleManager.sol";
import "../base/OwnerManager.sol";
import "../common/Enum.sol";
import "../common/DateTime.sol";

/// @title Recurring Transfer Module - Allows an owner...
/// @author Grant Wuerker - <gwuerker@gmail.com>
contract RecurringTransfersModule is Module {
    string public constant NAME = "Recurring Transfers Module";
    string public constant VERSION = "0.0.2";

    address public token;
    address public receiver;
    uint256 public amount;

    DateTime dateTime;
    uint private lastTransferTime;

    function setup()
        public
    {
        setManager();
        lastTransferTime = 0;
    }

    function isNextMonth() private view returns (bool) {
        if (dateTime.getYear(now) > dateTime.getYear(lastTransferTime)) {
            return true;
        } else if (dateTime.getMonth(now) > dateTime.getMonth(lastTransferTime)) {
            return true;
        }

        return false;
    }
}
