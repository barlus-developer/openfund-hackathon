import {
  useConnection,
  useConnect,
  useConnectors,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { Link } from "react-router-dom";
import { LogOut, Wallet, ArrowLeftRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ErrorNotice } from "@/components/common";
import { useLanguage } from "@/app/i18n";
import { shorten } from "@/lib/amount";
import { defaultDeployment } from "@/web3/deployments";
export function Connect({
  chainId = defaultDeployment?.chainId || 31337,
  compact = false,
}: {
  chainId?: number;
  compact?: boolean;
}) {
  const connection = useConnection(),
    connect = useConnect(),
    disconnect = useDisconnect(),
    sw = useSwitchChain(),
    connectors = useConnectors();
  const { t } = useLanguage();
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {connection.isConnected ? (
        <>
          <Link
            to="/wallet"
            aria-label={`ກະເປົາ ${shorten(connection.address)}`}
            className={buttonVariants({
              variant: "outline",
              size: compact ? "sm" : "default",
            })}
          >
            <Wallet data-icon="inline-start" />
            {compact ? (
              <span className="min-[375px]:hidden">ກະເປົາ</span>
            ) : null}
            <span className={compact ? "hidden min-[375px]:inline" : undefined}>
              {shorten(connection.address)}
            </span>
          </Link>
          {connection.chainId !== chainId ? (
            <Button
              aria-label={t("wrongChain")}
              onClick={() => sw.mutate({ chainId })}
              disabled={sw.isPending}
              size="sm"
            >
              {sw.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <ArrowLeftRight data-icon="inline-start" />
              )}
              <span
                className={compact ? "hidden min-[375px]:inline" : undefined}
              >
                {t("wrongChain")}
              </span>
            </Button>
          ) : null}
          <Button
            variant="ghost"
            className={compact ? "hidden" : undefined}
            size="icon"
            aria-label="ຕັດການເຊື່ອມຕໍ່"
            onClick={() => disconnect.mutate({})}
          >
            <LogOut />
          </Button>
        </>
      ) : (
        <Button
          aria-label={connect.isPending ? "ກຳລັງເຊື່ອມຕໍ່…" : t("connect")}
          variant={compact ? "outline" : "default"}
          size={compact ? "sm" : "default"}
          onClick={() =>
            connectors[0] &&
            connect.mutate({ connector: connectors[0], chainId })
          }
          disabled={connect.isPending || !connectors[0]}
        >
          {connect.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <Wallet data-icon="inline-start" />
          )}
          {compact ? (
            <span className="min-[375px]:hidden">ເຊື່ອມຕໍ່</span>
          ) : null}
          <span className={compact ? "hidden min-[375px]:inline" : undefined}>
            {connect.isPending ? "ກຳລັງເຊື່ອມຕໍ່…" : t("connect")}
          </span>
        </Button>
      )}
      {connect.error || sw.error ? (
        <div className="w-full">
          <ErrorNotice error={connect.error || sw.error} />
        </div>
      ) : null}
    </div>
  );
}
