pragma solidity 0.4.24;
import "../base/Module.sol";
import "../base/ModuleManager.sol";
import "../base/OwnerManager.sol";
import "../common/DateTime.sol";
import "../common/Enum.sol";

/// @title Recurring Transfer Module - Allows an owner...
/// @author Grant Wuerker - <gwuerker@gmail.com>
contract RecurringTransfersModule is Module {
    string public constant NAME = "Recurring Transfers Module";
    string public constant VERSION = "0.0.2";

    DateTime dateTime;

    // recurringTransfers maps a token and account address to a recurring transfer settings.
    mapping ((address, address) => RecurringTransfer) public recurringTransfers;

    struct RecurringTransfer {
        address fiat;
        uint256 amount;
        uint lastTransferTime;
    }

    function setup()
        public
    {
        setManager();
        dateTime = new DateTime();
    }

    function executeRecurringTransfer(address token, address receiver)
        public
    {
        require(OwnerManager(manager).isOwner(msg.sender), "Method can only be called by an owner");

        RecurringTransfer recurringTransfer = reccuringTransfers[(token, receiver)];
        require(isNextMonth(recurringTransfer), "Transfer has already been executed this month")

        if (token == 0) {
            require(manager.execTransactionFromModule(to, amount, "", Enum.Operation.Call), "Could not execute ether transfer");
        } else {
            bytes memory data = abi.encodeWithSignature("transfer(address,uint256)", to, amount);
            require(manager.execTransactionFromModule(token, 0, data, Enum.Operation.Call), "Could not execute token transfer");
        }

        recurringTransfer.lastTransferTime = now;
    }

    function isNextMonth(RecurringTransfer recurringTransfer)
        public view returns (bool)
    {
        if (dateTime.getYear(now) > dateTime.getYear(reccuringTransfer.lastTransferTime) {
            return true;
        } else if (dateTime.getMonth(now) > dateTime.getMonth(recurringTransfer.lastTransferTime)) {
            return true;
        }

        return false;
    }
}
