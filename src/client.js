import algosdk from "algosdk";

const getNetworkCredentials = (network) => {
    // localhost
    let algod_token = process.env.VUE_APP_ALGOD_TOKEN;
    let algod_address = process.env.VUE_APP_ALGOD_SERVER;
    let algod_port = process.env.VUE_APP_ALGOD_PORT;

    let kmd_token = process.env.VUE_APP_KMD_TOKEN;
    let kmd_address = process.env.VUE_APP_KMD_SERVER;
    let kmd_port = process.env.VUE_APP_KMD_PORT;

    let indexer_token = process.env.VUE_APP_INDEXER_TOKEN;
    let indexer_address = process.env.VUE_APP_INDEXER_SERVER;
    let indexer_port = process.env.VUE_APP_INDEXER_PORT;

    switch (network) {
        case "TestNet":
            // is token json?
            try {  
                algod_token = JSON.parse(process.env.VUE_APP_ALGOD_TOKEN_TESTNET); 
            } catch (e) {
                algod_token = process.env.VUE_APP_ALGOD_TOKEN_TESTNET;
            }

            algod_address = process.env.VUE_APP_ALGOD_SERVER_TESTNET;
            algod_port = process.env.VUE_APP_ALGOD_SERVER_TESTNET;

            //no access to kmd for testnet
            break;
        default:
            break;
    }

    return {
        algod: {
            token: algod_token,
            address: algod_address,
            port: algod_port,
        },
        kmd: {
            token: kmd_token,
            address: kmd_address,
            port: kmd_port,
        },
        indexer: {
            token: indexer_token,
            address: indexer_address,
            port: indexer_port,
        }
    };
};

const getAlgodClient = (network) => {
    const { algod } = getNetworkCredentials(network);
    const algodClient = new algosdk.Algodv2(
        algod.token,
        algod.address,
        algod.port,
    );

    return algodClient;
};

const getKmdClient = (network) => {
    const { kmd } = getNetworkCredentials(network);
    const kmdClient = new algosdk.Kmd(
        kmd.token,
        kmd.address,
        kmd.port
    );

    return kmdClient;
};

const getIndexerClient = (network) => {
    const { indexer } = getNetworkCredentials(network);
    const indexerClient = new algosdk.Indexer(
        indexer.token,
        indexer.address,
        indexer.port
    );

    return indexerClient;
};

export {
    getAlgodClient,
    getKmdClient,
    getIndexerClient
};
