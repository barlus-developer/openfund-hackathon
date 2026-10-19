import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";
import { stringToBytes } from "viem";
import { IPFSUpload } from "../src/features/reports/IPFSUpload";

afterEach(() => vi.unstubAllGlobals());
describe("report publishing UI", () => {
  it("uploads selected bytes to a real-protocol endpoint and clears session authorization", async () => {
    const cid = "bafkreigh2akiscaildc6zze3ukwl7r3oyvwj7wzsyqzkzpm7oks4bkx4jy";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ Hash: cid }))),
    );
    const uploaded = vi.fn();
    render(<IPFSUpload onHash={vi.fn()} onUploaded={uploaded} />);
    const file = Object.assign(new File(["evidence"], "evidence.txt"), {
      arrayBuffer: async () => stringToBytes("evidence").buffer,
    });
    fireEvent.change(screen.getByLabelText(/Public document/), {
      target: { files: [file] },
    });
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("IPFS API endpoint"),
      "https://ipfs.example.org",
    );
    const credential = screen.getByLabelText(/Authorization header/);
    await user.type(credential, "Bearer session-token");
    await user.click(screen.getByRole("button", { name: /Upload to IPFS/ }));
    await waitFor(() =>
      expect(uploaded).toHaveBeenCalledWith(
        `ipfs://${cid}`,
        expect.stringMatching(/^0x[0-9a-f]{64}$/),
      ),
    );
    expect(credential).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Publish the reference below",
    );
  });
  it("requires a selected file and handles an invalid replacement without uploading the old file", async () => {
    render(<IPFSUpload onHash={vi.fn()} onUploaded={vi.fn()} />);
    const button = screen.getByRole("button", { name: /Upload to IPFS/ });
    expect(button).toBeDisabled();
    const file = Object.assign(new File(["evidence"], "evidence.txt"), {
      arrayBuffer: async () => stringToBytes("evidence").buffer,
    });
    fireEvent.change(screen.getByLabelText(/Public document/), {
      target: { files: [file] },
    });
    await userEvent.type(
      screen.getByLabelText("IPFS API endpoint"),
      "https://ipfs.example.org",
    );
    await waitFor(() => expect(button).toBeEnabled());
    const tooLarge = Object.defineProperty(file, "size", { value: 5_000_001 });
    fireEvent.change(screen.getByLabelText(/Public document/), {
      target: { files: [tooLarge] },
    });
    expect(button).toBeDisabled();
    expect(screen.getByText("Choose a document up to 5 MB.")).toBeVisible();
  });
});
