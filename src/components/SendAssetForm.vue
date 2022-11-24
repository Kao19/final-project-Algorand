<template>
    <div id="buyasset" class="mb-5">
        <h3>Withdraw</h3>
        <div
            v-if="this.acsTxId !== ''"
            class="alert alert-success"
            role="alert"
        >
            Txn Ref:
            <a :href="explorerURL" target="_blank">{{ this.acsTxId }}</a>
        </div>
        <p>initial amount: {{ this.asset_per }}</p>
        <p>you can withdraw up to: {{ this.withdrawabale_amount }}</p>
        <form
            action="#"
            @submit.prevent="handleWithdraw"
        >
            <div class="mb-3">
                <label for="asset_amount" class="form-label"
                    >Withdraw</label
                >
                <input
                    type="number"
                    class="form-control"
                    id="asset_amount"
                    v-model="asset_amount"
                />
            </div>
            <button type="submit" class="btn btn-primary">Withdraw</button>
        </form>
    </div>
</template>

<script>
import algosdk from 'algosdk';
import { getAlgodClient } from "../client.js";
import * as helpers from '../helpers';
import config from "../../artifacts/scripts/mint_asset.js.cp.yaml";
import wallets from "../wallets.js";


export default {
    props: {
        connection: String,
        network: String,
        sender: String,
        asset_per: Number,
        withdrawabale_amount: Number,

    },
    data() {
        return {
            acsTxId: "",
            asset_amount: 0,
            explorerURL: "",
            algodClient: null,
            vestingAppAddress: null,
            vestingAppId: null,
        };
    },
    created(){
        this.algodClient = getAlgodClient(this.network);
        const VestingApp = config.default.metadata;
        this.vestingAppAddress = VestingApp.VestingAppAddress;
        this.vestingAppId = VestingApp.VestingAppId;
        this.vestingTimeStamp = VestingApp.VestingTimeStamp;
    },
   
    methods: {
        
        async updateTxn(value) {
            this.acsTxId = value;
            this.explorerURL = helpers.getExplorerURL(this.acsTxId, this.network);
        },
        async handleWithdraw() {
            
            console.log(this.sender);
            
            let assetId;
            let params = await this.algodClient.getTransactionParams().do();
            params.fee = 1000;
            params.flatFee = true;

            
            let applicationInfoResponse = await this.algodClient.getApplicationByID(this.vestingAppId).do();
            
            const senderInfo = await this.algodClient.accountInformation(this.sender).do();
            
            //get the asset Id from the global states
            for(let i=0; i<applicationInfoResponse['params']['global-state'].length; i++){
                if(applicationInfoResponse['params']['global-state'][i].key === window.btoa('assetID')){
                    console.log("assetID" , applicationInfoResponse['params']['global-state'][i].value.uint);
                    assetId = applicationInfoResponse['params']['global-state'][i].value.uint;
                }  
            }

            console.log(assetId);

            //loop through the assets array
            for(let i=0; i<=senderInfo.assets.length; i++){
                
                //check for each element if it undefined or if we've finished looping the array and find no matching id, if that's the case we do opt in
                if(typeof senderInfo.assets[i] === 'undefined' || (senderInfo.assets[i]['asset-id'] !== assetId && i === senderInfo.assets.length -1)){
                    
                    let txn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                        this.sender,
                        this.sender,
                        undefined,
                        undefined,
                        0,
                        undefined,
                        assetId,
                        params
                    );
                    await wallets.sendAlgoSignerTransaction(txn, this.algodClient);
                    break;
                }

                //user already opt in
                else if(senderInfo.assets[i]['asset-id'] === assetId){
                    break;
                }
            }


            //for user to pay fees
            let feePaymentTxn = algosdk.makePaymentTxnWithSuggestedParams(
                this.sender, 
                this.vestingAppAddress, 
                1000, 
                undefined, 
                undefined, 
                params,
            );



            let appArgs = [new Uint8Array(Buffer.from("withdrawFromVesting")), algosdk.encodeUint64(Number(this.vestingTimeStamp)), algosdk.encodeUint64(Number(this.asset_amount))];

            let withdaw = algosdk.makeApplicationNoOpTxn(
                this.sender, 
                params, 
                this.vestingAppId,
                appArgs,
                undefined,
                undefined,
                [assetId]
            );
            
            

            // Store txns
            let txns = [feePaymentTxn, withdaw];

            // Assign group ID
            algosdk.assignGroupID(txns);

            const txnID = await wallets.sendAlgoSignerGTransaction(txns, this.algodClient);
            
            if(txnID) {
                this.updateTxn(txnID.txId);
            }
            else{
                this.$alert("something went wrong with your transaction!"); // make sure vue-simple-alert is installed
            }
        

            
        },
    },
    
};
</script>