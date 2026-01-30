import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ItalianDateInput } from "@/components/ui/italian-date-input";

describe("ItalianDateInput", () => {
  it("should render with placeholder", () => {
    render(<ItalianDateInput value="" onChange={() => {}} placeholder="GG/MM/AAAA" />);

    expect(screen.getByPlaceholderText("GG/MM/AAAA")).toBeInTheDocument();
  });

  it("should display value", () => {
    render(<ItalianDateInput value="15/03/1990" onChange={() => {}} />);

    expect(screen.getByDisplayValue("15/03/1990")).toBeInTheDocument();
  });

  it("should auto-format date with slashes", async () => {
    const mockOnChange = jest.fn();

    render(<ItalianDateInput value="" onChange={mockOnChange} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "15031990" } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith("15/03/1990");
    });
  });

  it("should show error for invalid date", async () => {
    render(<ItalianDateInput value="" onChange={() => {}} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "32/13/2024" } });

    await waitFor(() => {
      expect(screen.getByText(/data valida/i)).toBeInTheDocument();
    });
  });

  it("should show custom error message", () => {
    render(
      <ItalianDateInput
        value=""
        onChange={() => {}}
        error="Data obbligatoria"
      />
    );

    expect(screen.getByText("Data obbligatoria")).toBeInTheDocument();
  });

  it("should be disabled when disabled prop is true", () => {
    render(<ItalianDateInput value="" onChange={() => {}} disabled />);

    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("should limit input to 10 characters", async () => {
    render(<ItalianDateInput value="" onChange={() => {}} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "15/03/199012345" } });

    expect(input).toHaveAttribute("maxLength", "10");
  });
});
