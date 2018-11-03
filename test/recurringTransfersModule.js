const utils = require('./utils')

const RecurringTransfersModule = artifacts.require("./modules/RecurringTransfersModule.sol")
const ProxyFactory = artifacts.require("./ProxyFactory.sol")
const CreateAndAddModules = artifacts.require("./libraries/CreateAndAddModules.sol")
const GnosisSafe = artifacts.require("./GnosisSafe.sol")

contract('RecurringTransfersModule', function(accounts) {

    let gnosisSafe
    let recurringTransfersModule

    beforeEach(async function() {
        // Create lightwallet
        lw = await utils.createLightwallet()

        // Create Master Copies
        let proxyFactory = await ProxyFactory.new()
        let createAndAddModules = await CreateAndAddModules.new()
        let gnosisSafeMasterCopy = await GnosisSafe.new()

        // Initialize safe master copy
        gnosisSafeMasterCopy.setup([accounts[0]], 1, 0, "0x")
        let recurringTransfersModuleMasterCopy = await RecurringTransfersModule.new()

        // Initialize module master copy
        recurringTransfersModuleMasterCopy.setup()

        // Create Gnosis Safe and Recurring Transfer Module in one transactions
        let moduleData = await recurringTransfersModuleMasterCopy.contract.setup.getData()
        let proxyFactoryData = await proxyFactory.contract.createProxy.getData(recurringTransfersModuleMasterCopy.address, moduleData)
        let modulesCreationData = utils.createAndAddModulesData([proxyFactoryData])
        let createAndAddModulesData = createAndAddModules.contract.createAndAddModules.getData(proxyFactory.address, modulesCreationData)
        let gnosisSafeData = await gnosisSafeMasterCopy.contract.setup.getData([lw.accounts[0], lw.accounts[1], accounts[0]], 2, createAndAddModules.address, createAndAddModulesData)
        gnosisSafe = utils.getParamFromTxEvent(
            await proxyFactory.createProxy(gnosisSafeMasterCopy.address, gnosisSafeData),
            'ProxyCreation', 'proxy', proxyFactory.address, GnosisSafe, 'create Gnosis Safe and Recurring Transfer Module',
        )
        let modules = await gnosisSafe.getModules()
        recurringTransfersModule = RecurringTransfersModule.at(modules[0])
        assert.equal(await recurringTransfersModule.manager.call(), gnosisSafe.address)
    })

    it('test', async () => {
        await utils.assertRejects(
            recurringTransfersModule.isNextMonth(0),
            "should fail"
        );
    });
});
