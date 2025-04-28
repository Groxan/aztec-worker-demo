import { getSchnorrAccount } from "@aztec/accounts/schnorr";
import { SponsoredFeePaymentMethod } from "@aztec/aztec.js/fee/testing";
import { Fr, GrumpkinScalar } from "@aztec/foundation/fields";
import { getPXEServiceConfig, PXEServiceConfig } from "@aztec/pxe/config";
import { createPXEService } from "@aztec/pxe/client/bundle";
import { createAztecNodeClient, PXE } from "@aztec/stdlib/interfaces/client";
import { createPXEClient, getContractInstanceFromDeployParams, sleep, Wallet } from "@aztec/aztec.js";
import { SponsoredFPCContractArtifact } from "@aztec/noir-contracts.js/SponsoredFPC";
import { TokenContract } from "@aztec/noir-contracts.js/Token";

const SANDBOX_URL = "http://localhost:8080";

async function test() {
    await testSandboxPxe();
    await testInBrowserPxe();
}

async function testSandboxPxe() {
    console.log("======== Test sandbox PXE ========");
    const pxe = createPXEClient(SANDBOX_URL);

    return runTest(pxe);
}

async function testInBrowserPxe() {
    console.log("======== Test in-browser PXE ========");
    const node = createAztecNodeClient(SANDBOX_URL);
    const l1Contracts = await node.getL1ContractAddresses();
    const config = {...getPXEServiceConfig(), l1Contracts, proverEnabled: false} as PXEServiceConfig;
    const pxe = await createPXEService(node, config);

    return runTest(pxe);
}

async function runTest(pxe: PXE) {
    const sponsoredFPC = await getContractInstanceFromDeployParams(
        SponsoredFPCContractArtifact,
        {
            constructorArgs: [],
            salt: Fr.zero()
        },
    );

    await pxe.registerContract({
        instance: sponsoredFPC,
        artifact: SponsoredFPCContractArtifact,
    });

    const fee = {
        paymentMethod: new SponsoredFeePaymentMethod(sponsoredFPC.address)
    };

    const account = await getSchnorrAccount(pxe, Fr.random(), GrumpkinScalar.random(), Fr.zero());
    await account.deploy({ fee }).wait();
    
    const wallet = await account.getWallet();
    console.log("Wallet", wallet.getAddress().toString());

    const { contract: token } = await TokenContract
        .deploy(wallet, wallet.getAddress(), "Token", "TKN", 0)
        .send({ fee })
        .wait();

    console.log("Token", token.address.toString());

    console.log("======== Initial ========");
    await printBalance(pxe, wallet, token);

    for (let i = 0; i < 3; i++) {
        try {
            console.log("======== Mint 10 ========");

            const tx = await token.methods
                .mint_to_private(wallet.getAddress(), wallet.getAddress(), 10n)
                .send({ fee })
                .wait();

            console.log("Tx", tx.status);

            await printBalance(pxe, wallet, token);
        }
        catch (e) {
            console.log((e as Error)?.message ?? "Failed");
        }
    }

    for (let i = 0; i < 10; i++) {
        try {
            console.log("======== Send 1 to itself ========");

            const tx = await token.methods
                .transfer(wallet.getAddress(), 1n)
                .send({ fee })
                .wait();

            console.log("Tx", tx.status);

            await printBalance(pxe, wallet, token);
        }
        catch (e) {
            console.log((e as Error)?.message ?? "Failed");
        }
    }

    await sleep(60_000);

    console.log("======== Final ========");
    await printBalance(pxe, wallet, token);
}

async function printBalance(pxe: PXE, wallet: Wallet, token: TokenContract) {
    const balance = await token.methods
        .balance_of_private(wallet.getAddress())
        .simulate();

    const notes = await pxe.getNotes({
        recipient: wallet.getAddress(),
        contractAddress: token.address,
    });

    console.log("Balance", balance, "Notes", notes.map(x => x.note.items[2].toBigInt()));
}

test();