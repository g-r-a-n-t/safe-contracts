pragma solidity 0.4.24;
import "../base/Module.sol";
import "../base/ModuleManager.sol";
import "../base/OwnerManager.sol";
import "../common/DateTime.sol";
import "../common/Enum.sol";

import "@gnosis.pm/dx-contracts/contracts/DutchExchange.sol";
import "@gnosis.pm/dx-contracts/contracts/Oracle/PriceOracleInterface.sol";

/// @title Recurring Transfer Module - Allows an owner...
/// @author Grant Wuerker - <gwuerker@gmail.com>
contract RecurringTransfersModule is Module {
    string public constant NAME = "Recurring Transfers Module";
    string public constant VERSION = "0.0.2";

    DateTime public dateTime;
    DutchExchange public dutchExchange;

    // recurringTransfers maps the composite hash of a token and account address to a recurring transfer struct.
    mapping (address => RecurringTransfer) public recurringTransfers;

    struct RecurringTransfer {
        address token;
        uint256 amount;
        address fiat;

        uint8 transferDay;
        uint8 transferHourStart;
        uint8 transferHourEnd;

        uint lastTransferTime;
    }

    function setup(address _dutchExchange)
        public
    {
        require(address(_dutchExchange) != address(0));
        dutchExchange = DutchExchange(_dutchExchange);
        dateTime = new DateTime();
        setManager();
    }

    function addRecurringTransfer(
        address receiver,
        address token,
        uint256 amount,
        address fiat,
        uint8 transferDay,
        uint8 transferHourStart,
        uint8 transferHourEnd
    )
        public
    {
        require(OwnerManager(manager).isOwner(msg.sender), "Method can only be called by an owner");
        recurringTransfers[receiver] = RecurringTransfer(token, amount, fiat, transferDay, transferHourStart, transferHourEnd, 0);
    }

    function executeRecurringTransfer(address receiver)
        public
    {
        require(OwnerManager(manager).isOwner(msg.sender), "Method can only be called by an owner");
        RecurringTransfer memory recurringTransfer = recurringTransfers[receiver];
        require(isNextMonth(recurringTransfer.lastTransferTime), "Transfer has already been executed this month");
        require(isOnDayAndBetweenHours(recurringTransfer.transferDay, recurringTransfer.transferHourStart, recurringTransfer.transferHourEnd), "Transfer request not within window");

        if (recurringTransfer.token == 0) {
            require(manager.execTransactionFromModule(receiver, recurringTransfer.amount, "", Enum.Operation.Call), "Could not execute ether transfer");
        } else {
            bytes memory data = abi.encodeWithSignature("transfer(address,uint256)", receiver, recurringTransfer.amount);
            require(manager.execTransactionFromModule(recurringTransfer.token, 0, data, Enum.Operation.Call), "Could not execute token transfer");
        }

        recurringTransfers[receiver].lastTransferTime = now;
    }

    function isOnDayAndBetweenHours(uint8 day, uint8 hourStart, uint hourEnd)
        public view returns (bool)
    {
        return dateTime.getDay(now) == day &&
        dateTime.getHour(now) > hourStart &&
        dateTime.getHour(now) < hourEnd;
    }

    function isNextMonth(uint previousTime)
        public view returns (bool)
    {
        return dateTime.getYear(now) > dateTime.getYear(previousTime) ||
        dateTime.getMonth(now) > dateTime.getMonth(previousTime);
    }

    function getUSDETHPrice()
        public view returns (uint256)
    {
        PriceOracleInterface priceOracle = PriceOracleInterface(dutchExchange.ethUSDOracle());
        return priceOracle.getUSDETHPrice();
    }
}
