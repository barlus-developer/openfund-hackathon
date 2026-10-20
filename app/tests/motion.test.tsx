import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Link, MemoryRouter } from "react-router-dom";
import { Reveal, RouteSurface } from "../src/components/motion";
import { Progress } from "../src/components/ui/progress";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setupMotion(reduced = false) {
  const preference = Object.assign(new EventTarget(), { matches: reduced });
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => preference),
  );
  const cancel = vi.fn();
  const animate = vi.fn(() => ({ cancel }));
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: animate,
  });
  return { preference, animate, cancel };
}

describe("motion accessibility and continuity", () => {
  it("keeps form state and DOM identity through an animated navigation", () => {
    const { animate } = setupMotion();
    render(
      <MemoryRouter>
        <RouteSurface>
          <input aria-label="Draft" defaultValue="" />
          <Link to="/next">Next</Link>
        </RouteSurface>
      </MemoryRouter>,
    );
    const input = screen.getByLabelText("Draft");
    fireEvent.change(input, { target: { value: "Unsaved amount" } });
    fireEvent.click(screen.getByRole("link", { name: "Next" }));
    expect(screen.getByLabelText("Draft")).toBe(input);
    expect(input).toHaveValue("Unsaved amount");
    expect(animate).toHaveBeenCalledTimes(2);
  });

  it("skips route motion when reduced motion is requested", () => {
    const { animate } = setupMotion(true);
    render(
      <MemoryRouter>
        <RouteSurface>
          <button>Donate</button>
        </RouteSurface>
      </MemoryRouter>,
    );
    expect(animate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Donate" })).toBeEnabled();
  });

  it("cancels an active entrance on keyboard focus and preference changes", () => {
    const { preference, cancel } = setupMotion();
    render(
      <MemoryRouter>
        <RouteSurface>
          <input aria-label="Amount" />
        </RouteSurface>
      </MemoryRouter>,
    );
    fireEvent.focusIn(screen.getByLabelText("Amount"));
    expect(cancel).toHaveBeenCalledOnce();
    act(() => preference.dispatchEvent(new Event("change")));
    expect(cancel).toHaveBeenCalledTimes(2);
  });

  it("leaves reveal content accessible when observation is unavailable", () => {
    setupMotion();
    render(
      <Reveal>
        <button>Choose fund</button>
      </Reveal>,
    );
    expect(screen.getByRole("button", { name: "Choose fund" })).toBeVisible();
  });

  it("reveals a section once, then disconnects its observer", () => {
    setupMotion();
    const disconnect = vi.fn();
    let notify!: IntersectionObserverCallback;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          notify = callback;
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
    render(<Reveal data-testid="section">Fund details</Reveal>);
    expect(screen.getByTestId("section")).toBeVisible();
    act(() =>
      notify(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    expect(screen.getByTestId("section")).toHaveAttribute(
      "data-revealed",
      "true",
    );
    expect(disconnect).toHaveBeenCalledOnce();
  });
});

describe("funding progress", () => {
  it("keeps semantic values while scaling a full-width indicator", () => {
    const { container, rerender } = render(
      <Progress value={25} min={0} max={100} aria-label="Funding" />,
    );
    const indicator = container.querySelector(
      '[data-slot="progress-indicator"]',
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "25",
    );
    expect(indicator).toHaveStyle({ width: "100%", transform: "scaleX(0.25)" });
    rerender(<Progress value={75} min={0} max={100} aria-label="Funding" />);
    expect(indicator).toHaveStyle({ width: "100%", transform: "scaleX(0.75)" });
  });
});
