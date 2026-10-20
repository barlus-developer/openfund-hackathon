import { HardDrive, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { keccak256, type Hex } from "viem";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ErrorNotice, SelectField, TextField } from "@/components/common";
import { MAX_DOCUMENT_BYTES, uploadIPFS } from "@/lib/ipfs";
import { appConfig } from "@/config";

export function IPFSUpload({
  onHash,
  onUploaded,
}: {
  onHash: (hash: Hex) => void;
  onUploaded: (uri: string, hash: Hex) => void;
}) {
  const [file, setFile] = useState<File>();
  const [provider, setProvider] = useState("kubo");
  const [endpoint, setEndpoint] = useState(appConfig.ipfsAPI);
  // Authorization and signed URLs live only in this mounted component. Never persist or bundle them.
  const [authorization, setAuthorization] = useState("");
  const [signedURL, setSignedURL] = useState("");
  const [error, setError] = useState<unknown>();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | undefined>(undefined);
  const selection = useRef(0);
  useEffect(
    () => () => {
      request.current?.abort();
      selection.current++;
    },
    [],
  );

  async function upload() {
    if (!file || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(undefined);
    setStatus("ກຳລັງອັບໂຫຼດເອກະສານສາທາລະນະ…");
    try {
      const result = await uploadIPFS(
        file,
        provider === "pinata"
          ? { provider, signedURL }
          : { provider: "kubo", endpoint, authorization },
        controller.signal,
      );
      onUploaded(result.uri, result.hash);
      setStatus(
        `ອັບໂຫຼດແລ້ວ: ${result.uri}. ກົດເຜີຍແຜ່ລາຍງານດ້ານລຸ່ມເພື່ອບັນທຶກໃນລະບົບ.`,
      );
    } catch (e) {
      setError(e);
      setStatus("");
    } finally {
      request.current = undefined;
      setBusy(false);
      setAuthorization("");
      setSignedURL("");
    }
  }

  return (
    <>
      <Field>
        <FieldLabel htmlFor="report-file">
          {" "}
          ເລືອກເອກະສານສາທາລະນະ (ບໍ່ເກີນ 5 MB){" "}
        </FieldLabel>
        <Input
          id="report-file"
          type="file"
          disabled={busy}
          onChange={async (event) => {
            const current = ++selection.current;
            const next = event.target.files?.[0];
            setFile(undefined);
            setError(undefined);
            setStatus("");
            if (!next) return;
            if (next.size > MAX_DOCUMENT_BYTES) {
              setError(Error("ກະລຸນາເລືອກເອກະສານບໍ່ເກີນ 5 MB."));
              return;
            }
            try {
              const hash = keccak256(new Uint8Array(await next.arrayBuffer()));
              if (current !== selection.current) return;
              setFile(next);
              onHash(hash);
            } catch {
              setError(Error("ບໍ່ສາມາດອ່ານເອກະສານນີ້ໄດ້. ກະລຸນາເລືອກໃໝ່."));
            }
          }}
        />
      </Field>
      <SelectField
        icon={HardDrive}
        label="ບ່ອນເກັບເອກະສານ"
        value={provider}
        onChange={(value) => {
          if (!busy) {
            setProvider(value);
            setAuthorization("");
            setSignedURL("");
          }
        }}
        options={[
          ["kubo", "ພື້ນທີ່ເກັບໄຟລ໌ຂອງຂ້ອຍ (IPFS)"],
          ["pinata", "ພື້ນທີ່ເກັບໄຟລ໌ Pinata"],
        ]}
      />
      {provider === "kubo" ? (
        <>
          <TextField
            label="ທີ່ຢູ່ບໍລິການເກັບໄຟລ໌ IPFS"
            value={endpoint}
            onChange={setEndpoint}
            help="ປ້ອນທີ່ຢູ່ HTTPS ຂອງບໍລິການເກັບໄຟລ໌ທີ່ເຈົ້າໃຊ້."
          />
          <TextField
            label="ລະຫັດອະນຸຍາດ (ຖ້າມີ, ໃຊ້ຊົ່ວຄາວ)"
            type="password"
            value={authorization}
            onChange={setAuthorization}
            help="ໃຊ້ລະຫັດຈາກຜູ້ໃຫ້ບໍລິການ. ລະບົບຈະລ້າງລະຫັດຫຼັງອັບໂຫຼດ."
          />
        </>
      ) : (
        <TextField
          label="ລິ້ງອັບໂຫຼດຊົ່ວຄາວຈາກ Pinata"
          type="password"
          value={signedURL}
          onChange={setSignedURL}
          help="ໃຊ້ລິ້ງອັບໂຫຼດຊົ່ວຄາວຈາກຜູ້ດູແລພື້ນທີ່ເກັບໄຟລ໌ຂອງເຈົ້າ."
        />
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={
            !file || busy || !(provider === "kubo" ? endpoint : signedURL)
          }
          onClick={upload}
        >
          <Upload data-icon="inline-start" aria-hidden="true" />
          {busy ? "ກຳລັງອັບໂຫຼດ…" : "ອັບໂຫຼດເອກະສານ"}
        </Button>
        {busy && (
          <Button variant="outline" onClick={() => request.current?.abort()}>
            <X data-icon="inline-start" aria-hidden="true" />{" "}
            ຍົກເລີກການອັບໂຫຼດ{" "}
          </Button>
        )}
      </div>
      <small>
        {" "}
        ສາມາດວາງລິ້ງເອກະສານທີ່ມີແລ້ວໄດ້. ໄຟລ໌ທີ່ອັບໂຫຼດເປັນສາທາລະນະ
        ແລະຕ້ອງມີບ່ອນເກັບຮັກສາ.
        ການຍົກເລີກບໍ່ໄດ້ລຶບໄຟລ໌ທີ່ອັບໂຫຼດສຳເລັດແລ້ວ.{" "}
      </small>
      <p role="status">{status}</p>
      <ErrorNotice error={error} />
    </>
  );
}
