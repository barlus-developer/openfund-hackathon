import { useEffect, useId, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Upload, Trash2, HardDrive, X } from "lucide-react";
import { type Hex } from "viem";
import { appConfig } from "@/config";
import { Disclosure } from "@/components/patterns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { ErrorNotice, SelectField, TextField } from "@/components/common";
import { uploadIPFS, type IPFSPublisher } from "@/lib/ipfs";
import {
  IMAGE_ACCEPT,
  MAX_DESCRIPTION_IMAGES,
  metadataImages,
  metadataKey,
  prepareFundImage,
  useFundMetadata,
  type FundImage,
  type FundMetadata,
} from "@/lib/fundMetadata";
import { ProjectImage } from "./FundImages";

type EditableImage = FundImage & { id: string; file?: File; preview?: string };
type Props = {
  metadataURI: string;
  metadataHash?: string;
  disabled?: boolean;
  onPublished: (uri: string, hash: Hex) => void;
  onPendingChange?: (pending: boolean) => void;
};

export function FundImageManager(props: Props) {
  const query = useFundMetadata(props.metadataURI, props.metadataHash);
  if (query.isLoading)
    return (
      <p role="status" className="flex items-center gap-2 text-sm">
        <Spinner />
        ກຳລັງໂຫຼດຮູບພາບ…
      </p>
    );
  if (query.error)
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorNotice error={query.error} />
        <Button
          variant="outline"
          disabled={query.isFetching || props.disabled}
          onClick={() => query.refetch()}
        >
          ໂຫຼດຂໍ້ມູນຮູບພາບໃໝ່
        </Button>
        <p className="text-sm text-muted-foreground">
          ກະລຸນາໂຫຼດຂໍ້ມູນເດີມໃຫ້ສຳເລັດກ່ອນແກ້ໄຂຮູບພາບ.
          ສາມາດແກ້ໄຂລິ້ງຂໍ້ມູນດ້ານເທິງໄດ້.
        </p>
      </div>
    );
  return (
    <ImageEditor
      key={`${props.metadataURI}:${props.metadataHash || ""}`}
      {...props}
      metadata={query.data || {}}
    />
  );
}

