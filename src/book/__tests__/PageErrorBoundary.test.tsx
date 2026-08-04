import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageErrorBoundary } from "../PageErrorBoundary";

function Boom(): never {
  throw new Error("bloco explodiu");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PageErrorBoundary", () => {
  it("renderiza os filhos quando nada lanca", () => {
    render(
      <PageErrorBoundary label="bloco text#b1">
        <p>conteudo ok</p>
      </PageErrorBoundary>,
    );
    expect(screen.getByText("conteudo ok")).toBeInTheDocument();
  });

  it("contem a falha sem propagar, registra o label e mostra o fallback", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <PageErrorBoundary label="bloco image#b2" fallback={<span>faltou</span>}>
          <Boom />
        </PageErrorBoundary>,
      ),
    ).not.toThrow();

    expect(screen.getByText("faltou")).toBeInTheDocument();
    // registrou com o label (type+id do bloco)
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls.some((call) => String(call[0]).includes("bloco image#b2"))).toBe(true);
  });

  it("sem fallback, o bloco simplesmente some (render vazio)", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <PageErrorBoundary label="bloco x#b3">
        <Boom />
      </PageErrorBoundary>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
