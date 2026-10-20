import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Explore } from "../src/pages/Explore";
import { Home } from "../src/pages/Home";

vi.mock("../src/web3/reads", () => ({
  useFunds: () => ({
    data: {
      pages: [
        {
          count: 3n,
          rows: [
            {
              id: 3n,
              fund: {
                title: "ຮ້ານກາເຟ",
                summary: "ທຸລະກິດໃໝ່",
                category: "Business",
                totalRaised: 10n,
                threshold: 2,
                config: {
                  fundingMode: 0,
                  underfundingPolicy: 0,
                  deadline: 300n,
                },
              },
              status: 0,
            },
            {
              id: 2n,
              fund: {
                title: "ໂຄງການສ້າງແອັບ",
                summary: "ແນວຄິດໃໝ່",
                category: "ໂຄງການ",
                totalRaised: 30n,
                threshold: 1,
                config: { fundingMode: 1, underfundingPolicy: 0, deadline: 0n },
              },
              status: 1,
            },
            {
              id: 1n,
              fund: {
                title: "ສວນຊຸມຊົນ",
                summary: "ພື້ນທີ່ຮ່ວມກັນ",
                category: "Community",
                totalRaised: 20n,
                threshold: 2,
                config: {
                  fundingMode: 0,
                  underfundingPolicy: 1,
                  deadline: 100n,
                },
              },
              status: 0,
            },
          ],
        },
      ],
    },
    isLoading: false,
    error: null,
  }),
}));
vi.mock("../src/features/funds/FundCard", () => ({
  FundCard: ({ row }: { row: { fund: { title: string } } }) => (
    <article>{row.fund.title}</article>
  ),
}));
function show(path = "/funds") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Explore />
    </MemoryRouter>,
  );
}
describe("fund discovery", () => {
  it("shows all funds even when an old category link is opened", () => {
    show("/funds?category=Business");
    expect(screen.getByText("ຮ້ານກາເຟ")).toBeVisible();
    expect(screen.getByText("ສວນຊຸມຊົນ")).toBeVisible();
    expect(screen.getByText("ໂຄງການສ້າງແອັບ")).toBeVisible();
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.queryByLabelText("ໝວດໝູ່")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "ລ້າງຕົວເລືອກການຄົ້ນຫາ" }),
    ).not.toBeInTheDocument();
  });
  it("shows recent funds without category buttons on the home page", () => {
    const { container } = render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.queryByLabelText("ໝວດໝູ່ກອງທຶນ")).not.toBeInTheDocument();
    expect(container.querySelector('a[href*="category="]')).toBeNull();
  });
  it("searches across all funds and resets the search", () => {
    show();
    fireEvent.change(screen.getByLabelText("ຄົ້ນຫາກອງທຶນ"), {
      target: { value: "ສວນຊຸມຊົນ" },
    });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("article")).toHaveTextContent("ສວນຊຸມຊົນ");
    fireEvent.change(screen.getByLabelText("ຄົ້ນຫາກອງທຶນ"), {
      target: { value: "ບໍ່ພົບ" },
    });
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    fireEvent.click(
      screen.getByRole("button", { name: "ລ້າງຕົວເລືອກການຄົ້ນຫາ" }),
    );
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });
  it("sorts fund amounts as bigint values", () => {
    show();
    fireEvent.change(screen.getByLabelText("ຈັດລຽງຕາມ"), {
      target: { value: "raised" },
    });
    expect(screen.getAllByRole("article").map((el) => el.textContent)).toEqual([
      "ໂຄງການສ້າງແອັບ",
      "ສວນຊຸມຊົນ",
      "ຮ້ານກາເຟ",
    ]);
  });
});