function ImageEditor({
  metadata,
  disabled,
  onPublished,
  onPendingChange,
}: Props & { metadata: FundMetadata }) {
  const initial = metadataImages(metadata);
  const editable = (image: FundImage): EditableImage => ({
    ...image,
    id: crypto.randomUUID(),
  });
  const [cover, setCover] = useState<EditableImage | undefined>(() =>
    initial.coverImage ? editable(initial.coverImage) : undefined,
  );
  const [gallery, setGallery] = useState<EditableImage[]>(() =>
    initial.descriptionImages.map(editable),
  );
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<unknown>();
  const [status, setStatus] = useState("");
  const [provider, setProvider] = useState("kubo");
  const [endpoint, setEndpoint] = useState(appConfig.ipfsAPI);
  const [authorization, setAuthorization] = useState("");
  const [signedURLs, setSignedURLs] = useState("");
  const request = useRef<AbortController | undefined>(undefined);
  const locked = useRef(false);
  const mounted = useRef(true);
  const previews = useRef(new Set<string>());
  const uploaded = useRef(new Map<string, string>());
  const queryClient = useQueryClient();
  const id = useId();
  useEffect(() => {
    onPendingChange?.(dirty || busy);
  }, [dirty, busy, onPendingChange]);
  useEffect(() => {
    mounted.current = true;
    const urls = previews.current;
    return () => {
      mounted.current = false;
      request.current?.abort();
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);
  const release = (image?: EditableImage) => {
    if (image?.preview) {
      URL.revokeObjectURL(image.preview);
      previews.current.delete(image.preview);
    }
  };
  async function select(files: File[], isCover: boolean) {
    if (!files.length || locked.current || disabled) return;
    if (!isCover && gallery.length + files.length > MAX_DESCRIPTION_IMAGES) {
      setError(Error(`ເພີ່ມຮູບປະກອບໄດ້ບໍ່ເກີນ ${MAX_DESCRIPTION_IMAGES} ຮູບ.`));
      return;
    }
    locked.current = true;
    setBusy(true);
    setError(undefined);
    setStatus("ກຳລັງກຽມຮູບພາບ…");
    const next: EditableImage[] = [];
    try {
      for (const file of files) {
        const prepared = await prepareFundImage(file);
        if (!mounted.current) return;
        const preview = URL.createObjectURL(prepared.file);
        previews.current.add(preview);
        next.push({
          ...prepared,
          uri: "",
          preview,
          id: crypto.randomUUID(),
          caption: "",
        });
      }
      if (isCover) {
        release(cover);
        setCover(next[0]);
      } else setGallery((images) => [...images, ...next]);
      setDirty(true);
      setStatus("ຮູບພາບພ້ອມແລ້ວ. ກົດອັບໂຫຼດຮູບພາບດ້ານລຸ່ມ.");
    } catch (error) {
      next.forEach(release);
      if (mounted.current) {
        setError(error);
        setStatus("");
      }
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function move(index: number, direction: number) {
    setGallery((images) => {
      const next = [...images];
      [next[index], next[index + direction]] = [
        next[index + direction],
        next[index],
      ];
      return next;
    });
    setDirty(true);
    setStatus(`ຍ້າຍຮູບພາບໄປຕຳແໜ່ງ ${index + direction + 1} ແລ້ວ.`);
  }
  async function publish() {
    if (locked.current || disabled) return;
    locked.current = true;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setUploading(true);
    setError(undefined);
    const urls = signedURLs
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter(Boolean);
    let urlIndex = 0;
    const pendingFiles = [cover, ...gallery].filter(
      (image) => image?.file && !uploaded.current.has(image.id),
    ).length;
    let completed = 0;
    function publisher(): IPFSPublisher {
      return provider === "pinata"
        ? { provider: "pinata", signedURL: urls[urlIndex++] }
        : { provider: "kubo", endpoint, authorization };
    }
    try {
      if (provider === "pinata" && urls.length < pendingFiles + 1)
        throw Error(
          `ກະລຸນາປ້ອນລິ້ງອັບໂຫຼດ Pinata ${pendingFiles + 1} ລິ້ງ: ໜຶ່ງລິ້ງຕໍ່ໄຟລ໌ ແລະໜຶ່ງລິ້ງສຳລັບຂໍ້ມູນ.`,
        );
      async function publishImage(image: EditableImage): Promise<FundImage> {
        let uri = uploaded.current.get(image.id) || image.uri;
        if (!uri && image.file) {
          setStatus(`ກຳລັງອັບໂຫຼດຮູບພາບ ${++completed} / ${pendingFiles}…`);
          uri = (await uploadIPFS(image.file, publisher(), controller.signal))
            .uri;
          uploaded.current.set(image.id, uri);
        }
        if (!uri) throw Error("ບໍ່ພົບໄຟລ໌ຮູບພາບ. ກະລຸນາເລືອກໃໝ່.");
        return {
          uri,
          width: image.width,
          height: image.height,
          caption: image.caption?.trim() || undefined,
        };
      }
      const nextCover = cover ? await publishImage(cover) : undefined;
      const nextGallery: FundImage[] = [];
      for (const image of gallery) nextGallery.push(await publishImage(image));
      const nextMetadata = {
        ...metadata,
        imageSchema: "openfund-images/1",
        coverImage: nextCover || null,
        descriptionImages: nextGallery,
      };
      const json = JSON.stringify(nextMetadata);
      if (new TextEncoder().encode(json).length > 256_000)
        throw Error("ຂໍ້ມູນຮູບພາບມີຂະໜາດໃຫຍ່ເກີນໄປ.");
      setStatus("ກຳລັງອັບໂຫຼດຂໍ້ມູນຮູບພາບ…");
      const result = await uploadIPFS(
        new File([json], "fund-metadata.json", { type: "application/json" }),
        publisher(),
        controller.signal,
      );
      if (!mounted.current) return;
      queryClient.setQueryData(
        metadataKey(result.uri, result.hash),
        nextMetadata,
      );
      queryClient.setQueryData(metadataKey(result.uri), nextMetadata);
      setDirty(false);
      onPendingChange?.(false);
      onPublished(result.uri, result.hash);
      setStatus("ອັບໂຫຼດແລ້ວ. ບັນທຶກກອງທຶນເພື່ອເຜີຍແຜ່ຮູບພາບ.");
    } catch (error) {
      if (mounted.current) {
        setError(
          controller.signal.aborted
            ? Error("ຍົກເລີກການອັບໂຫຼດແລ້ວ. ຮູບພາບຍັງຢູ່ ແລະສາມາດລອງໃໝ່ໄດ້.")
            : error,
        );
        setStatus("");
      }
    } finally {
      locked.current = false;
      request.current = undefined;
      if (mounted.current) {
        setBusy(false);
        setUploading(false);
        setAuthorization("");
        setSignedURLs("");
      }
    }
  }
  const unavailable = disabled || busy;
  return (
    <section
      className="flex min-w-0 flex-col gap-5"
      aria-labelledby={`${id}-title`}
      aria-busy={busy}
    >
      <div>
        <h2 id={`${id}-title`} className="font-semibold">
          ຮູບພາບກອງທຶນ
        </h2>
        <p className="mt-1 text-sm leading-7 text-muted-foreground">
          JPEG, PNG, WebP ຫຼື AVIF · ບໍ່ເກີນ 5 MB ຕໍ່ຮູບ.
          ຮູບພາບຈະຖືກຫຍໍ້ກ່ອນອັບໂຫຼດ.
        </p>
      </div>
      <fieldset disabled={unavailable} className="min-w-0">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${id}-cover`}>ຮູບໜ້າປົກ</FieldLabel>
            <ProjectImage
              image={cover}
              localURL={cover?.preview}
              alt="ຕົວຢ່າງຮູບໜ້າປົກ"
              className="aspect-video w-full rounded-xl"
            />
            <Input
              id={`${id}-cover`}
              type="file"
              accept={IMAGE_ACCEPT}
              onChange={(event) => {
                const files = Array.from(event.target.files || []);
                event.target.value = "";
                void select(files.slice(0, 1), true);
              }}
            />
            <FieldDescription>
              ສະແດງໃນອັດຕາສ່ວນ 16:9. ເລືອກຮູບໃໝ່ເພື່ອປ່ຽນຮູບໜ້າປົກ.
            </FieldDescription>
            {cover ? (
              <Button
                variant="outline"
                className="self-start"
                onClick={() => {
                  release(cover);
                  setCover(undefined);
                  setDirty(true);
                }}
              >
                <Trash2 data-icon="inline-start" aria-hidden="true" />
                ລຶບຮູບໜ້າປົກ
              </Button>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-gallery`}>
              ຮູບປະກອບ ({gallery.length}/{MAX_DESCRIPTION_IMAGES})
            </FieldLabel>
            <Input
              id={`${id}-gallery`}
              type="file"
              accept={IMAGE_ACCEPT}
              multiple
              disabled={unavailable || gallery.length >= MAX_DESCRIPTION_IMAGES}
              onChange={(event) => {
                const files = Array.from(event.target.files || []);
                event.target.value = "";
                void select(files, false);
              }}
            />
            <FieldDescription>
              ເລືອກໄດ້ຫຼາຍຮູບ. ໃຊ້ປຸ່ມຂຶ້ນ/ລົງເພື່ອຈັດລຳດັບ.
            </FieldDescription>
          </Field>
          <ol className="flex flex-col gap-4">
            {gallery.map((image, index) => (
              <li
                key={image.id}
                className="flex min-w-0 flex-col gap-3 rounded-xl border p-3 sm:flex-row"
              >
                <ProjectImage
                  image={image}
                  localURL={image.preview}
                  alt={image.caption || `ຮູບປະກອບ ${index + 1}`}
                  className="aspect-video w-full shrink-0 rounded-lg sm:w-36"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <Field>
                    <FieldLabel htmlFor={`${id}-${image.id}`}>
                      ຄຳບັນຍາຍຮູບ {index + 1} (ຖ້າມີ)
                    </FieldLabel>
                    <Input
                      id={`${id}-${image.id}`}
                      maxLength={300}
                      value={image.caption || ""}
                      onChange={(event) => {
                        setGallery((images) =>
                          images.map((item) =>
                            item.id === image.id
                              ? { ...item, caption: event.target.value }
                              : item,
                          ),
                        );
                        setDirty(true);
                      }}
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={unavailable || index === 0}
                      aria-label={`ຍ້າຍຮູບ ${index + 1} ຂຶ້ນ`}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={unavailable || index === gallery.length - 1}
                      aria-label={`ຍ້າຍຮູບ ${index + 1} ລົງ`}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        release(image);
                        setGallery((images) =>
                          images.filter((item) => item.id !== image.id),
                        );
                        setDirty(true);
                      }}
                    >
                      <Trash2 data-icon="inline-start" aria-hidden="true" />
                      ລຶບຮູບ {index + 1}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <Disclosure title="ບ່ອນເກັບຮູບພາບ" defaultOpen={!appConfig.ipfsAPI}>
            <FieldGroup>
              <SelectField
                icon={HardDrive}
                label="ບໍລິການເກັບໄຟລ໌"
                value={provider}
                onChange={(value) => {
                  setProvider(value);
                  setAuthorization("");
                  setSignedURLs("");
                }}
                options={[
                  ["kubo", "IPFS"],
                  ["pinata", "Pinata"],
                ]}
              />
              {provider === "kubo" ? (
                <>
                  <TextField
                    label="ທີ່ຢູ່ບໍລິການ IPFS"
                    value={endpoint}
                    onChange={setEndpoint}
                  />
                  <TextField
                    label="ລະຫັດອະນຸຍາດ (ຖ້າມີ)"
                    type="password"
                    value={authorization}
                    onChange={setAuthorization}
                  />
                </>
              ) : (
                <TextField
                  label="ລິ້ງອັບໂຫຼດຊົ່ວຄາວຈາກ Pinata"
                  value={signedURLs}
                  onChange={setSignedURLs}
                  multiline
                  help="ໜຶ່ງລິ້ງຕໍ່ແຖວ: ສຳລັບຮູບໃໝ່ແຕ່ລະຮູບ ແລະໄຟລ໌ຂໍ້ມູນ. ລິ້ງຈະຖືກລ້າງຫຼັງອັບໂຫຼດ."
                />
              )}
            </FieldGroup>
          </Disclosure>
          <p className="text-xs leading-6 text-muted-foreground">
            ຮູບພາບທີ່ອັບໂຫຼດເປັນສາທາລະນະ. ການລຶບຮູບອອກຈາກກອງທຶນບໍ່ໄດ້ລຶບໄຟລ໌ຈາກ
            IPFS.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              disabled={
                !dirty ||
                unavailable ||
                !(provider === "kubo" ? endpoint.trim() : signedURLs.trim())
              }
              onClick={publish}
            >
              <Upload data-icon="inline-start" aria-hidden="true" />
              ອັບໂຫຼດຮູບພາບ
            </Button>
            {dirty ? (
              <Button
                variant="ghost"
                onClick={() => {
                  release(cover);
                  gallery.forEach(release);
                  setCover(
                    initial.coverImage
                      ? editable(initial.coverImage)
                      : undefined,
                  );
                  setGallery(initial.descriptionImages.map(editable));
                  setDirty(false);
                  setError(undefined);
                  setStatus("");
                }}
              >
                ຍົກເລີກການແກ້ໄຂຮູບ
              </Button>
            ) : null}
          </div>
        </FieldGroup>
      </fieldset>
      {uploading ? (
        <Button
          variant="outline"
          className="self-start"
          onClick={() => request.current?.abort()}
        >
          <X data-icon="inline-start" aria-hidden="true" />
          ຍົກເລີກການອັບໂຫຼດ
        </Button>
      ) : null}
      <p
        role="status"
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        {busy ? <Spinner /> : null}
        {status}
      </p>
      <ErrorNotice error={error} />
    </section>
  );
}
