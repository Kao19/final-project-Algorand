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

        App.globalPut(Bytes("RemainingAdvisors"), Int(0)),
        App.globalPut(Bytes("RemainingPrivateInvestors"), Int(0)),
        App.globalPut(Bytes("RemainingTeam"), App.globalGet(Bytes("ClifAmountTeam"))),
        App.globalPut(Bytes("RemainingCompanyReserve"), Int(0)),

        App.globalPut(Bytes("ClifAmountAdvisors"),App.globalGet(Bytes("percentageAdvisors"))*Int(12)/Int(24)),
        App.globalPut(Bytes("ClifAmountPrivateInvestors"),App.globalGet(Bytes("percentagePrivateInvestors"))*Int(12)/Int(24)),
        App.globalPut(Bytes("ClifAmountTeam"),App.globalGet(Bytes("percentageTeam"))*Int(12)/Int(24)),
        App.globalPut(Bytes("ClifAmountCompanyReserve"),App.globalGet(Bytes("percentageCompanyReserve"))),

        Return(Int(1))
    ])


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


    initialTime = Btoi(Txn.application_args[1]) #the time when the contract is deployed (i used it as a reference to see how many months have already passed)
    amount = Btoi(Txn.application_args[2])


    # everytime this function is called, i verify the current time with an amount of time to see which month after clif is that (example: 2629800 means a month in seconds)
    @Subroutine(TealType.none)
    def functionToWithdraw(clif,remaining,percentage):
        return If( Global.latest_timestamp() >= Int(2629800) and Global.latest_timestamp() < Int(5259600) and Txn.sender() != App.globalGet(Bytes("company_reserve_address"))).Then(Seq([
            Assert(App.globalGet(Bytes("assetID")) == Txn.assets[0]),
            Assert(amount <= App.globalGet(clif)),
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.asset_receiver: Txn.sender(),
            TxnField.asset_amount: amount,
            TxnField.xfer_asset: Txn.assets[0], # Must be in the assets array sent as part of the application call
            }),
            InnerTxnBuilder.Submit(),
            App.globalPut(clif,App.globalGet(clif)-amount),
            App.globalPut(remaining,App.globalGet(clif)),
            
        ])).ElseIf( Global.latest_timestamp() >= initialTime + Int(5259600) and Global.latest_timestamp() <= initialTime + Int(63113904) and Txn.sender() != App.globalGet(Bytes("company_reserve_address"))).Then(
            Seq([
                App.globalPut(clif,App.globalGet(remaining)+(App.globalGet(percentage)/Int(24))),
                Assert(App.globalGet(Bytes("assetID")) == Txn.assets[0]),
                Assert(amount <= App.globalGet(clif)),
                InnerTxnBuilder.Begin(),
                InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.asset_receiver: Txn.sender(),
                TxnField.asset_amount: amount,
                TxnField.xfer_asset: Txn.assets[0], # Must be in the assets array sent as part of the application call
                }),
                InnerTxnBuilder.Submit(),

                App.globalPut(clif,App.globalGet(clif)-amount),
                App.globalPut(remaining,App.globalGet(clif)),

            ])
        ).ElseIf(Txn.sender() == App.globalGet(Bytes("company_reserve_address"))).Then(
            Seq([
                Assert(App.globalGet(Bytes("assetID")) == Txn.assets[0]),
                Assert(App.globalGet(clif) != Int(0)),
                Assert(amount <= App.globalGet(clif) + App.globalGet(remaining)),
                InnerTxnBuilder.Begin(),
                InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.asset_receiver: Txn.sender(),
                TxnField.asset_amount: amount,
                TxnField.xfer_asset: Txn.assets[0], # Must be in the assets array sent as part of the application call
                }),
                InnerTxnBuilder.Submit(),
                App.globalPut(clif,App.globalGet(clif)-amount),
                
            ])
        )

    
    
    withdrawFromVesting = Seq([
        Assert(basic_checks),
        Cond(
            [Txn.sender() == App.globalGet(Bytes("advisors_address")), If(Global.latest_timestamp() > initialTime + Int(31556952),functionToWithdraw(Bytes("ClifAmountAdvisors"),Bytes("RemainingAdvisors"),Bytes("percentageAdvisors")),Return(Int(0)))],
            [Txn.sender() == App.globalGet(Bytes("team_address")), If(Global.latest_timestamp() > initialTime + Int(31556952),functionToWithdraw(Bytes("ClifAmountTeam"),Bytes("RemainingTeam"),Bytes("percentageTeam")),Return(Int(0)))],
            [Txn.sender() == App.globalGet(Bytes("private_investor_address")), If(Global.latest_timestamp() > initialTime + Int(31556952),functionToWithdraw(Bytes("ClifAmountPrivateInvestors"),Bytes("RemainingPrivateInvestors"),Bytes("percentagePrivateInvestors")),Return(Int(0)))],
            [Txn.sender() == App.globalGet(Bytes("company_reserve_address")), functionToWithdraw(Bytes("ClifAmountCompanyReserve"),Bytes("RemainingCompanyReserve"),Bytes("percentageCompanyReserve"))],
            
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