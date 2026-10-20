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
    expect(screen.getByText(/ຍົກເລີກຄຳຂໍ/)).toBeInTheDocument();
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
    expect(screen.getByText("ກຳລັງລໍຖ້າຢືນຢັນ")).toBeInTheDocument();
    expect(screen.queryByText("ຢືນຢັນສຳເລັດ")).not.toBeInTheDocument();
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
  it("marks network confirmation as current without claiming it is complete", () => {
    render(
      wrapper(
        <TxFeedback state={{ stage: "Pending" }} d={defaultDeployment!} />,
      ),
    );
    const steps = screen.getByRole("list", { name: "ຂັ້ນຕອນລາຍການ" });
    expect(steps.children[0]).toHaveAttribute("data-complete", "true");
    expect(steps.children[1]).toHaveAttribute("data-complete", "true");
    expect(steps.children[2]).toHaveAttribute("aria-current", "step");
    expect(steps.children[2]).toHaveAttribute("data-complete", "false");
  });
  it("only completes every step after confirmation", () => {
    render(
      wrapper(
        <TxFeedback state={{ stage: "Confirmed" }} d={defaultDeployment!} />,
      ),
    );
    const steps = screen.getByRole("list", { name: "ຂັ້ນຕອນລາຍການ" });
    expect(
      [...steps.children].every(
        (step) => step.getAttribute("data-complete") === "true",
      ),
    ).toBe(true);
    expect(steps.querySelector('[aria-current="step"]')).toBeNull();
  });
  it("shows a rejected transaction as an error without a completed timeline", () => {
    render(
      wrapper(
        <TxFeedback state={{ stage: "Rejected" }} d={defaultDeployment!} />,
      ),
    );
    expect(screen.getByRole("alert")).toBeVisible();
    expect(
      screen.queryByRole("list", { name: "ຂັ້ນຕອນລາຍການ" }),
    ).not.toBeInTheDocument();
  });
});
