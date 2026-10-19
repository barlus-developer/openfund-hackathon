import { getAddress, zeroAddress } from "viem";

export function runtimeMatches(code, artifact) {
  const expected = artifact.deployedBytecode.object
    .replace(/^0x/, "")
    .toLowerCase();
  const actual = (code ?? "0x").replace(/^0x/, "").toLowerCase();
  if (!expected.length || actual.length !== expected.length) return false;
  const mask = (value) => {
    const bytes = value.split("");
    for (const ref of Object.values(
      artifact.deployedBytecode.immutableReferences ?? {},
    ).flat())
      bytes.fill("0", ref.start * 2, (ref.start + ref.length) * 2);
    return bytes.join("");
  };
  return mask(actual) === mask(expected);
}

export async function inspectDeployment(
  client,
  hash,
  chainId,
  artifacts,
  confirmations = 2,
) {
  if ((await client.getChainId()) !== chainId)
    throw Error("RPC chain ID does not match DEV_CHAIN_ID.");
  const receipt = await client.getTransactionReceipt({ hash });
  if (receipt.status !== "success" || !receipt.contractAddress || receipt.to)
    throw Error(
      "Supply the successful OpenFund contract-creation transaction hash.",
    );
  const core = getAddress(receipt.contractAddress);
  const readCore = (functionName) =>
    client.readContract({
      address: core,
      abi: artifacts.OpenFund.abi,
      functionName,
    });
  const [isProtocol, token, deploymentChainId, coreCode, block, head] =
    await Promise.all([
      readCore("isOpenFundProtocol"),
      readCore("oflToken"),
      readCore("deploymentChainId"),
      client.getCode({ address: core }),
      client.getBlock({ blockNumber: receipt.blockNumber }),
      client.getBlockNumber(),
    ]);
  if (!isProtocol || deploymentChainId !== BigInt(chainId))
    throw Error("OpenFund token/chain handshake failed.");
  if (!runtimeMatches(coreCode, artifacts.OpenFund))
    throw Error(
      "OpenFund runtime does not match the current compiled artifact. Use the matching compiler/source version.",
    );
  if (
    block.hash !== receipt.blockHash ||
    head < receipt.blockNumber + BigInt(confirmations - 1)
  )
    throw Error(
      "Deployment is not canonical or has insufficient confirmations. Retry after more blocks.",
    );
  const tokenAddress = getAddress(token);
  const readToken = (functionName, args) =>
    client.readContract({
      address: tokenAddress,
      abi: artifacts.OFLToken.abi,
      functionName,
      ...(args ? { args } : {}),
    });
  const [protectedFund, issuer, decimals, symbol, code] = await Promise.all([
    readToken("protectedFunds", [core]),
    readToken("issuer"),
    readToken("decimals"),
    readToken("symbol"),
    client.getCode({ address: tokenAddress }),
  ]);
  if (!protectedFund)
    throw Error(
      "Issuer must registerProtectedFund(core) before importing the deployment.",
    );
  if (
    issuer === zeroAddress ||
    decimals !== 18 ||
    symbol !== "OFL" ||
    !runtimeMatches(code, artifacts.OFLToken)
  )
    throw Error("OFL token runtime/issuer/precision validation failed.");
  return {
    chainId,
    openFundAddress: core,
    oflTokenAddress: tokenAddress,
    deploymentBlock: receipt.blockNumber.toString(),
    deploymentBlockHash: block.hash,
  };
}

export function mergeDeployment(existing, entry) {
  const previous = existing.find((item) => item.version === entry.version);
  if (
    previous &&
    (previous.chainId !== entry.chainId ||
      previous.openFundAddress.toLowerCase() !==
        entry.openFundAddress.toLowerCase() ||
      previous.deploymentBlockHash !== entry.deploymentBlockHash)
  )
    throw Error(
      "Version already refers to another deployment. Choose a new PROTOCOL_VERSION; existing funds keep their original identity.",
    );
  return [entry, ...existing.filter((item) => item.version !== entry.version)];
}
