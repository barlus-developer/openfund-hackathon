import {
  useConnection,
  useConnect,
  useConnectors,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/common";
import { useLanguage } from "@/app/i18n";
import { shorten } from "@/lib/amount";
import { defaultDeployment } from "@/web3/deployments";
export function Connect({
  chainId = defaultDeployment?.chainId || 31337,
}: {
  chainId?: number;
}) {
  const connection = useConnection(),
    connect = useConnect(),
    disconnect = useDisconnect(),
    sw = useSwitchChain(),
    connectors = useConnectors();
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {connection.isConnected ? (
        <>
          <Link to="/wallet" className="wallet-pill">
            {shorten(connection.address)}
          </Link>
          {connection.chainId !== chainId ? (
            <Button
              onClick={() => sw.mutate({ chainId })}
              disabled={sw.isPending}
            >
              {t("wrongChain")}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => disconnect.mutate({})}
          >
            Disconnect
          </Button>
        </>
      ) : (
        <Button
          onClick={() => connect.mutate({ connector: connectors[0], chainId })}
          disabled={connect.isPending}
        >
          {connect.isPending ? "Connecting…" : t("connect")}
        </Button>
      )}
      <ErrorNotice error={connect.error || sw.error} />
    </div>
  );
}
