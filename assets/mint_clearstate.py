from pyteal import *

def mint_clearstate():
    return Return(Int(1))

if __name__ == "__main__":
    print(compileTeal(mint_clearstate(), mode=Mode.Application, version=6))