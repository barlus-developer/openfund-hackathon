import { Spinner } from "./ui/spinner";
import {
  CheckCircle2,
  CircleAlert,
  FolderOpen,
  Info,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
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
import { Field, FieldLabel, FieldDescription, FieldError } from "./ui/field";
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
    <Alert variant="destructive" role="alert" className="feedback-enter">
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
      className="feedback-enter flex min-w-0 flex-col gap-5"
    >
      <p
        className={
          cards
            ? "sr-only"
            : "flex items-center gap-2 text-sm text-muted-foreground"
        }
      >
        <Spinner aria-hidden="true" />
        {t("loading")}
      </p>
      {cards ? (
        <div
          aria-hidden="true"
          className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
        >
          {[0, 1, 2].map((i) => (
            <Card key={i} className="min-h-[26rem]">
              <CardHeader>
                <Skeleton className="mb-4 size-11 rounded-xl" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="mt-3 h-3 w-full" />
                <Skeleton className="mt-1 h-3 w-4/5" />
              </CardHeader>
              <CardContent className="mt-auto flex flex-col gap-3">
                <Skeleton className="h-7 w-1/2" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="mt-6 h-11 w-full" />
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
    <Empty className="feedback-enter">
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
  id: providedId,
  error,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  help?: string;
  multiline?: boolean;
  required?: boolean;
  type?: string;
  inputMode?: "decimal" | "numeric";
  id?: string;
  error?: string;
}) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const describedBy =
    [help ? `${id}-help` : "", error ? `${id}-error` : ""]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {multiline ? (
        <Textarea
          id={id}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      ) : (
        <Input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          type={type}
          inputMode={inputMode}
          autoComplete={type === "password" ? "off" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )}{" "}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
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
  disabled,
  error,
  id: providedId,
  icon,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  icon?: LucideIcon;
  options: readonly (readonly [string, string])[];
  disabled?: boolean;
  error?: string;
  id?: string;
}) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  return (
    <Field data-invalid={!!error} data-disabled={disabled}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect
        icon={icon}
        id={id}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([v, l]) => (
          <NativeSelectOption key={v} value={v}>
            {l}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </Field>
  );
}
export function ActionLink({
  to,
  children,
  outline = false,
  icon: Icon,
}: {
  to: string;
  children: ReactNode;
  outline?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <Link
      className={buttonVariants({
        variant: outline ? "outline" : "default",
        size: "lg",
      })}
      to={to}
    >
      {Icon ? <Icon data-icon="inline-start" aria-hidden="true" /> : null}
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
      {hash} <ExternalLink className="inline-icon" aria-hidden="true" />
      <span className="sr-only"> (ເປີດໃນແຖບໃໝ່)</span>
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
  const step =
    state.stage === "Preparing" ? 0 : state.stage === "Awaiting Wallet" ? 1 : 2;
  const steps = ["ກວດສອບ", "ຢືນຢັນໃນກະເປົາ", "ຢືນຢັນເຄືອຂ່າຍ"];
  return (
    <div
      className="tx-feedback feedback-enter"
      data-state={failed ? "error" : pending ? "pending" : "success"}
    >
      <Alert
        variant={failed ? "destructive" : "default"}
        role={failed ? "alert" : "status"}
        aria-atomic="true"
      >
        {failed ? (
          <CircleAlert aria-hidden="true" />
        ) : pending ? (
          <Spinner aria-hidden="true" />
        ) : (
          <CheckCircle2 aria-hidden="true" />
        )}
        <AlertTitle>
          <span key={state.stage} className="state-label">
            {transactionLabels[state.stage] ?? "ສະຖານະລາຍການ"}
          </span>
        </AlertTitle>
        <AlertDescription>
          <p>{message}</p>
          {pending || state.stage === "Confirmed" ? (
            <ol className="transaction-steps" aria-label="ຂັ້ນຕອນລາຍການ">
              {steps.map((label, index) => {
                const done = state.stage === "Confirmed" || index < step;
                return (
                  <li
                    key={label}
                    data-complete={done}
                    aria-current={
                      pending && index === step ? "step" : undefined
                    }
                  >
                    <span
                      className="transaction-step-marker"
                      aria-hidden="true"
                    >
                      {done ? <CheckCircle2 /> : index + 1}
                    </span>
                    <span>{label}</span>
                  </li>
                );
              })}
            </ol>
          ) : null}
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
