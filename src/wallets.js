import algosdk from "algosdk";
import { formatJsonRpcRequest } from "@json-rpc-tools/utils";
import MyAlgoConnect from "@randlabs/myalgo-connect";

// Contains a list of methods to send transactions via different wallet connectors

const sendAlgoSignerGTransaction = async (txns, algodClient) => {
    const AlgoSigner = window.AlgoSigner;

    if (typeof AlgoSigner !== "undefined") {
        try {
            // Get the binary and base64 encode it
            let binaryTxs = [txns[0].toByte(), txns[1].toByte()]; //since we have 3 transactions in the atomic transfer
            let base64Txs = binaryTxs.map((binary) => AlgoSigner.encoding.msgpackToBase64(binary));

            let signedTxs = await AlgoSigner.signTxn([
                {
                    txn: base64Txs[0],
                },
                {
                    txn: base64Txs[1],
                },
            ]);

            // Get the base64 encoded signed transaction and convert it to binary
            let binarySignedTxs = signedTxs.map((tx) => AlgoSigner.encoding.base64ToMsgpack(
                tx.blob
            ));

            const response = await algodClient
                .sendRawTransaction(binarySignedTxs)
                .do();
            console.log(response);

            return response;
        } catch (err) {
            console.error(err);
        }
    }
};


const sendAlgoSignerTransaction = async (txn, algodClient) => {
    const AlgoSigner = window.AlgoSigner;

    if (typeof AlgoSigner !== "undefined") {
        try {
            // Get the binary and base64 encode it
            let binaryTx = txn.toByte();
            let base64Tx = AlgoSigner.encoding.msgpackToBase64(binaryTx);

            let signedTxs = await AlgoSigner.signTxn([
                {
                    txn: base64Tx,
                },
            ]);

            // Get the base64 encoded signed transaction and convert it to binary
            let binarySignedTx = AlgoSigner.encoding.base64ToMsgpack(signedTxs[0].blob);

            const response = await algodClient.sendRawTransaction(binarySignedTx).do();
            console.log(response);

            return response;
        } catch (err) {
            console.error(err);
        }
    }
};


const sendWalletConnectTransaction = async (connector, txn, algodClient) => {
    try {
        // Sign transaction
        // txns is an array of algosdk.Transaction like below
        // i.e txns = [txn, ...someotherTxns], but we've only built one transaction in our case
        const txns = [txn];
        const txnsToSign = txns.map((txn) => {
            const encodedTxn = Buffer.from(
                algosdk.encodeUnsignedTransaction(txn)
            ).toString("base64");

            return {
                txn: encodedTxn,
                message: "Description of transaction being signed",
                // Note: if the transaction does not need to be signed (because it's part of an atomic group
                // that will be signed by another party), specify an empty singers array like so:
                // signers: [],
            };
        });

        const requestParams = [txnsToSign];

        const request = formatJsonRpcRequest("algo_signTxn", requestParams);
        const result = await connector.sendCustomRequest(request);
        const decodedResult = result.map((element) => {
            return element
                ? new Uint8Array(Buffer.from(element, "base64"))
                : null;
        });

        const response = await algodClient
            .sendRawTransaction(decodedResult)
            .do();
        console.log(response);

        return response;
    } catch (err) {
        console.error(err);
    }
};

const sendMyAlgoTransaction = async (txn, algodClient) => {
    try {
        const myAlgoWallet = new MyAlgoConnect();

        const signedTxn = await myAlgoWallet.signTransaction(txn.toByte());
        const response = await algodClient
            .sendRawTransaction(signedTxn.blob)
            .do();
        console.log(response);

        return response;
    } catch (err) {
        console.error(err);
    }
};

export default {
    sendWalletConnectTransaction,
    sendMyAlgoTransaction,
    sendAlgoSignerTransaction,
    sendAlgoSignerGTransaction
};
