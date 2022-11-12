const { executeTransaction, convert, readAppGlobalState } = require("@algo-builder/algob");
const { types } = require("@algo-builder/web");

async function run(runtimeEnv, deployer) {
    // write your code here
    const master = deployer.accountsByName.get("master");
    const team_address = deployer.accountsByName.get("acc2");
    const advisors_address = deployer.accountsByName.get("acc3");
    const private_investor_address = deployer.accountsByName.get("acc4");
    const company_reserve = deployer.accountsByName.get("acc1");
    
    const approvalFileMint = "mint_approval.py";
    const clearStateFileMint = "mint_clearstate.py";

    const approvalFileVesting = "vesting_approval.py";
    const clearStateFileVesting = "vesting_clearstate.py";


    //deploying the mint contract
    await deployer.deployApp(
        approvalFileMint,
        clearStateFileMint,
        {
            sender: master,
            localInts: 0,
            localBytes: 0,
            globalInts: 1,
            globalBytes: 1,
        },
        { totalFee: 1000 }
    );

    // get app info
    const appMint = deployer.getApp(approvalFileMint, clearStateFileMint);

    // fund contract with some algos to handle inner txn
    await executeTransaction(deployer, {
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        toAccountAddr: appMint.applicationAccount,
        amountMicroAlgos: 2e7, //20 algos
        payFlags: { totalFee: 1000 },
    });

    //application call to create the asset
    const createAsset = ["createAsset"].map(convert.stringToBytes);
    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: appMint.appID,
        payFlags: { totalFee: 1000 },
        appArgs: createAsset,
    });


    // get the global state
    let globalState = await readAppGlobalState(deployer, master.addr, appMint.appID);
    const assetID = globalState.get("Id");

    console.log(assetID);

    deployer.addCheckpointKV("assetID", assetID);


    // deploying the vesting contract 
    await deployer.deployApp(
        approvalFileVesting,
        clearStateFileVesting,
        {
            sender: master,
            localInts: 0,
            localBytes: 0,
            globalInts: 14,
            globalBytes: 4,
            accounts: [
                team_address.addr,
                advisors_address.addr,
                private_investor_address.addr,
                company_reserve.addr
            ],
            appArgs: [
                convert.uint64ToBigEndian(assetID),
                convert.uint64ToBigEndian(10000000),
                convert.uint64ToBigEndian(20000000),
                convert.uint64ToBigEndian(30000000),
                convert.uint64ToBigEndian(15000000),
            ],
        },
        { totalFee: 1000 }
    );
            
    // get app info
    const appVesting = deployer.getApp(approvalFileVesting, clearStateFileVesting);

    deployer.addCheckpointKV("VestingAppAddress", appVesting.applicationAccount);
    deployer.addCheckpointKV("VestingAppId", appVesting.appID);
    deployer.addCheckpointKV("VestingTimeStamp", appVesting.timestamp);
    

    const acc  = ["vestingAccount"].map(convert.stringToBytes);
    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: appMint.appID,
        payFlags: { totalFee: 1000 },
        accounts: [appVesting.applicationAccount],
        appArgs: acc,
    });


    // transfer algos to vesting contract 
    await executeTransaction(deployer, {
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        toAccountAddr: appVesting.applicationAccount,
        amountMicroAlgos: 2e7, //20 algos
        payFlags: { totalFee: 1000 },
    });


    // application call to optin to the asset
    const optinAsset = ["optin"].map(convert.stringToBytes);
    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: appVesting.appID,
        payFlags: { totalFee: 1000 },
        foreignAssets: [assetID],
        appArgs: optinAsset,
    });


    //transfer tokens to vesting contracts
    const transfer = [convert.stringToBytes("transferVesting")];
    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: appMint.appID,
        payFlags: { totalFee: 1000 },
        accounts: [deployer.getCheckpointKV("VestingAppAddress")],
        foreignAssets: [assetID],
        appArgs: transfer,
    });

}

module.exports = { default: run };
