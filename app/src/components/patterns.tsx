import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-3">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className="text-2xl font-semibold leading-relaxed sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="text-sm leading-8 text-muted-foreground sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {action ? (
          <div className="flex shrink-0 flex-wrap gap-2">{action}</div>
        ) : null}
      </div>
    </header>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 py-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <strong className="break-words text-2xl font-semibold tabular-nums">
        {value}
      </strong>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Disclosure({
  title,
  children,
  defaultOpen = false,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [initialValue] = useState(() => (defaultOpen ? ["details"] : []));
  return (
    <Accordion defaultValue={initialValue}>
      <AccordionItem value="details">
        <AccordionTrigger>{title}</AccordionTrigger>
        <AccordionContent>
          <div className="flex min-w-0 flex-col gap-4 pt-3">{children}</div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export type RouteItem = { to: string; label: string; end?: boolean };
export function RouteNavigation({
  items,
  label,
  onNavigate,
}: {
  items: RouteItem[];
  label: string;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  return (
    <div className="max-w-full min-w-0 py-1">
      <NavigationMenu aria-label={label} className="max-w-none justify-start">
        <NavigationMenuList className="flex-wrap justify-start gap-1">
          {items.map((item) => {
            const target = item.to.split("?")[0];
            return (
              <NavigationMenuItem key={item.to}>
                <NavigationMenuLink
                  active={
                    item.end
                      ? pathname === target
                      : pathname === target || pathname.startsWith(target + "/")
                  }
                  render={<Link to={item.to} onClick={onNavigate} />}
                  className="min-h-11 whitespace-nowrap px-3 py-3"
                >
                  {item.label}
                </NavigationMenuLink>
              </NavigationMenuItem>
            );
          })}
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}

export function ProgressSteps({
  labels,
  step,
}: {
  labels: string[];
  step: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          ຂັ້ນຕອນທີ່ {step + 1} / {labels.length}
        </p>
        <Badge variant="secondary">{labels[step]}</Badge>
      </div>
      <Progress
        value={((step + 1) / labels.length) * 100}
        aria-label="ຄວາມຄືບໜ້າການສ້າງກອງທຶນ"
      />
      <ol className="grid grid-cols-5 gap-2 text-center text-xs text-muted-foreground">
        {labels.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? "step" : undefined}
            className="aria-[current=step]:font-semibold aria-[current=step]:text-primary"
          >
            {i + 1}. <span className="hidden sm:inline">{label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
