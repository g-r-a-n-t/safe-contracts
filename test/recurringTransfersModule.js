const utils = require('./utils')

const RecurringTransfersModule = artifacts.require("./modules/RecurringTransfersModule.sol")
const DateTime = artifacts.require("./common/DateTime.sol")

contract('RecurringTransfersModule', function() {

    let recurringTransfersModule;
    let dateTime;

    beforeEach(async function() {
        recurringTransfersModule = await RecurringTransfersModule.new()
        recurringTransfersModule.setup();
        dateTime = await DateTime.new()
    });

    it('test', async () => {
        //await utils.assertRejects(
        //    recurringTransfersModule.isNextMonth(),
        //    "should fail"
        //);

        let result = await recurringTransfersModule.isNextMonth();
        console.log(result);

        let result2 = await dateTime.getYear(0);
        console.log(result2);

        let result3 = await recurringTransfersModule.returnOne();
        console.log(result3.toNumber());
    });
});
