import { Spinner } from "./ui/spinner";
import { CheckCircle2, CircleAlert, FolderOpen, Info } from "lucide-react";
import { Disclosure } from "./patterns";
import { useId, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent,
} from "./ui/empty";
import { Skeleton } from "./ui/skeleton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/card";
import { Field, FieldLabel, FieldDescription } from "./ui/field";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";
import { buttonVariants } from "./ui/button";
import { transactionLabels } from "@/app/labels";
import { useLanguage } from "@/app/i18n";
import { friendlyError } from "@/lib/errors";
import type { TxState } from "@/web3/transaction";
import type { Deployment } from "@/web3/deployments";
export function Notice({
  children,
  title = "ກະລຸນາອ່ານກ່ອນດຳເນີນການ",
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <Alert role="note">
      <Info aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
export function ErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <Alert variant="destructive" role="alert">
      <CircleAlert aria-hidden="true" />
      <AlertTitle> ບໍ່ສາມາດດຳເນີນການໄດ້ </AlertTitle>
      <AlertDescription>{friendlyError(error)}</AlertDescription>
    </Alert>
  ) : null;
}
export function Loading({ cards = false }: { cards?: boolean }) {
  const { t } = useLanguage();
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-w-0 flex-col gap-5"
    >
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        {t("loading")}
      </p>
      {cards ? (
        <div
          aria-hidden="true"
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="mb-4 size-11 rounded-xl" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="mt-3 h-3 w-full" />
                <Skeleton className="mt-1 h-3 w-4/5" />
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Skeleton className="h-7 w-1/2" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderOpen aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title || t("empty")}</EmptyTitle>
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}
export function Panel({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
export function TextField({
  label,
  value,
  onChange,
  help,
  multiline = false,
  required = false,
  type = "text",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  help?: string;
  multiline?: boolean;
  required?: boolean;
  type?: string;
  inputMode?: "decimal" | "numeric";
}) {
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {multiline ? (
        <Textarea
          id={id}
          aria-describedby={help ? `${id}-help` : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      ) : (
        <Input
          id={id}
          aria-describedby={help ? `${id}-help` : undefined}
          type={type}
          inputMode={inputMode}
          autoComplete={type === "password" ? "off" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )}{" "}
      {help ? (
        <FieldDescription id={`${id}-help`}>{help}</FieldDescription>
      ) : null}
    </Field>
  );
}
export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([v, l]) => (
          <NativeSelectOption key={v} value={v}>
            {l}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  );
}
export function ActionLink({
  to,
  children,
  outline = false,
}: {
  to: string;
  children: ReactNode;
  outline?: boolean;
}) {
  return (
    <Link
      className={buttonVariants({
        variant: outline ? "outline" : "default",
        size: "lg",
      })}
      to={to}
    >
      {children}
    </Link>
  );
}
export function TxHash({ hash, d }: { hash: string; d: Deployment }) {
  return d.explorerUrl ? (
    <a
      className="hash"
      href={`${d.explorerUrl}/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
    >
      {hash}
    </a>
  ) : (
    <code className="hash">{hash}</code>
  );
}
export function TxFeedback({ state, d }: { state: TxState; d: Deployment }) {
  if (!state.stage) return null;
  const failed = ["Rejected", "Reverted", "Failed"].includes(state.stage);
  const pending = [
    "Preparing",
    "Awaiting Wallet",
    "Submitted",
    "Pending",
    "Replaced",
  ].includes(state.stage);
  const message =
    state.stage === "Confirmed"
      ? "ລາຍການຂອງເຈົ້າຖືກຢືນຢັນສຳເລັດແລ້ວ."
      : state.error ||
        (state.stage === "Awaiting Wallet"
          ? "ກວດສອບຍອດ ແລະຄ່າທຳນຽມໃນ MetaMask ແລ້ວຢືນຢັນ."
          : failed
            ? "ລາຍການຍັງບໍ່ສຳເລັດ. ກວດສອບປະຫວັດກ່ອນລອງໃໝ່."
            : "ກຳລັງກວດສອບ ແລະລໍຖ້າການຢືນຢັນ.");
  return (
    <div aria-live="polite">
      <Alert
        variant={failed ? "destructive" : "default"}
        role={failed ? "alert" : "status"}
      >
        {failed ? (
          <CircleAlert aria-hidden="true" />
        ) : pending ? (
          <Spinner />
        ) : (
          <CheckCircle2 aria-hidden="true" />
        )}
        <AlertTitle>
          {transactionLabels[state.stage] ?? "ສະຖານະລາຍການ"}
        </AlertTitle>
        <AlertDescription>
          <p>{message}</p>
          {state.hash || state.gas ? (
            <Disclosure title="ລາຍລະອຽດລາຍການ">
              {state.gas ? (
                <p>ຄ່າປະເມີນການໃຊ້ເຄືອຂ່າຍ: {state.gas.toString()}</p>
              ) : null}
              {state.hash ? <TxHash hash={state.hash} d={d} /> : null}
            </Disclosure>
          ) : null}
        </AlertDescription>
      </Alert>
    </div>
  );
}
