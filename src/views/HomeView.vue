<template>
    <div>
        <NavBar
            :sender="sender"
            :network="network"
            :asset_per="asset_per"
            :withdrawabale_amount="withdrawabale_amount"
            @VACamount="VACamount"
            @setSender="setSender"
            @setNetwork="setNetwork"
            @disconnectWallet="disconnectWallet"
            @connectMyAlgo="connectMyAlgo"
            @connectToAlgoSigner="connectToAlgoSigner"
            @connectToWalletConnect="connectToWalletConnect"
        />
        <div id="home" class="container-sm mt-5">
            <send-asset-form
                v-if="this.sender !== ''"
                :sender="this.sender"
                :connection="this.connection"
                :network="this.network"
                :asset_per="this.asset_per"
                :withdrawabale_amount="this.withdrawabale_amount"
            />
        </div>
    </div>
</template>

<script>
import MyAlgoConnect from "@randlabs/myalgo-connect";
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "@walletconnect/qrcode-modal";

import { getAlgodClient } from "../client.js";
import config from "../../artifacts/scripts/mint_asset.js.cp.yaml";

export default {
    data() {
        return {
            connection: "", // myalgo | walletconnect | algosigner
            connector: null, // wallet connector obj
            network: "Localhost", // Localhost | TestNet
            sender: "", // connected account
            withdrawabale_amount: 0,
            asset_per: 0,
        };
    },
    created(){
        this.algodClient = getAlgodClient("Localhost");
        const VestingApp = config.default.metadata;
        this.vestingAppAddress = VestingApp.VestingAppAddress;
        this.vestingAppId = VestingApp.VestingAppId;
        this.vestingTimeStamp = VestingApp.VestingTimeStamp;
    },
   
    methods: {

        async getGlobalStates(pourcentage,clif){
            let applicationInfoResponse1 = await this.algodClient.getApplicationByID(this.vestingAppId).do();

            for(let i=0; i<applicationInfoResponse1['params']['global-state'].length; i++){
                if(applicationInfoResponse1['params']['global-state'][i].key === window.btoa(pourcentage)){
                    console.log("pourcentage" , applicationInfoResponse1['params']['global-state'][i].value.uint);
                    this.asset_per = applicationInfoResponse1['params']['global-state'][i].value.uint;
                }
                if(applicationInfoResponse1['params']['global-state'][i].key === window.btoa(clif)){
                    console.log("clif" , applicationInfoResponse1['params']['global-state'][i].value.uint);
                    this.withdrawabale_amount = applicationInfoResponse1['params']['global-state'][i].value.uint;
                    console.log("this: ",this.withdrawabale_amount);
                }  
                   
            }
        },

        async VACamount(sender){
            switch(sender) {
                //team
                case process.env.VUE_APP_ACC2_ADDR:
                    this.getGlobalStates('percentageTeam','ClifAmountTeam');
                    break;
                
                //advisors
                case process.env.VUE_APP_ACC3_ADDR:
                    this.getGlobalStates('percentageAdvisors','ClifAmountAdvisors');
                    break;

                //private investors
                case process.env.VUE_APP_ACC4_ADDR:
                    this.getGlobalStates('percentagePrivateInvestors','ClifAmountPrivateInvestors');
                    break;
                
                //company reserve
                case process.env.VUE_APP_ACC1_ADDR:
                    this.getGlobalStates('percentageCompanyReserve','ClifAmountCompanyReserve');
                    break;
            }           
        },


        setSender(sender) {
            this.disconnectWallet();
            this.sender = sender;
        },
        setNetwork(network) {
            this.disconnectWallet();
            this.network = network;
        },
        disconnectWallet() {
            this.connection = ""; 
            this.connector = null;
            this.sender = "";
        },
        async connectMyAlgo() {
            try {
                // force connection to TestNet
                this.network = "TestNet";

                const myAlgoWallet = new MyAlgoConnect();
                const accounts = await myAlgoWallet.connect();
                this.sender = accounts[0].address;
                this.connection = "myalgo";
            } catch (err) {
                console.error(err);
            }
        },
        async connectToAlgoSigner() {
            const AlgoSigner = window.AlgoSigner;

            if (typeof AlgoSigner !== "undefined") {
                await AlgoSigner.connect();
                const accounts = await AlgoSigner.accounts({
                    ledger: this.network,
                });

                if (this.network === "Localhost") {
                    // use non-creator address
                    this.sender = accounts[2].address;
                } else {
                    this.sender = accounts[0].address;
                }

                this.connection = "algosigner";
            }
        },
        async connectToWalletConnect() {
            // force connection to TestNet
            this.network = "TestNet";

            // Create a connector
            this.connector = new WalletConnect({
                bridge: "https://bridge.walletconnect.org", // Required
                qrcodeModal: QRCodeModal,
            });

            // Kill existing session
            if (this.connector.connected) {
                await this.connector.killSession();
            }

            this.connector.createSession();

            // Subscribe to connection events
            this.connector.on("connect", (error, payload) => {
                if (error) {
                    throw error;
                }

                const { accounts } = payload.params[0];
                this.sender = accounts[0];
                this.connection = "walletconnect";
            });

            this.connector.on("session_update", (error, payload) => {
                if (error) {
                    throw error;
                }

                const { accounts } = payload.params[0];
                this.sender = accounts[0];
                this.connection = "walletconnect";
            });

            this.connector.on("disconnect", (error, payload) => {
                if (error) {
                    throw error;
                }

                // Delete connector
                console.log(payload);
                this.sender = "";
                this.connection = "";
            });
        },
    },
};
</script>
