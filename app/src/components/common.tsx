import { useId, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "./ui/empty";
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
    <Alert>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
export function ErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <Alert variant="destructive">
      <AlertTitle> ບໍ່ສາມາດດຳເນີນການໄດ້ </AlertTitle>
      <AlertDescription>{friendlyError(error)}</AlertDescription>
    </Alert>
  ) : null;
}
export function Loading() {
  const { t } = useLanguage();
  return (
    <div aria-live="polite" className="flex flex-col gap-4">
      <p>{t("loading")}</p>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
export function EmptyState({ description }: { description?: string }) {
  const { t } = useLanguage();
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{t("empty")}</EmptyTitle>
        <EmptyDescription>
          {description || "ລອງໂຫຼດເພີ່ມ ໂຫຼດໃໝ່ ຫຼືປ່ຽນຕົວເລືອກການຄົ້ນຫາ."}
        </EmptyDescription>
      </EmptyHeader>
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
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  help?: string;
  multiline?: boolean;
  required?: boolean;
  type?: string;
}) {
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      ) : (
        <Input
          id={id}
          type={type}
          autoComplete={type === "password" ? "off" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )}{" "}
      {help ? <FieldDescription>{help}</FieldDescription> : null}
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
  return state.stage ? (
    <div className="flex flex-col gap-3" aria-live="polite">
      <Notice title={transactionLabels[state.stage] ?? "ສະຖານະລາຍການ"}>
        {state.stage === "Confirmed"
          ? "ລາຍການຂອງເຈົ້າຖືກຢືນຢັນສຳເລັດແລ້ວ."
          : state.error ||
            "ກະລຸນາເບິ່ງຄຳຂໍໃນ MetaMask ແລະລໍຖ້າລະບົບຢືນຢັນສຳເລັດ."}
        {state.gas ? (
          <p> ຄ່າປະເມີນການໃຊ້ເຄືອຂ່າຍ: {state.gas.toString()}</p>
        ) : null}
        {state.hash ? <TxHash hash={state.hash} d={d} /> : null}
      </Notice>
    </div>
  ) : null;
}
