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

  it("refuses a non-html file without sending anything", () => {
    const onFileSelected = vi.fn();
    render(<UploadDropzone onFileSelected={onFileSelected} />);

    fireEvent.change(getInput(), {
      target: { files: [htmlFile("deck.pdf", 100)] },
    });

    expect(onFileSelected).not.toHaveBeenCalled();
    expect(screen.getByText("Only a single .html file")).toBeTruthy();
  });

  it("gives a refusal from the server its own headline and next step", () => {
    render(
      <UploadDropzone
        onFileSelected={() => {}}
        rejection={{
          headline: "This is source, not a page",
          detail: "It has imports in it.",
          remedy: "Build it first, then upload the .html.",
        }}
      />,
    );

    expect(screen.getByText("This is source, not a page")).toBeTruthy();
    expect(screen.getByText("It has imports in it.")).toBeTruthy();
    expect(
      screen.getByText("Build it first, then upload the .html."),
    ).toBeTruthy();
  });

  it("says nothing extra when there is no next step to give", () => {
    render(
      <UploadDropzone
        onFileSelected={() => {}}
        rejection={{
          headline: "This file is empty",
          detail: "There are no bytes in it at all.",
          remedy: null,
        }}
      />,
    );

    expect(screen.getByRole("alert").textContent).toBe(
      "This file is emptyThere are no bytes in it at all.",
    );
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
