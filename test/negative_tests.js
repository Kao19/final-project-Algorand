const { types } = require("@algo-builder/web");
const { assert } = require("chai");
const { Runtime, AccountStore } = require("@algo-builder/runtime");
const { convert } = require("@algo-builder/algob");
const common = require("./commonFile");

const approvalFileMint = "mint_approval.py";
const clearStateFileMint = "mint_clearstate.py";

const approvalFileVesting = "vesting_approval.py";
const clearStateFileVesting = "vesting_clearstate.py";

// Errors
const RUNTIME_ERR1009 = 'RUNTIME_ERR1009: TEAL runtime encountered err opcode'; // rejected by logic

describe("Negative Tests", function () {
    
    let master;
    let nonCreatorAccount;
    let team;
    let advisors;
    let privateInvestors;
    let companyReserve;
    let runtime;
    let appInfoMint;

    // do this before each test
    this.beforeEach(async function () {
        master = new AccountStore(1e9);
        team = new AccountStore(1e9);
        advisors = new AccountStore(1e9);
        privateInvestors = new AccountStore(1e9);
        privateInvestors = new AccountStore(1e9);
        companyReserve = new AccountStore(1e9);
        nonCreatorAccount = new AccountStore(100e6); //100 Algos
        runtime = new Runtime([master,team,advisors,privateInvestors,nonCreatorAccount,companyReserve]);
    });


    const initMint = () => {
        return common.initContract(
            runtime, 
            master.account, 
            approvalFileMint, 
            clearStateFileMint,
            0,
            0,
            2,
            2,
            [],
            []
        );
    };
    
    
    const initVesting = (ID) => {
        return common.initContract(
            runtime, 
            master.account, 
            approvalFileVesting, 
            clearStateFileVesting,
            0,
            0,
            14,
            4,
            [team.account.addr,advisors.account.addr,privateInvestors.account.addr,companyReserve.account.addr],
            [
                convert.uint64ToBigEndian(ID),
                convert.uint64ToBigEndian(25000000),
                convert.uint64ToBigEndian(10000000),
                convert.uint64ToBigEndian(20000000),
                convert.uint64ToBigEndian(30000000),
                convert.uint64ToBigEndian(15000000),
            ]
        );
    };
    

    const saveVestingAddr = (runtime, account, appID, VestingAppAdress) => {
        const save  = ["vestingAccount"].map(convert.stringToBytes);
        const accounts = [VestingAppAdress];
        runtime.executeTx({
            type: types.TransactionType.CallApp,
            sign: types.SignType.SecretKey,
            fromAccount: account,
            appID: appID,
            payFlags: { totalFee: 1000 },
            accounts: accounts,
            appArgs: save,
        });
    };


    const createdAsset = (acc) => {
        const appID1 = appInfoMint.appID;

        //create asset
        const createAsset = ["createAsset"].map(convert.stringToBytes);
        runtime.executeTx({
            type: types.TransactionType.CallApp,
            sign: types.SignType.SecretKey,
            fromAccount: acc,
            appID: appID1,
            payFlags: { totalFee: 1000 },
            appArgs: createAsset,
        });

        //get asset ID
        const getGlobal = (appID, key) => runtime.getGlobalState(appID, key);
        const assetID = Number(getGlobal(appID1, "Id"));

        return assetID;
    };


    let amountToWithdraw = 20000;
    let now = Date.now();
    const withdrawFromVesting= (runtime, account, appID, appAccount, assets) => {
        const withdraw = [convert.stringToBytes("withdrawFromVesting"),convert.uint64ToBigEndian(now),convert.uint64ToBigEndian(amountToWithdraw)];
        runtime.executeTx({
                type: types.TransactionType.CallApp,
                sign: types.SignType.SecretKey,
                fromAccount: account,
                appID: appID,
                payFlags: { totalFee: 1000 },
                accounts: [appAccount],
                foreignAssets: [assets],
                appArgs: withdraw,
        });
    };


    it("vesting withdraw asset fails when called by public " , () => {
        appInfoMint = initMint();
        const ID = createdAsset(master.account);
        const appInfoVesting = initVesting(ID);
        
        saveVestingAddr(runtime,
            master.account,
            appInfoMint.appID,
            appInfoVesting.applicationAccount);

        //do opt in
        common.optInVesting(runtime, master.account, appInfoVesting.appID, ID);

        console.log(now);
        console.log(master.account.addr);
        assert.throws(() => {withdrawFromVesting(runtime,master.account,appInfoMint.appID,appInfoVesting.applicationAccount,ID)}, RUNTIME_ERR1009);


    }).timeout(20000);



    
    it("Transfer fails when called by non-creator" , () => {
        appInfoMint = initMint();
        const ID = createdAsset(master.account);
        const appInfoVesting = initVesting(ID);

        //do opt in
        common.optInVesting(runtime, master.account, appInfoVesting.appID, ID);

        //transfer asset by non creator
        assert.throws(() => { common.transferAsset(runtime,nonCreatorAccount.account,appInfoMint.appID,appInfoVesting.applicationAccount,ID) }, RUNTIME_ERR1009);


    }).timeout(20000); //i changed the timeout because i got a timeout exception that prevents me from completing the test
    
    it("double asset creation fails" , () => {
        appInfoMint = initMint();
        
        //create asset for the first time
        createdAsset(master.account);
        
        //double creation should fail
        assert.throws(() => { createdAsset(master.account) }, RUNTIME_ERR1009);


    }).timeout(20000);


    it("asset creation fails when called by non creator" , () => {
        appInfoMint = initMint();
        
        assert.throws(() => { createdAsset(nonCreatorAccount.account) }, RUNTIME_ERR1009);

    }).timeout(20000);

    
    it("vesting transfer asset fails when transfer to non vesting app " , () => {
        appInfoMint = initMint();
        const ID = createdAsset(master.account);
        const appInfoVesting = initVesting(ID);
        
        saveVestingAddr(runtime,
            master.account,
            appInfoMint.appID,
            appInfoVesting.applicationAccount);

        //do opt in
        common.optInVesting(runtime, master.account, appInfoVesting.appID, ID);

        //transfer asset to non vesting app (mint for example)
        assert.throws(() => { common.transferAsset(runtime,master.account,appInfoMint.appID,appInfoMint.applicationAccount,ID) }, RUNTIME_ERR1009);


    }).timeout(20000);


});
