import { render, screen } from "@testing-library/react";
import { PreviewTransition } from "../../components/animations/PreviewTransition";
import { act } from "react-dom/test-utils";
import { useState } from "react";

// Mock useReducedMotion 为 false，确保动画持续而非立即卸载
jest.mock("framer-motion", () => {
  const actual = jest.requireActual("framer-motion");
  return { ...actual, useReducedMotion: () => false };
});

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

function Wrapper() {
  const [id, setId] = useState("a");
  return (
    <div>
      <button onClick={() => setId(id === "a" ? "b" : "a")}>toggle</button>
      <PreviewTransition id={id}>
        <div data-testid={`panel-${id}`}>{id}</div>
      </PreviewTransition>
    </div>
  );
}

describe("PreviewTransition", () => {
  it("should keep old panel in DOM during exit", () => {
    render(<Wrapper />);
    // 初始只有 a
    expect(screen.getByTestId("panel-a")).toBeInTheDocument();

    // 触发切换
    act(() => {
      screen.getByText("toggle").click();
    });

    // 切换后立即：应同时存在 a 和 b
    expect(screen.getByTestId("panel-a")).toBeInTheDocument();
    expect(screen.getByTestId("panel-b")).toBeInTheDocument();

    // 让动画时间流逝 > 0.8s
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // 动画结束后，旧面板应被卸载
    expect(screen.queryByTestId("panel-a")).not.toBeInTheDocument();
  });
});
