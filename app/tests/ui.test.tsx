import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Connect } from "../src/features/wallet/Connect";
import { LanguageProvider } from "../src/app/i18n";
import { TxFeedback, EmptyState } from "../src/components/common";
import { defaultDeployment } from "../src/web3/deployments";
const mocks = vi.hoisted(() => ({
  connection: {
    isConnected: false,
    address: undefined as string | undefined,
    chainId: 1,
  },
  connect: vi.fn(),
  switch: vi.fn(),
  disconnect: vi.fn(),
  error: null as Error | null,
}));
vi.mock("wagmi", () => ({
  useConnection: () => mocks.connection,
  useConnect: () => ({ mutate: mocks.connect, error: mocks.error }),
  useConnectors: () => [{ id: "metaMaskSDK" }],
  useDisconnect: () => ({ mutate: mocks.disconnect }),
  useSwitchChain: () => ({ mutate: mocks.switch }),
}));
function wrapper(children: React.ReactNode) {
  return (
    <LanguageProvider>
      <MemoryRouter>{children}</MemoryRouter>
    </LanguageProvider>
  );
}
describe("wallet and feedback presentation", () => {
  it("uses the real connector mutation", () => {
    mocks.connection.isConnected = false;
    render(wrapper(<Connect />));
    fireEvent.click(screen.getByRole("button", { name: /MetaMask/ }));
    expect(mocks.connect).toHaveBeenCalledWith(
      expect.objectContaining({ connector: { id: "metaMaskSDK" } }),
    );
  });
  it("shows network switch from actual wrong-chain response", () => {
    mocks.connection = {
      isConnected: true,
      address: "0x1111111111111111111111111111111111111111",
      chainId: 1,
    };
    render(wrapper(<Connect chainId={31337} />));
    fireEvent.click(
      screen
        .getAllByRole("button")
        .find(
          (b) =>
            b.textContent?.includes("ເຄືອຂ່າຍ") ||
            b.textContent?.includes("Wrong chain"),
        )!,
    );
    expect(mocks.switch).toHaveBeenCalledWith({ chainId: 31337 });
  });
  it("shows wallet rejection errors", () => {
    mocks.connection.isConnected = false;
    mocks.error = Error("4001 rejected");
    render(wrapper(<Connect />));
    expect(screen.getByText(/Wallet request rejected/)).toBeInTheDocument();
    mocks.error = null;
  });
  it("distinguishes pending from confirmation", () => {
    render(
      wrapper(
        <TxFeedback
          state={{
            stage: "Pending",
            hash: ("0x" + "01".repeat(32)) as `0x${string}`,
          }}
          d={defaultDeployment!}
        />,
      ),
    );
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.queryByText("Confirmed")).not.toBeInTheDocument();
  });
  it("renders an explicit no-refund empty state", () => {
    render(
      wrapper(
        <EmptyState description="KEEP_FUNDS and CONTINUOUS have no automatic refund entitlement." />,
      ),
    );
    expect(
      screen.getByText(/no automatic refund entitlement/),
    ).toBeInTheDocument();
  });
});
