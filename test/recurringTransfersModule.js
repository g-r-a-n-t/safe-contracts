const utils = require('./utils')

const RecurringTransfersModule = artifacts.require("./modules/RecurringTransfersModule.sol")
const ProxyFactory = artifacts.require("./ProxyFactory.sol")
const CreateAndAddModules = artifacts.require("./libraries/CreateAndAddModules.sol")
const GnosisSafe = artifacts.require("./GnosisSafe.sol")

const SECONDS_IN_DAY = 86400
const SECONDS_IN_MONTH = SECONDS_IN_DAY * 31

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

        // Create Gnosis Safe and Recurring Transfer Module in one transaction
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

    it('transfer window unit tests', async () => {
        assert.isTrue(
            await recurringTransfersModule.isNextMonth(0),
            "has been a month since time 0"
        )

        assert.isTrue(
            await recurringTransfersModule.isNextMonth(utils.currentBlockTime() - SECONDS_IN_MONTH),
            "has been a month since current time minus one month"
        )

        assert.isFalse(
            await recurringTransfersModule.isNextMonth(utils.currentBlockTime()),
            "has not been a month since current time"
        )
    })

    it('should transfer 1 eth', async () => {
        const currentDate = new Date(utils.currentBlockTime() * 1000)
        const currentDay = currentDate.getDate() - 1
        const currentHour = currentDate.getUTCHours()

        const owner = accounts[0]
        const receiver = accounts[1]
        const transferAmount = parseInt(web3.toWei(1, 'ether'))

        await web3.eth.sendTransaction({from: owner, to: gnosisSafe.address, value: transferAmount * 2})
        const safeStartBalance = web3.eth.getBalance(gnosisSafe.address).toNumber()
        const receiverStartBalance = web3.eth.getBalance(receiver).toNumber()

        utils.logGasUsage(
            "add new recurring transfer",
            await recurringTransfersModule.addRecurringTransfer(
                receiver, 0, transferAmount, 0, currentDay, currentHour - 1, currentHour + 1, {from: owner}
            )
        )

        utils.logGasUsage(
            "execute 1st recurring transfer",
            await recurringTransfersModule.executeRecurringTransfer(receiver, {from: owner})
        )

        const safeEndBalance = web3.eth.getBalance(gnosisSafe.address).toNumber()
        const receiverEndBalance = web3.eth.getBalance(receiver).toNumber()

        assert.equal(safeStartBalance - transferAmount, safeEndBalance)
        assert.equal(receiverStartBalance + transferAmount, receiverEndBalance)
    })

    it('should fail when transfering twice in one month', async () => {
        const currentDate = new Date(utils.currentBlockTime() * 1000)
        const currentDay = currentDate.getDate() - 1
        const currentHour = currentDate.getUTCHours()

        const owner = accounts[0]
        const receiver = accounts[1]
        const transferAmount = parseInt(web3.toWei(1, 'ether'))

        await web3.eth.sendTransaction({from: owner, to: gnosisSafe.address, value: transferAmount * 2})
        const safeStartBalance = web3.eth.getBalance(gnosisSafe.address).toNumber()
        const receiverStartBalance = web3.eth.getBalance(receiver).toNumber()

        utils.logGasUsage(
            "add new recurring transfer",
            await recurringTransfersModule.addRecurringTransfer(
                receiver, 0, transferAmount, 0, currentDay, currentHour - 1, currentHour + 1, {from: owner}
            )
        )

        utils.logGasUsage(
            "execute 1st recurring transfer",
            await recurringTransfersModule.executeRecurringTransfer(receiver, {from: owner})
        )

        await utils.assertRejects(
            recurringTransfersModule.executeRecurringTransfer(receiver, {from: owner}),
            "executing 2nd recurring transfer fails"
        )

        const safeEndBalance = web3.eth.getBalance(gnosisSafe.address).toNumber()
        const receiverEndBalance = web3.eth.getBalance(receiver).toNumber()

        assert.equal(safeStartBalance - transferAmount, safeEndBalance)
        assert.equal(receiverStartBalance + transferAmount, receiverEndBalance)
    })


    it('should transfer when waiting one month', async () => {
        const currentDate = new Date(utils.currentBlockTime() * 1000)
        const currentDay = currentDate.getDate() - 1
        const currentHour = currentDate.getUTCHours()

        const owner = accounts[0]
        const receiver = accounts[1]
        const transferAmount = parseInt(web3.toWei(1, 'ether'))

        await web3.eth.sendTransaction({from: owner, to: gnosisSafe.address, value: transferAmount * 2})
        const safeStartBalance = web3.eth.getBalance(gnosisSafe.address).toNumber()
        const receiverStartBalance = web3.eth.getBalance(receiver).toNumber()

        utils.logGasUsage(
            "add new recurring transfer",
            await recurringTransfersModule.addRecurringTransfer(
                receiver, 0, transferAmount, 0, currentDay, currentHour - 1, currentHour + 1, {from: owner}
            )
        )

        utils.logGasUsage(
            "execute 1st recurring transfer",
            await recurringTransfersModule.executeRecurringTransfer(receiver, {from: owner})
        )

        await utils.fastForwardBlockTime(SECONDS_IN_MONTH)

        utils.logGasUsage(
            "executing 2nd recurring transfer fails",
            await recurringTransfersModule.executeRecurringTransfer(receiver, {from: owner})
        )

        const safeEndBalance = web3.eth.getBalance(gnosisSafe.address).toNumber()
        const receiverEndBalance = web3.eth.getBalance(receiver).toNumber()

        assert.equal(safeStartBalance - transferAmount * 2, safeEndBalance)
        assert.equal(receiverStartBalance + transferAmount * 2, receiverEndBalance)
    })
})
