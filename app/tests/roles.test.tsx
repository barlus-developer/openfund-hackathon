import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../src/app/i18n";
import { Manage } from "../src/features/governance/Manage";
import { defaultDeployment } from "../src/web3/deployments";
const state = vi.hoisted(() => ({
  address: "0x1111111111111111111111111111111111111111",
  manager: "0x2222222222222222222222222222222222222222",
  approvers: [] as string[],
  refund: 0n,
  send: vi.fn(),
}));
vi.mock("wagmi", () => ({
  useConnection: () => ({
    address: state.address,
    chainId: 31337,
    isConnected: true,
  }),
  useConnect: () => ({ mutate: vi.fn() }),
  useConnectors: () => [],
  useDisconnect: () => ({ mutate: vi.fn() }),
  useSwitchChain: () => ({ mutate: vi.fn() }),
}));
vi.mock("../src/hooks/useTransaction", () => ({
  useTransaction: () => ({ send: state.send, state: {}, busy: false }),
}));
vi.mock("../src/features/funds/FundLayout", () => ({
  useFundContext: () => ({
    d: defaultDeployment,
    row: {
      id: 1n,
      status: 1,
      approvers: state.approvers,
      fund: {
        manager: state.manager,
        balance: 100n,
        metadataURI: "",
        config: { minimumApprovalThreshold: 1, recipientPolicy: 0 },
        governanceVersion: 1n,
      },
    },
  }),
}));
const show = () =>
  render(
    <LanguageProvider>
      <MemoryRouter>
        <Manage />
      </MemoryRouter>
    </LanguageProvider>,
  );
describe("permissions derive from contract role responses", () => {
  it("disables proposal submission for a nonmember wallet", () => {
    state.approvers = [];
    state.manager = "0x2222222222222222222222222222222222222222";
    show();
    expect(
      screen.getByRole("button", { name: /Submit proposal/ }),
    ).toBeDisabled();
  });
  it("offers existing-threshold recovery to a current approver", () => {
    state.approvers = [state.address];
    show();
    expect(
      screen.getByRole("button", { name: /Submit proposal/ }),
    ).toBeEnabled();
    expect(
      screen.getByRole("combobox", { name: "Closed action type" }),
    ).toHaveValue("1");
    expect(
      screen.queryByRole("option", { name: "PAYOUT" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "CHANGE_MANAGER" }),
    ).toBeInTheDocument();
  });
  it("enables the manager action engine without recipient-policy shortcuts", () => {
    state.approvers = [];
    state.manager = state.address;
    show();
    expect(screen.getByRole("option", { name: "PAYOUT" })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "ADD_RECIPIENT" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Update presentation URI" }),
    ).toBeEnabled();
    fireEvent.change(
      screen.getByRole("combobox", { name: "Closed action type" }),
      { target: { value: "7" } },
    );
    expect(
      screen.getByText(/Starting closure permanently halts/),
    ).toBeInTheDocument();
  });
});
