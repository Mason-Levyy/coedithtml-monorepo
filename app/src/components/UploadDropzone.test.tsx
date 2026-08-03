import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UploadDropzone } from "./UploadDropzone";

function htmlFile(name: string, byteLength: number): File {
  return new File([new Uint8Array(byteLength)], name, { type: "text/html" });
}

function getInput(): HTMLInputElement {
  const input = document.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("expected a file input");
  }
  return input;
}

describe("UploadDropzone", () => {
  it("calls onFileSelected for a valid .html file chosen via the input", () => {
    const onFileSelected = vi.fn();
    render(<UploadDropzone onFileSelected={onFileSelected} />);

    const file = htmlFile("deck.html", 100);
    fireEvent.change(getInput(), { target: { files: [file] } });

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("rejects a non-html file with a validation message instead of calling onFileSelected", () => {
    const onFileSelected = vi.fn();
    render(<UploadDropzone onFileSelected={onFileSelected} />);

    fireEvent.change(getInput(), {
      target: { files: [htmlFile("deck.pdf", 100)] },
    });

    expect(onFileSelected).not.toHaveBeenCalled();
    expect(() =>
      screen.getByText("Only a single .html file can be uploaded."),
    ).not.toThrow();
  });

  it("shows a server-provided error message", () => {
    render(
      <UploadDropzone
        onFileSelected={() => {}}
        errorMessage="Too many uploads. Try again later."
      />,
    );

    expect(() =>
      screen.getByText("Too many uploads. Try again later."),
    ).not.toThrow();
  });

  it("accepts a dropped file", () => {
    const onFileSelected = vi.fn();
    render(<UploadDropzone onFileSelected={onFileSelected} />);

    const file = htmlFile("deck.html", 100);
    fireEvent.drop(screen.getByText(/Drop a \.html file/), {
      dataTransfer: { files: [file] },
    });

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("does not accept a dropped file while disabled", () => {
    const onFileSelected = vi.fn();
    render(<UploadDropzone onFileSelected={onFileSelected} disabled />);

    fireEvent.drop(screen.getByText(/Drop a \.html file/), {
      dataTransfer: { files: [htmlFile("deck.html", 100)] },
    });

    expect(onFileSelected).not.toHaveBeenCalled();
  });
});
