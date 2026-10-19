import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Explore } from "../src/pages/Explore";

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
describe("fund discovery for different funding purposes", () => {
  it("applies category links from the home page", () => {
    show("/funds?category=Business");
    expect(screen.getByText("ຮ້ານກາເຟ")).toBeVisible();
    expect(screen.queryByText("ສວນຊຸມຊົນ")).not.toBeInTheDocument();
  });
  it("matches Lao category names to their existing contract categories", () => {
    show("/funds?category=Projects");
    expect(screen.getByText("ໂຄງການສ້າງແອັບ")).toBeVisible();
    expect(screen.queryByText("ຮ້ານກາເຟ")).not.toBeInTheDocument();
  });
  it("combines search and category filters, then resets both", () => {
    show("/funds?category=Business");
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
