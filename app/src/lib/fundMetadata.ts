import { useQuery } from "@tanstack/react-query";
import { keccak256, zeroHash } from "viem";
import { contentURL, MAX_DOCUMENT_BYTES } from "./ipfs";

export const MAX_DESCRIPTION_IMAGES = 12;
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif";
export type FundImage = {
  uri: string;
  width?: number;
  height?: number;
  caption?: string;
};
export type FundImages = {
  coverImage?: FundImage;
  descriptionImages: FundImage[];
};
export type FundMetadata = Record<string, unknown>;

export function imageURL(uri: string) {
  const url = new URL(contentURL(uri));
  if (url.username || url.password) throw Error("Invalid image reference.");
  return url.href;
}

function imageReference(value: unknown): FundImage | undefined {
  if (!value || typeof value !== "object") return;
  const image = value as Record<string, unknown>;
  if (typeof image.uri !== "string" || image.uri.length > 2000) return;
  try {
    imageURL(image.uri);
  } catch {
    return;
  }
  const dimension = (v: unknown) =>
    typeof v === "number" && Number.isInteger(v) && v > 0 && v <= 32000
      ? v
      : undefined;
  return {
    uri: image.uri,
    width: dimension(image.width),
    height: dimension(image.height),
    caption:
      typeof image.caption === "string"
        ? image.caption.slice(0, 300)
        : undefined,
  };
}

// Older funds and third-party metadata can omit every image field.
export function metadataImages(metadata?: FundMetadata): FundImages {
  return {
    coverImage: imageReference(metadata?.coverImage),
    descriptionImages: Array.isArray(metadata?.descriptionImages)
      ? metadata.descriptionImages
          .slice(0, MAX_DESCRIPTION_IMAGES)
          .map(imageReference)
          .filter((image): image is FundImage => !!image)
      : [],
  };
}

export const metadataKey = (uri: string, hash?: string) => [
  "fund-metadata",
  uri,
  hash || zeroHash,
];

export async function readFundMetadata(
  uri: string,
  hash?: string,
  signal?: AbortSignal,
): Promise<FundMetadata> {
  const response = await fetch(contentURL(uri), {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  const limit = 256_000;
  if (!response.ok) throw Error("ບໍ່ສາມາດໂຫຼດຂໍ້ມູນຮູບພາບໄດ້. ກະລຸນາລອງໃໝ່.");
  if (Number(response.headers.get("content-length")) > limit)
    throw Error("ຂໍ້ມູນຮູບພາບມີຂະໜາດໃຫຍ່ເກີນໄປ.");
  const reader = response.body?.getReader();
  if (!reader) throw Error("ບໍ່ສາມາດອ່ານຂໍ້ມູນຮູບພາບໄດ້.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) throw Error("ຂໍ້ມູນຮູບພາບມີຂະໜາດໃຫຍ່ເກີນໄປ.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  if (
    hash &&
    hash !== zeroHash &&
    keccak256(bytes).toLowerCase() !== hash.toLowerCase()
  )
    throw Error("ຂໍ້ມູນຮູບພາບບໍ່ກົງກັບລະຫັດຢືນຢັນທີ່ບັນທຶກໄວ້.");
  let metadata: unknown;
  try {
    metadata = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw Error("ລິ້ງນີ້ບໍ່ແມ່ນຂໍ້ມູນ JSON. ກະລຸນາໃຊ້ລິ້ງຂໍ້ມູນກອງທຶນ.");
  }
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    throw Error("ຮູບແບບຂໍ້ມູນກອງທຶນບໍ່ຖືກຕ້ອງ.");
  return metadata as FundMetadata;
}

export function useFundMetadata(uri: string = "", hash?: string) {
  return useQuery({
    queryKey: metadataKey(uri, hash),
    enabled: !!uri.trim(),
    queryFn: ({ signal }) => readFundMetadata(uri, hash, signal),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

// Validate both the declared type and the decoded bytes, strip EXIF, and limit delivery size.
export async function prepareFundImage(file: File) {
  if (!IMAGE_ACCEPT.split(",").includes(file.type))
    throw Error("ຮອງຮັບສະເພາະ JPEG, PNG, WebP ແລະ AVIF.");
  if (!file.size || file.size > MAX_DOCUMENT_BYTES)
    throw Error("ກະລຸນາເລືອກຮູບພາບບໍ່ເກີນ 5 MB.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw Error("ບໍ່ສາມາດອ່ານຮູບພາບນີ້ໄດ້. ກະລຸນາເລືອກໄຟລ໌ໃໝ່.");
  }
  try {
    if (bitmap.width * bitmap.height > 32_000_000)
      throw Error("ກະລຸນາຫຍໍ້ຮູບພາບໃຫ້ບໍ່ເກີນ 32 ລ້ານພິກເຊວ.");
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw Error("ບໍ່ສາມາດກຽມຮູບພາບໄດ້.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(Error("ບໍ່ສາມາດກຽມຮູບພາບໄດ້.")),
        "image/webp",
        0.84,
      ),
    );
    if (blob.size > MAX_DOCUMENT_BYTES)
      throw Error("ກະລຸນາເລືອກຮູບພາບຂະໜາດນ້ອຍລົງ.");
    return {
      file: new File(
        [blob],
        `fund-image.${blob.type === "image/webp" ? "webp" : "png"}`,
        { type: blob.type },
      ),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    bitmap.close();
  }
}
