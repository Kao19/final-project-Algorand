
## Update environement variables
1. Copy `.env.example` to `.env`.
2. Update credentials in `.env` file.


## contracts
The Mint contract is where i create my token and i distribute it.
The vesting contract is where i call the withdraw method based on the sender and the cliff/vesting periods


## Setup the front end
execute the command yarn serve.
choose algosigner localhost and then choose the stakeholder. 
Note that you can't withdraw from team/advisors/privateInvestors until 12 months. while company reserve can withdraw anytime.


### 3. Algo Builder deployment commands
```
# Run all deployment scripts
yarn run algob deploy

# Run one deployment script
yarn run algob deploy scripts/<filename>

# Run non deployment scripts
yarn run algob run scripts/path/to/filename

# Clear cache
yarn run algob clean

# Run tests
yarn run algob test

# Run dapp on localhost
yarn serve
```
 
