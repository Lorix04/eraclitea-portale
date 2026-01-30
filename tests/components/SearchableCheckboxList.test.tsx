import { render, screen, fireEvent } from "@testing-library/react";
import SearchableCheckboxList from "@/components/SearchableCheckboxList";

describe("SearchableCheckboxList", () => {
  const mockItems = [
    { id: "1", label: "Sicurezza sul Lavoro", subtitle: "5 clienti" },
    { id: "2", label: "Ambiente", subtitle: "3 clienti" },
    { id: "3", label: "Privacy GDPR", subtitle: "8 clienti" },
  ];

  it("should render all items", () => {
    render(
      <SearchableCheckboxList
        items={mockItems}
        selectedIds={[]}
        onSelectionChange={() => {}}
      />
    );

    expect(screen.getByText("Sicurezza sul Lavoro")).toBeInTheDocument();
    expect(screen.getByText("Ambiente")).toBeInTheDocument();
    expect(screen.getByText("Privacy GDPR")).toBeInTheDocument();
  });

  it("should filter items by search", async () => {
    render(
      <SearchableCheckboxList
        items={mockItems}
        selectedIds={[]}
        onSelectionChange={() => {}}
        placeholder="Cerca..."
      />
    );

    const searchInput = screen.getByPlaceholderText("Cerca...");
    fireEvent.change(searchInput, { target: { value: "Sicurezza" } });

    expect(screen.getByText("Sicurezza sul Lavoro")).toBeInTheDocument();
    expect(screen.queryByText("Ambiente")).not.toBeInTheDocument();
    expect(screen.queryByText("Privacy GDPR")).not.toBeInTheDocument();
  });

  it("should show selected count", () => {
    render(
      <SearchableCheckboxList
        items={mockItems}
        selectedIds={["1", "2"]}
        onSelectionChange={() => {}}
      />
    );

    expect(screen.getByText(/2 selezionati/)).toBeInTheDocument();
  });

  it("should call onSelectionChange when item clicked", async () => {
    const mockOnChange = jest.fn();

    render(
      <SearchableCheckboxList
        items={mockItems}
        selectedIds={[]}
        onSelectionChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByText("Sicurezza sul Lavoro"));

    expect(mockOnChange).toHaveBeenCalledWith(["1"]);
  });

  it("should remove item from selection when clicked again", async () => {
    const mockOnChange = jest.fn();

    render(
      <SearchableCheckboxList
        items={mockItems}
        selectedIds={["1"]}
        onSelectionChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByText("Sicurezza sul Lavoro"));

    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it("should clear search when X button clicked", async () => {
    render(
      <SearchableCheckboxList
        items={mockItems}
        selectedIds={[]}
        onSelectionChange={() => {}}
        placeholder="Cerca..."
      />
    );

    const searchInput = screen.getByPlaceholderText("Cerca...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    const buttons = screen.getAllByRole("button");
    const clearButton = buttons.find((button) => !button.textContent);
    expect(clearButton).toBeDefined();

    if (clearButton) {
      fireEvent.click(clearButton);
    }

    expect(searchInput).toHaveValue("");
  });

  it("should show empty message when no items match", async () => {
    render(
      <SearchableCheckboxList
        items={mockItems}
        selectedIds={[]}
        onSelectionChange={() => {}}
        emptyMessage="Nessun elemento"
      />
    );

    const searchInput = screen.getByRole("textbox");
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    expect(screen.getByText(/Nessun risultato/)).toBeInTheDocument();
  });

  it("should be disabled when disabled prop is true", () => {
    render(
      <SearchableCheckboxList
        items={mockItems}
        selectedIds={[]}
        onSelectionChange={() => {}}
        disabled
      />
    );

    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});
