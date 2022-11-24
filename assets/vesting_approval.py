from pydoc import cli
import sys
sys.path.insert(0,'.')

from algobpy.parse import parse_params
from pyteal import *

def vesting_approval():

    basic_checks = And(
        Txn.rekey_to() == Global.zero_address(),
        Txn.close_remainder_to() == Global.zero_address(),
        Txn.asset_close_to() == Global.zero_address()
    )

    assetID = Btoi(Txn.application_args[0])
    percentageAdvisors = Btoi(Txn.application_args[1])
    percentagePrivateInvestors = Btoi(Txn.application_args[2])
    percentageCompanyReserve = Btoi(Txn.application_args[3])
    percentageTeam = Btoi(Txn.application_args[4])
    handle_creation = Seq([
        Assert(basic_checks),
        App.globalPut(Bytes("assetID"), assetID),
        
        App.globalPut(Bytes("team_address"), Txn.accounts[1]),
        App.globalPut(Bytes("advisors_address"), Txn.accounts[2]),
        App.globalPut(Bytes("private_investor_address"), Txn.accounts[3]),
        App.globalPut(Bytes("company_reserve_address"), Txn.accounts[4]),

        App.globalPut(Bytes("percentageAdvisors"), percentageAdvisors),
        App.globalPut(Bytes("percentagePrivateInvestors"), percentagePrivateInvestors),
        App.globalPut(Bytes("percentageCompanyReserve"), percentageCompanyReserve),
        App.globalPut(Bytes("percentageTeam"), percentageTeam),


        App.globalPut(Bytes("ClifAmountAdvisors"),Int(0)),
        App.globalPut(Bytes("ClifAmountPrivateInvestors"),Int(0)),
        App.globalPut(Bytes("ClifAmountTeam"),Int(0)),
        App.globalPut(Bytes("ClifAmountCompanyReserve"),Int(0)),

        Return(Int(1))
    ])

    initTime = Seq(
        App.globalPut(Bytes("initialTime"), Btoi(Txn.application_args[1])),
        Return(Int(1))
    )

    # opting in to receive the asset
    optin=Seq([
        Assert(basic_checks),
        Assert(App.globalGet(Bytes("optInStatus")) == Int(0)), # if this variable doesn't exist, the contract hasn't opted in before 
        Assert(Txn.assets[0] == App.globalGet(Bytes("assetID"))),
        Assert(Txn.sender() == Global.creator_address()),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
        TxnField.type_enum: TxnType.AssetTransfer,
        TxnField.asset_receiver: Global.current_application_address(),
        TxnField.asset_amount: Int(0),
        TxnField.xfer_asset: Txn.assets[0], # Must be in the assets array sent as part of the application call
        }),
        InnerTxnBuilder.Submit(),
        App.globalPut(Bytes("optInStatus"), Int(1)), #this variable is created and initialized after optin
        Return(Int(1))
    ])


    year = Int(31556952) # 1 year
    month = Int(2629800) # 1 month    
    initialTime = App.globalGet(Bytes("initialTime"))
    amount = Btoi(Gtxn[1].application_args[1])
    

    @Subroutine(TealType.none)
    def signTransaction(clif,withdrawable):
        return Seq([ 
            Assert(App.globalGet(Bytes("assetID")) == Gtxn[1].assets[0]),
            Assert(Global.group_size() == Int(2)),
            Assert(Gtxn[0].type_enum() == TxnType.Payment),
            Assert(Gtxn[1].type_enum() == TxnType.ApplicationCall),
            Assert(amount <= withdrawable),
            Assert(amount > Int(0)),
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.asset_receiver: Gtxn[1].sender(),
            TxnField.asset_amount: amount,
            TxnField.xfer_asset: Gtxn[1].assets[0], # Must be in the assets array sent as part of the application call
            }),
            InnerTxnBuilder.Submit(),
            App.globalPut(clif,App.globalGet(clif)+amount),
            ])

    @Subroutine(TealType.none)
    def functionToWithdraw(clif,percentage,currentMonth):
       return Seq([
            If(currentMonth < Int(12)).Then(
                Reject()
            ).ElseIf(currentMonth > Int(24)).Then(
                signTransaction(clif,App.globalGet(percentage)-App.globalGet(clif))
            ).Else(
                signTransaction(clif,(App.globalGet(percentage) * (currentMonth-Int(1)) / Int(24))-App.globalGet(clif))
            )
       ])

    withdrawFromVesting = Seq([
        Assert(basic_checks),
        Cond(
            [Txn.sender() == App.globalGet(Bytes("advisors_address")), If(Global.latest_timestamp() > initialTime + year,functionToWithdraw(Bytes("ClifAmountAdvisors"),Bytes("percentageAdvisors"),(Global.latest_timestamp()-initialTime)/month),Return(Int(0)))],
            [Txn.sender() == App.globalGet(Bytes("team_address")), If(Global.latest_timestamp() > initialTime + year,functionToWithdraw(Bytes("ClifAmountTeam"),Bytes("percentageTeam"),(Global.latest_timestamp()-initialTime)/month),Return(Int(0)))],
            [Txn.sender() == App.globalGet(Bytes("private_investor_address")), If(Global.latest_timestamp() > initialTime + year,functionToWithdraw(Bytes("ClifAmountPrivateInvestors"),Bytes("percentagePrivateInvestors"),(Global.latest_timestamp()-initialTime)/month),Return(Int(0)))],
            [Txn.sender() == App.globalGet(Bytes("company_reserve_address")), signTransaction(Bytes("ClifAmountCompanyReserve"),App.globalGet(Bytes("percentageCompanyReserve"))-App.globalGet(Bytes("ClifAmountCompanyReserve")))],
        ),

        Return(Int(1))
    ]) 
   

    handle_optin = Seq([
        Return(Int(0))
    ])

    handle_noop = Seq(
        Assert(basic_checks),
        Cond(
            [Txn.application_args[0] == Bytes("optin"), optin],
            [Txn.application_args[0] == Bytes("withdrawFromVesting"), withdrawFromVesting],
            [Txn.application_args[0] == Bytes("initTime"), initTime],
        )
    )
    handle_closeout = Return(Int(1))
    handle_updateapp = Return(Int(0))
    handle_deleteapp = Return(Int(0))

    program = Cond(
        [Txn.application_id() == Int(0), handle_creation],
        [Txn.on_completion() == OnComplete.OptIn, handle_optin],
        [Txn.on_completion() == OnComplete.CloseOut, handle_closeout],
        [Txn.on_completion() == OnComplete.UpdateApplication, handle_updateapp],
        [Txn.on_completion() == OnComplete.DeleteApplication, handle_deleteapp],
        [Txn.on_completion() == OnComplete.NoOp, handle_noop]
    )

    return program

if __name__ == "__main__":
    params = {}

    # Overwrite params if sys.argv[1] is passed
    if(len(sys.argv) > 1):
        params = parse_params(sys.argv[1], params)

    print(compileTeal(vesting_approval(), mode=Mode.Application, version=6))