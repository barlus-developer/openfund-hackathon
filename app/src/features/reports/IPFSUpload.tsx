import { useEffect, useRef, useState } from "react";
import { keccak256, type Hex } from "viem";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ErrorNotice, SelectField, TextField } from "@/components/common";
import { MAX_DOCUMENT_BYTES, uploadIPFS } from "@/lib/ipfs";

export function IPFSUpload({
  onHash,
  onUploaded,
}: {
  onHash: (hash: Hex) => void;
  onUploaded: (uri: string, hash: Hex) => void;
}) {
  const [file, setFile] = useState<File>();
  const [provider, setProvider] = useState(
    import.meta.env.VITE_IPFS_PROVIDER === "pinata" ? "pinata" : "kubo",
  );
  const [endpoint, setEndpoint] = useState(
    import.meta.env.VITE_IPFS_API_URL || "",
  );
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
    setStatus("Uploading public document to IPFS…");
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
        `Uploaded: ${result.uri}. Publish the reference below to anchor it on-chain.`,
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
          ເລືອກເອກະສານ / Public document (max 5 MB)
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
              setError(Error("Choose a document up to 5 MB."));
              return;
            }
            try {
              const hash = keccak256(new Uint8Array(await next.arrayBuffer()));
              if (current !== selection.current) return;
              setFile(next);
              onHash(hash);
            } catch {
              setError(Error("Could not read the selected document."));
            }
          }}
        />
      </Field>
      <SelectField
        label="ອັບໂຫຼດ IPFS / Upload provider"
        value={provider}
        onChange={(value) => {
          if (!busy) {
            setProvider(value);
            setAuthorization("");
            setSignedURL("");
          }
        }}
        options={[
          ["kubo", "My IPFS / Kubo endpoint (HTTPS or localhost)"],
          ["pinata", "Pinata public IPFS (signed upload URL)"],
        ]}
      />
      {provider === "kubo" ? (
        <>
          <TextField
            label="IPFS API endpoint"
            value={endpoint}
            onChange={setEndpoint}
            help="Your HTTPS Kubo API or authenticated reverse-proxy URL; /api/v0/add is appended when needed."
          />
          <TextField
            label="Authorization header (optional, session only)"
            type="password"
            value={authorization}
            onChange={setAuthorization}
            help="For example a scoped Bearer or Basic header for your own endpoint. Cleared after upload."
          />
        </>
      ) : (
        <TextField
          label="Short-lived Pinata signed upload URL"
          type="password"
          value={signedURL}
          onChange={setSignedURL}
          help="Generate using npm run ipfs:sign with your CLI-only PINATA_JWT. No API key is needed in this app."
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
          {busy ? "ກຳລັງອັບໂຫຼດ / Uploading…" : "ອັບໂຫຼດ IPFS / Upload to IPFS"}
        </Button>
        {busy && (
          <Button variant="outline" onClick={() => request.current?.abort()}>
            Cancel upload
          </Button>
        )}
      </div>
      <small>
        CID pasting works without an account. Uploads publish real public
        content; your node or pinning service must keep it available. Endpoint
        CORS must allow this app’s origin. Canceling a request may not undo a
        completed upload.
      </small>
      <p role="status">{status}</p>
      <ErrorNotice error={error} />
    </>
  );
}
