const { types } = require("@algo-builder/web");
const { assert, expect } = require("chai");
const { Runtime, AccountStore, ERRORS } = require("@algo-builder/runtime");
const algosdk = require("algosdk");
const { convert } = require("@algo-builder/algob");
const common = require("./commonFile");

const approvalFileMint = "mint_approval.py";
const clearStateFileMint = "mint_clearstate.py";

const approvalFileVesting = "vesting_approval.py";
const clearStateFileVesting = "vesting_clearstate.py";

describe("Success Flow", function () {
    
    let master;
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
        companyReserve = new AccountStore(1e9);
        runtime = new Runtime([master,team,advisors,privateInvestors,companyReserve]);
    });


    const initMint = () => {
        return common.initContract(
            runtime, 
            master.account, 
            approvalFileMint, 
            clearStateFileMint,
            0,
            0,
            1,
            1,
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

    const createdAsset = () => {
        const appID1 = appInfoMint.appID;

        //create asset
        const createAsset = ["createAsset"].map(convert.stringToBytes);
        runtime.executeTx({
            type: types.TransactionType.CallApp,
            sign: types.SignType.SecretKey,
            fromAccount: master.account,
            appID: appID1,
            payFlags: { totalFee: 1000 },
            appArgs: createAsset,
        });

        //get asset ID
        const getGlobal = (appID, key) => runtime.getGlobalState(appID, key);
        const assetID = Number(getGlobal(appID1, "Id"));

        return assetID;
    };


    
    it("Deploys mint contract successfully", () => {
        const appInfo = initMint();
        const appID = appInfo.appID;

        // verify app created
        assert.isDefined(appID);

        // verify app funded
        const appAccount = runtime.getAccount(appInfo.applicationAccount);
        assert.equal(appAccount.amount, 2e7);

    }).timeout(50000);


    it("Deploys vesting contract successfully", () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        
        console.log(team.account.addr);
        const appInfo = initVesting(ID);
        const appID = appInfo.appID;

        // verify app created
        assert.isDefined(appID);

        // verify app funded
        const appAccount = runtime.getAccount(appInfo.applicationAccount);
        assert.equal(appAccount.amount, 2e7);

    }).timeout(50000);


    it("vesting contract opts in successfully", () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        const appInfoVesting= initVesting(ID);

        // do opt in
        common.optInVesting(runtime, master.account, appInfoVesting.appID, ID);

    }).timeout(50000); 

    
    it("asset created successfully", () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        
        // verify assetID
        assert.isDefined(ID);

    }).timeout(50000);


    
    it("amount transferd to vesting successfully" , () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        const appInfoVesting = initVesting(ID);
        
        saveVestingAddr(runtime,
            master.account,
            appInfoMint.appID,
            appInfoVesting.applicationAccount);

        common.optInVesting(runtime, master.account, appInfoVesting.appID, ID);
        
        //do transfer
        common.transferAsset(runtime,master.account,appInfoMint.appID,appInfoVesting.applicationAccount,ID);

        const appAccount = runtime.getAccount(appInfoVesting.applicationAccount);
        
        //check amount transfered
        assert.equal(Number(appAccount.assets.get(ID).amount),75000000);

    }).timeout(50000); 

    

});
