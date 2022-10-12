# Vesting Application

## Overview

Token vesting refers to a process where tokens are locked and released slowly over a period of time. If the tokens are locked, they cannot be transferred or used until they are released. This is to mitigate attempts to introduce a large supply of tokens to the market at any point in time.

Create an vesting application which involves using smart contracts to lock the tokens for a specified duration. The tokens can be retrieved progressively via your application within the vesting period.

The tokens distribution table are as follows. The vesting period is the duration which the allocated percentage of tokens will be progressively released. Cliff refers to the initial duration within the vesting period which the tokens are locked. Upon the end of the cliff, the stakeholder is able to receive a portion of the allocated stake from the subsequent month onwards.

| Stakeholder           | Percentage    | Vesting Period (months)   | Cliff (months)    | 
| --------------------- | ------------- | ------------------------- | ----------------- |
| Public				| 25		    | NA                        | NA                |
| Advisors				| 10 			| 24                        | 12                |
| Private Investors 	| 20 			| 24                        | 12                |
| Company Reserves	    | 30			| NA                        | NA                |
| Team				    | 15			| 24                        | 12                |

For example, if the advisors are allocated 1200 tokens over a vesting period of 24 months and a cliff of 12 months, the distribution will look like this,

1. Months 1 to 12 --- Advisors get 0 tokens
2. Month 13 --- Advisors get 12 * (1200 / 24) = 600 tokens
3. Month 14 --- Advisors (1200 / 24) = 50 tokens
4. Month 15 --- Advisors (1200 / 24) = 50 tokens
5. Month 16 --- Advisors (1200 / 24) = 50 tokens
6. ... etc etc

## Application Details

### Token Creation
Create the fungible token with the following details.

1. Token name: VACoin
2. Unit name: VAC
3. Total supply: 100 million
4. Decimals: 0

### Contract initialization
Initialize the vesting contract with the following details.

1. Team address
2. Advisors address
3. Private investor address
4. Asset ID
5. Remaining amount of tokens that can be distributed per stakeholder

Once the vesting contract is deployed, proceed to transfer all the tokens (less the public allocation) to the vesting contract. This means that you should perform an asset opt in transaction before sending 75% of the token supply to it for lockup and distribution. 

### Withdraw
**Only the advisors, private investors, company reserves and team accounts can withdraw from the vesting contract.**

This is an application call to withdraw the vested tokens from the contract. This function will need to verify the sender's address, the vesting and cliff period and decide the available tokens to distribute.

As always, accounts need to be opted in before making a application calls.

### Application Frontend
Create an application frontend with the following,

1. Implement wallet connectors to allow stakeholders to connect to their wallet accounts. The Dapp needs to allow user to switch between accounts for the purposes of this assignment.
2. Display the total allocated tokens when the stakeholder account is connected.
3. Display maximum number of withdrawable tokens for the stakeholder at that point in time. Your contract will also need to verify this number as well.
4. Only allow authorized stakeholder accounts to withdraw from the application.

## Testing
Write test cases to demostrate the successful flow of the auction and negative tests to demostrate if the necesssary checks are in place.

## Deployment
Include documentation on how to deploy the smart contracts and how to set up the application frontend locally.

## Assesment Criteria
[https://docs.google.com/document/d/1IMHy5xnl0y8vADZF40sZLTzjgVdWKNz8sXF6McBEBSU/edit?usp=sharing](https://docs.google.com/document/d/1IMHy5xnl0y8vADZF40sZLTzjgVdWKNz8sXF6McBEBSU/edit?usp=sharing)
