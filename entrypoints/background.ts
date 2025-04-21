import { getSchnorrAccount } from "@aztec/accounts/schnorr";
import { SponsoredFeePaymentMethod } from "@aztec/aztec.js/fee/testing";
import { Fr, GrumpkinScalar } from "@aztec/foundation/fields";
import { getPXEServiceConfig, PXEServiceConfig } from "@aztec/pxe/config";
import { createPXEService } from "@aztec/pxe/client/bundle";
import { createAztecNodeClient } from "@aztec/stdlib/interfaces/client";
import { Logger } from "@/utils/logger";
import { getContractInstanceFromDeployParams } from "@aztec/aztec.js";
import { SponsoredFPCContractArtifact } from "@aztec/noir-contracts.js/SponsoredFPC";

export default defineBackground(() => {
  run();
});

async function run() {
  console.log("Service worker started.");

  // Create PXE

  console.log("Starting PXE...");
  const node = createAztecNodeClient("http://localhost:8080");

  const l1Contracts = await node.getL1ContractAddresses();
  const config = {
    ...getPXEServiceConfig(),
    l1Contracts,
    proverEnabled: true,
  } as PXEServiceConfig;

  const pxe = await createPXEService(node, config, {
    loggers: {
      store: new Logger("pxe:store", "trace"),
      pxe: new Logger("pxe:service", "trace"),
      prover: new Logger("pxe:prover", "trace"),
    },
  });
  console.log("PXE started", pxe);

  // Register FPC

  console.log("Registering sponsored FPC...");
  const sponsoredFPC = await getContractInstanceFromDeployParams(
    SponsoredFPCContractArtifact,
    {
      constructorArgs: [],
      salt: Fr.zero(),
    }
  );

  await pxe.registerContract({
    instance: sponsoredFPC,
    artifact: SponsoredFPCContractArtifact,
  });
  console.log("Sponsored FPC registered.", sponsoredFPC.address.toString());

  // Deploy account

  console.log("Deploying account...");
  const alice = await getSchnorrAccount(
    pxe,
    new Fr(123),
    new GrumpkinScalar(123),
    Fr.zero()
  );

  const tx = await alice
    .deploy({
      fee: {
        paymentMethod: new SponsoredFeePaymentMethod(sponsoredFPC.address),
      },
      skipClassRegistration: false,
      skipPublicDeployment: false,
      skipInitialization: false,
    })
    .wait();
  console.log("Account deployed.", tx);
}
