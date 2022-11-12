const getExplorerURL = (txId, network) => {
    switch (network) {
        case "TestNet":
            return "https://testnet.algoexplorer.io/tx/" + txId;
        default:
            return "http://localhost:8980/v2/transactions/" + txId + "?pretty";
    }
}

export {
    getExplorerURL
};
