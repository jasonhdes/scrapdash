import { renderHook } from "@testing-library/react";
import { useTokenExpiry } from "./useTokenExpiry";

function fakeToken(expSecondsFromNow: number): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expSecondsFromNow }));
  return `${header}.${payload}.fake-signature`;
}

describe("useTokenExpiry", () => {
  it("returns valid when there is no token", () => {
    const { result } = renderHook(() => useTokenExpiry(null));
    expect(result.current).toBe("valid");
  });

  it("returns valid for a token far from expiring", () => {
    const { result } = renderHook(() => useTokenExpiry(fakeToken(60 * 60)));
    expect(result.current).toBe("valid");
  });

  it("returns expiring for a token inside the 5-minute window", () => {
    const { result } = renderHook(() => useTokenExpiry(fakeToken(4 * 60)));
    expect(result.current).toBe("expiring");
  });

  it("returns expired for a token whose exp already passed", () => {
    const { result } = renderHook(() => useTokenExpiry(fakeToken(-10)));
    expect(result.current).toBe("expired");
  });

  it("re-evaluates when the token itself changes (e.g. after a refresh)", () => {
    const { result, rerender } = renderHook(({ token }) => useTokenExpiry(token), {
      initialProps: { token: fakeToken(-10) },
    });
    expect(result.current).toBe("expired");

    rerender({ token: fakeToken(60 * 60) });
    expect(result.current).toBe("valid");
  });
});
