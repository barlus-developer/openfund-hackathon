import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { decodeFunctionData, zeroHash, type Hex } from "viem";
import { Reports } from "../src/features/reports/Reports";
import { LanguageProvider } from "../src/app/i18n";
import { defaultDeployment } from "../src/web3/deployments";
import { openFundAbi } from "../src/web3/generated/OpenFund";
const state = vi.hoisted(() => ({
  send: vi.fn(),
  read: vi.fn(),
  manager: "0x1111111111111111111111111111111111111111",
}));
const digest = `0x${"11".repeat(32)}` as Hex;
vi.mock("wagmi", () => ({
  useConnection: () => ({ address: state.manager, chainId: 31337 }),
}));
vi.mock("../src/features/funds/FundLayout", () => ({
  useFundContext: () => ({
    d: defaultDeployment,
    row: { id: 1n, fund: { manager: state.manager } },
    manager: true,
  }),
}));
vi.mock("../src/hooks/useTransaction", () => ({
  useTransaction: () => ({ send: state.send, state: {}, busy: false }),
}));
vi.mock("../src/hooks/useActivity", () => ({
  useActivity: () => ({ events: [], refetch: vi.fn() }),
}));
vi.mock("../src/web3/deployments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/web3/deployments")>()),
  clientFor: () => ({ readContract: state.read }),
}));
vi.mock("../src/features/reports/IPFSUpload", () => ({
  IPFSUpload: ({ onHash }: { onHash: (value: Hex) => void }) => (
    <button onClick={() => onHash(digest)}>Select replacement document</button>
  ),
}));
function show() {
  render(
    <LanguageProvider>
      <MemoryRouter>
        <Reports />
      </MemoryRouter>
    </LanguageProvider>,
  );
}
function fill(hash: string = digest) {
  fireEvent.change(screen.getByLabelText("ຫົວຂໍ້ລາຍງານ"), {
    target: { value: "Books receipt" },
  });
  fireEvent.change(screen.getByLabelText("ລິ້ງ ຫຼືລະຫັດເອກະສານ IPFS"), {
    target: { value: "https://example.org/report" },
  });
  fireEvent.change(screen.getByLabelText("ລະຫັດຢືນຢັນເອກະສານ"), {
    target: { value: hash },
  });
}
beforeEach(() => {
  vi.clearAllMocks();
});
describe("report publication", () => {
  it("rejects blank titles and zero digests before signing", () => {
    show();
    fill(zeroHash);
    fireEvent.change(screen.getByLabelText("ຫົວຂໍ້ລາຍງານ"), {
      target: { value: " " },
    });
    fireEvent.click(screen.getByRole("button", { name: /ເຜີຍແຜ່ລາຍງານ/ }));
    expect(screen.getByLabelText("ຫົວຂໍ້ລາຍງານ")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("ລະຫັດຢືນຢັນເອກະສານ")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(state.send).not.toHaveBeenCalled();
  });
  it("clears the previous URI when a replacement file digest is selected", () => {
    show();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "ອັບໂຫຼດເອກະສານໃໝ່" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Select replacement document" }),
    );
    expect(screen.getByLabelText("ລິ້ງ ຫຼືລະຫັດເອກະສານ IPFS")).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: /ເຜີຍແຜ່ລາຍງານ/ }));
    expect(state.send).not.toHaveBeenCalled();
  });
  it("checks that a linked payout belongs to this fund and has executed", async () => {
    state.read.mockResolvedValue([
      { fundId: 2n, executed: true, action: { kind: 0 } },
    ]);
    show();
    fill();
    fireEvent.change(screen.getByLabelText(/ໝາຍເລກການຈ່າຍເງິນ/), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /ເຜີຍແຜ່ລາຍງານ/ }));
    await screen.findByRole("alert");
    expect(state.send).not.toHaveBeenCalled();
  });
  it("encodes a general report with the chosen URI and digest", async () => {
    show();
    fill();
    fireEvent.click(screen.getByRole("button", { name: /ເຜີຍແຜ່ລາຍງານ/ }));
    await waitFor(() => expect(state.send).toHaveBeenCalledOnce());
    const call = decodeFunctionData({
      abi: openFundAbi,
      data: state.send.mock.calls[0][1],
    });
    expect(call.functionName).toBe("publishReport");
    expect(call.args).toEqual([
      1n,
      0n,
      "Books receipt",
      "https://example.org/report",
      digest,
    ]);
  });
});
