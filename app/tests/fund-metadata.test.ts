import { afterEach, describe, expect, it, vi } from "vitest";
import { keccak256, stringToBytes, zeroHash } from "viem";
import {
  imageURL,
  metadataImages,
  prepareFundImage,
  readFundMetadata,
} from "../src/lib/fundMetadata";

afterEach(() => vi.unstubAllGlobals());

describe("fund image metadata compatibility and integrity", () => {
  it("keeps legacy metadata usable and ignores unsafe or malformed image references", () => {
    expect(metadataImages({ description: "Existing project" })).toEqual({
      coverImage: undefined,
      descriptionImages: [],
    });
    expect(
      metadataImages({
        coverImage: { uri: "javascript:alert(1)" },
        descriptionImages: [
          {
            uri: "https://images.example.org/classroom.webp",
            caption: "New classroom",
            width: 1200,
            height: 800,
          },
          { uri: "data:image/svg+xml,invalid" },
          null,
        ],
      }),
    ).toEqual({
      coverImage: undefined,
      descriptionImages: [
        {
          uri: "https://images.example.org/classroom.webp",
          caption: "New classroom",
          width: 1200,
          height: 800,
        },
      ],
    });
    expect(() =>
      imageURL("https://user:secret@images.example.org/photo.jpg"),
    ).toThrow();
  });

  it("verifies the exact metadata bytes and preserves existing project fields", async () => {
    const json = JSON.stringify({
      description: "Original story",
      external_url: "https://example.org",
      coverImage: {
        uri: "ipfs://bafkreigh2akiscaildc6zze3ukwl7r3oyvwj7wzsyqzkzpm7oks4bkx4jy",
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => new Response(json)),
    );
    expect(
      await readFundMetadata(
        "https://example.org/project.json",
        keccak256(stringToBytes(json)),
      ),
    ).toEqual(JSON.parse(json));
    await expect(
      readFundMetadata(
        "https://example.org/project.json",
        `0x${"01".repeat(32)}`,
      ),
    ).rejects.toThrow("ລະຫັດຢືນຢັນ");
    expect(
      await readFundMetadata("https://example.org/project.json", zeroHash),
    ).toHaveProperty("description", "Original story");
  });

  it("limits streamed metadata even without a content-length header", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("x".repeat(256_001))),
    );
    await expect(
      readFundMetadata("https://example.org/project.json"),
    ).rejects.toThrow("ຂະໜາດ");
  });

  it("rejects unsupported and oversized files before decoding or uploading", async () => {
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);
    await expect(
      prepareFundImage(
        new File(["<svg/>"], "unsafe.svg", { type: "image/svg+xml" }),
      ),
    ).rejects.toThrow("JPEG");
    const large = Object.defineProperty(
      new File(["png"], "large.png", { type: "image/png" }),
      "size",
      { value: 5_000_001 },
    );
    await expect(prepareFundImage(large)).rejects.toThrow("5 MB");
    expect(decode).not.toHaveBeenCalled();
  });
});
