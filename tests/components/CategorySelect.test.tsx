import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import CategorySelect from "@/components/CategorySelect";

const mockCategories = [
  { id: "cat-1", name: "Sicurezza", color: "#FF0000" },
  { id: "cat-2", name: "Ambiente", color: "#00FF00" },
];

describe("CategorySelect", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCategories),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should render placeholder when no categories", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }) as unknown as typeof fetch;

    render(
      <CategorySelect
        value={[]}
        onChange={() => {}}
        placeholder="Seleziona categorie"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Seleziona categorie")).toBeInTheDocument();
    });
  });

  it("should show selected categories as labels", async () => {
    render(<CategorySelect value={["cat-1"]} onChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("Sicurezza")).toBeInTheDocument();
    });
  });

  it("should call onChange when category selected", async () => {
    const mockOnChange = jest.fn();

    render(<CategorySelect value={[]} onChange={mockOnChange} />);

    await waitFor(() => {
      expect(screen.getByText("Sicurezza")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Sicurezza"));

    expect(mockOnChange).toHaveBeenCalledWith(["cat-1"]);
  });

  it("should filter categories by search", async () => {
    render(<CategorySelect value={[]} onChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("Sicurezza")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Cerca categoria");
    fireEvent.change(searchInput, { target: { value: "Ambiente" } });

    expect(screen.getByText("Ambiente")).toBeInTheDocument();
    expect(screen.queryByText("Sicurezza")).not.toBeInTheDocument();
  });
});
