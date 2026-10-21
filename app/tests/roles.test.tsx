import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../src/app/i18n";
import { FundSettings } from "../src/features/funds/FundSettings";
import { Manage } from "../src/features/governance/Manage";
import { defaultDeployment } from "../src/web3/deployments";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const state = vi.hoisted(() => ({
  address: "0x1111111111111111111111111111111111111111",
  manager: "0x2222222222222222222222222222222222222222",
  approvers: [] as string[],
  refund: 0n,
  status: 1,
  chainId: 31337,
  metadataURI: "",
  send: vi.fn(),
}));
vi.mock("wagmi", () => ({
  useConnection: () => ({
    address: state.address,
    chainId: state.chainId,
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
      status: state.status,
      approvers: state.approvers,
      fund: {
        manager: state.manager,
        balance: 100n,
        metadataURI: state.metadataURI,
        metadataHash: "0x" + "00".repeat(32),
        threshold: 1,
        config: { minimumApprovalThreshold: 1, recipientPolicy: 0 },
        governanceVersion: 1n,
      },
    },
  }),
}));
const show = (settingsOnly = false) =>
  render(
    <LanguageProvider>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          {settingsOnly ? <FundSettings /> : <Manage />}
        </MemoryRouter>
      </QueryClientProvider>
    </LanguageProvider>,
  );
describe("permissions derive from contract role responses", () => {
  beforeEach(() => {
    state.status = 1;
    state.chainId = 31337;
    state.metadataURI = "";
    state.manager = "0x2222222222222222222222222222222222222222";
    state.approvers = [];
    state.send.mockReset();
  });
  it("disables proposal submission for a nonmember wallet", () => {
    state.approvers = [];
    state.manager = "0x2222222222222222222222222222222222222222";
    show();
    expect(
      screen.queryByRole("button", { name: /ສົ່ງຂໍ້ສະເໜີ/ }),
    ).not.toBeInTheDocument();
  });
  it("offers existing-threshold recovery to a current approver", () => {
    state.approvers = [state.address];
    show();
    expect(screen.getByRole("button", { name: /ສົ່ງຂໍ້ສະເໜີ/ })).toBeEnabled();
    expect(
      screen.getByRole("combobox", { name: "ສິ່ງທີ່ຕ້ອງການສະເໜີ" }),
    ).toHaveValue("1");
    expect(
      screen.queryByRole("option", { name: "ຈ່າຍເງິນ" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "ປ່ຽນຜູ້ຈັດການ" }),
    ).toBeInTheDocument();
  });
  it("enables the manager action engine without recipient-policy shortcuts", () => {
    state.approvers = [];
    state.manager = state.address;
    show();
    expect(screen.getByLabelText("ທີ່ຢູ່ຜູ້ຮັບ")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "ລາຍຊື່ຜູ້ຮັບ" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "ປິດກອງທຶນ" }));
    expect(screen.getByText(/ການເລີ່ມປິດຈະຢຸດ/)).toBeInTheDocument();
  });
  it("exposes metadata editing in project settings for the manager", () => {
    state.manager = state.address;
    show(true);
    expect(
      screen.getByRole("button", { name: "ບັນທຶກຂໍ້ມູນ ແລະຮູບພາບ" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: /ສົ່ງຂໍ້ສະເໜີ/ }),
    ).not.toBeInTheDocument();
  });
  it("keeps metadata editing disabled for other wallets", () => {
    state.manager = "0x2222222222222222222222222222222222222222";
    show(true);
    expect(
      screen.getByRole("button", { name: "ບັນທຶກຂໍ້ມູນ ແລະຮູບພາບ" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("ຮູບໜ້າປົກ")).toBeDisabled();
    expect(screen.getByLabelText("ລິ້ງຂໍ້ມູນເພີ່ມເຕີມ")).toBeDisabled();
  });
  it.each([2, 4])("does not invent a payout form for status %i", (status) => {
    state.manager = state.address;
    state.status = status;
    show();
    expect(
      screen.queryByRole("button", { name: /ສົ່ງຂໍ້ສະເໜີ/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("ຈຳນວນ OFL")).not.toBeInTheDocument();
  });
  it("disables submission on the wrong chain", () => {
    state.manager = state.address;
    state.chainId = 1;
    show();
    expect(screen.getByRole("button", { name: /ສົ່ງຂໍ້ສະເໜີ/ })).toBeDisabled();
  });
  it("does not sign invalid proposal fields", () => {
    state.manager = state.address;
    show();
    fireEvent.click(screen.getByRole("button", { name: /ສົ່ງຂໍ້ສະເໜີ/ }));
    expect(screen.getByLabelText("ທີ່ຢູ່ຜູ້ຮັບ")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("ຈຳນວນ OFL")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(state.send).not.toHaveBeenCalled();
  });
  it("resets metadata when the canonical record changes", () => {
    state.manager = state.address;
    const view = show(true);
    state.metadataURI = "https://example.com/updated.json";
    view.rerender(
      <LanguageProvider>
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter>
            <FundSettings />
          </MemoryRouter>
        </QueryClientProvider>
      </LanguageProvider>,
    );
    expect(screen.getByLabelText("ລິ້ງຂໍ້ມູນເພີ່ມເຕີມ")).toHaveValue(
      state.metadataURI,
    );
  });
});
