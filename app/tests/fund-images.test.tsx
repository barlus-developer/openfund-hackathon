import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { zeroHash } from "viem";
import { FundImageManager } from "../src/features/funds/FundImageManager";
import { ImageGallery, ProjectImage } from "../src/features/funds/FundImages";
import { metadataKey } from "../src/lib/fundMetadata";
import { LanguageProvider } from "../src/app/i18n";

const upload = vi.hoisted(() => vi.fn());
const prepare = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/fundMetadata", async (original) => ({
  ...(await original<typeof import("../src/lib/fundMetadata")>()),
  prepareFundImage: prepare,
}));
vi.mock("../src/lib/ipfs", async (original) => ({
  ...(await original<typeof import("../src/lib/ipfs")>()),
  uploadIPFS: upload,
}));
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
const uri = "https://example.org/fund.json";
const images = [
  {
    uri: "https://example.org/a.webp",
    width: 1200,
    height: 800,
    caption: "Classroom",
  },
  {
    uri: "https://example.org/b.webp",
    width: 800,
    height: 1200,
    caption: "School supplies",
  },
];

describe("fund image management and donor gallery", () => {
  it("retains new image previews on failure and reuses completed uploads when retried", async () => {
    const NativeURL = URL;
    vi.stubGlobal(
      "URL",
      class extends NativeURL {
        static createObjectURL() {
          return `blob:${crypto.randomUUID()}`;
        }
        static revokeObjectURL() {}
      },
    );
    prepare.mockImplementation(async (file: File) => ({
      file,
      width: 1200,
      height: 800,
    }));
    const queryClient = new QueryClient();
    const published = vi.fn();
    const coverURI = "ipfs://cover";
    const galleryURI = "ipfs://gallery";
    upload
      .mockResolvedValueOnce({ uri: coverURI, hash: zeroHash })
      .mockRejectedValueOnce(Error("IPFS upload failed"))
      .mockResolvedValueOnce({ uri: galleryURI, hash: zeroHash })
      .mockResolvedValueOnce({ uri: "ipfs://metadata", hash: zeroHash });
    render(
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <FundImageManager metadataURI="" onPublished={published} />
        </QueryClientProvider>
      </LanguageProvider>,
    );
    fireEvent.change(screen.getByLabelText("ຮູບໜ້າປົກ"), {
      target: {
        files: [new File(["cover"], "cover.png", { type: "image/png" })],
      },
    });
    await waitFor(() =>
      expect(screen.getByLabelText("ຮູບໜ້າປົກ")).toBeEnabled(),
    );
    fireEvent.change(screen.getByLabelText(/ຮູບປະກອບ \(/), {
      target: {
        files: [new File(["gallery"], "gallery.png", { type: "image/png" })],
      },
    });
    await screen.findByLabelText("ຄຳບັນຍາຍຮູບ 1 (ຖ້າມີ)");
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("ທີ່ຢູ່ບໍລິການ IPFS"),
      "https://ipfs.example.org",
    );
    await user.click(screen.getByRole("button", { name: "ອັບໂຫຼດຮູບພາບ" }));
    await screen.findByRole("alert");
    expect(published).not.toHaveBeenCalled();
    expect(screen.getByAltText("ຕົວຢ່າງຮູບໜ້າປົກ").getAttribute("src")).toMatch(
      /^blob:/,
    );
    await user.click(screen.getByRole("button", { name: "ອັບໂຫຼດຮູບພາບ" }));
    await waitFor(() =>
      expect(published).toHaveBeenCalledWith("ipfs://metadata", zeroHash),
    );
    expect(upload.mock.calls.map(([file]) => (file as File).name)).toEqual([
      "cover.png",
      "gallery.png",
      "gallery.png",
      "fund-metadata.json",
    ]);
  });
  it("publishes reordered captions and removals while retaining existing metadata", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(metadataKey(uri), {
      description: "Existing project story",
      custom: { retained: true },
      coverImage: images[0],
      descriptionImages: images,
    });
    const published = vi.fn();
    upload.mockResolvedValue({
      uri: "ipfs://bafkreigh2akiscaildc6zze3ukwl7r3oyvwj7wzsyqzkzpm7oks4bkx4jy",
      hash: zeroHash,
    });
    render(
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <FundImageManager metadataURI={uri} onPublished={published} />
        </QueryClientProvider>
      </LanguageProvider>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "ຍ້າຍຮູບ 2 ຂຶ້ນ" }));
    fireEvent.change(screen.getByLabelText("ຄຳບັນຍາຍຮູບ 1 (ຖ້າມີ)"), {
      target: { value: "Donated school supplies" },
    });
    await user.click(screen.getByRole("button", { name: "ລຶບຮູບໜ້າປົກ" }));
    await user.click(screen.getByRole("button", { name: "ລຶບຮູບ 2" }));
    await user.type(
      screen.getByLabelText("ທີ່ຢູ່ບໍລິການ IPFS"),
      "https://ipfs.example.org",
    );
    await user.click(screen.getByRole("button", { name: "ອັບໂຫຼດຮູບພາບ" }));
    await waitFor(() => expect(published).toHaveBeenCalled());
    expect(upload).toHaveBeenCalledTimes(1); // Unchanged images are reused; only the JSON is uploaded.
    const file = upload.mock.calls[0][0] as File;
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(file);
    });
    expect(JSON.parse(text)).toMatchObject({
      description: "Existing project story",
      custom: { retained: true },
      coverImage: null,
      descriptionImages: [{ ...images[1], caption: "Donated school supplies" }],
    });
    expect(text).not.toContain("preview");
  });

  it("opens a keyboard accessible preview, navigates, and restores focus on Escape", async () => {
    render(<ImageGallery images={images} title="Community school" />);
    const user = userEvent.setup();
    const trigger = screen.getByRole("button", { name: /ເບິ່ງຮູບພາບ 1/ });
    await user.click(trigger);
    expect(
      screen.getByRole("dialog", { name: "Community school" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "ຕໍ່ໄປ" }));
    expect(screen.getByRole("button", { name: "ຕໍ່ໄປ" })).toBeDisabled();
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
  });

  it("replaces a failed image with a labeled placeholder", () => {
    render(
      <ProjectImage
        image={images[0]}
        alt="Classroom"
        className="aspect-video"
      />,
    );
    fireEvent.error(screen.getByAltText("Classroom"));
    expect(
      screen.getByRole("img", { name: "ບໍ່ສາມາດໂຫຼດຮູບພາບໄດ້" }),
    ).toBeVisible();
  });
});
