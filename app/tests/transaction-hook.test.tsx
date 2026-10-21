import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTransaction } from "../src/hooks/useTransaction";
import { defaultDeployment } from "../src/web3/deployments";
const mocks = vi.hoisted(() => ({
  address: "0x1111111111111111111111111111111111111111",
  send: vi.fn(),
  getChainId: vi.fn(),
  getAddresses: vi.fn(),
  call: vi.fn(),
  estimateGas: vi.fn(),
  balance: vi.fn(),
  price: vi.fn(),
  wait: vi.fn(),
  verify: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("wagmi", () => ({
  useConnection: () => ({ address: mocks.address }),
  useWalletClient: () => ({
    data: {
      getChainId: mocks.getChainId,
      getAddresses: mocks.getAddresses,
      sendTransaction: mocks.send,
    },
  }),
}));
vi.mock("../src/web3/deployments", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../src/web3/deployments")>();
  return {
    ...original,
    verifyDeployment: mocks.verify,
    clientFor: () => ({
      call: mocks.call,
      estimateGas: mocks.estimateGas,
      getBalance: mocks.balance,
      getGasPrice: mocks.price,
      waitForTransactionReceipt: mocks.wait,
    }),
  };
});
vi.mock("../src/components/ui/toast", () => ({ toast: { add: mocks.toast } }));
const hash = `0x${"11".repeat(32)}`;
const receipt = { status: "success", transactionHash: hash, logs: [] };
function setup() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return {
    ...renderHook(() => useTransaction(defaultDeployment!), { wrapper }),
    queryClient,
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getChainId.mockResolvedValue(defaultDeployment!.chainId);
  mocks.getAddresses.mockResolvedValue([mocks.address]);
  mocks.estimateGas.mockResolvedValue(21000n);
  mocks.balance.mockResolvedValue(10n ** 18n);
  mocks.price.mockResolvedValue(1n);
  mocks.send.mockResolvedValue(hash);
  mocks.wait.mockResolvedValue(receipt);
});
describe("wallet transaction safety", () => {
  it("keeps a mined success confirmed when cache refresh rejects", async () => {
    const { result, queryClient } = setup();
    vi.spyOn(queryClient, "invalidateQueries").mockRejectedValue(
      Error("Offline"),
    );
    let returned;
    await act(async () => {
      returned = await result.current.send(
        defaultDeployment!.openFundAddress,
        "0x1234",
      );
    });
    expect(returned).toEqual(receipt);
    expect(result.current.state.stage).toBe("Confirmed");
    expect(result.current.state.error).toBeUndefined();
  });
  it("does not request a signature on the wrong chain", async () => {
    mocks.getChainId.mockResolvedValue(1);
    const { result } = setup();
    await act(async () => {
      await result.current.send(defaultDeployment!.openFundAddress, "0x1234");
    });
    expect(mocks.send).not.toHaveBeenCalled();
    expect(result.current.state.stage).toBe("Failed");
  });
  it("rechecks the account after preparation", async () => {
    mocks.getAddresses.mockResolvedValue([
      "0x2222222222222222222222222222222222222222",
    ]);
    const { result } = setup();
    await act(async () => {
      await result.current.send(defaultDeployment!.openFundAddress, "0x1234");
    });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("keeps user rejection distinct from receipt confirmation", async () => {
    mocks.send.mockRejectedValue(Error("4001 User rejected"));
    const { result } = setup();
    await act(async () => {
      await result.current.send(defaultDeployment!.openFundAddress, "0x1234");
    });
    expect(result.current.state.stage).toBe("Rejected");
    expect(mocks.wait).not.toHaveBeenCalled();
  });
  it("prevents simultaneous duplicate signatures", async () => {
    let release!: (value: unknown) => void;
    mocks.wait.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const { result } = setup();
    let pending!: ReturnType<typeof result.current.send>;
    await act(async () => {
      pending = result.current.send(
        defaultDeployment!.openFundAddress,
        "0x1234",
      );
      await result.current.send(defaultDeployment!.openFundAddress, "0x1234");
    });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(result.current.state.stage).toBe("Pending");
    await act(async () => {
      release(receipt);
      await pending;
    });
    expect(result.current.state.stage).toBe("Confirmed");
  });
  it("never reports success for a reverted receipt", async () => {
    mocks.wait.mockResolvedValue({ ...receipt, status: "reverted" });
    const { result } = setup();
    await act(async () => {
      await result.current.send(defaultDeployment!.openFundAddress, "0x1234");
    });
    expect(result.current.state.stage).toBe("Reverted");
    expect(result.current.state.receipt).toBeUndefined();
    expect(mocks.toast).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "success" }),
    );
  });
});
