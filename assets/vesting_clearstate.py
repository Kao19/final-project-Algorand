from pyteal import *

def vesting_clearstate():
    return Return(Int(1))

if __name__ == "__main__":
    print(compileTeal(vesting_clearstate(), mode=Mode.Application, version=6))