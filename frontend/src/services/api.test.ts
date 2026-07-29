import { apiFetch, ApiError, TOKEN_STORAGE_KEY } from "./api";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("apiFetch — sessão expirada", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // jsdom não deixa mockar window.location.href/pathname (getter/setter
    // não configuráveis) nem navega de verdade — só evita que o "Not
    // implemented: navigation" do jsdom polua a saída do teste.
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("clears the stored token on a 401 with a token", async () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, "token-velho");
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(401, { message: "Unauthenticated." }));

    await expect(apiFetch("/orders", { token: "token-velho" })).rejects.toBeInstanceOf(ApiError);

    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it("does NOT clear a newer session when a stale in-flight request 401s after a fresh login replaced the token", async () => {
    // Reproduz a condição de corrida corrigida: um token antigo (ex.: de
    // ontem) ainda em voo quando um login novo já trocou o token salvo.
    window.localStorage.setItem(TOKEN_STORAGE_KEY, "token-velho");
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(401, { message: "Unauthenticated." }));

    // Login novo já aconteceu e substituiu o token ANTES da resposta atrasada chegar.
    window.localStorage.setItem(TOKEN_STORAGE_KEY, "token-novo-de-hoje");

    await expect(apiFetch("/auth/me", { token: "token-velho" })).rejects.toBeInstanceOf(ApiError);

    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBe("token-novo-de-hoje");
  });

  it("does not touch the session on a 401 for a request without a token (e.g. wrong login password)", async () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, "nao-deveria-mudar");
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(401, { message: "Credenciais inválidas." }));

    await expect(apiFetch("/auth/login")).rejects.toBeInstanceOf(ApiError);

    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBe("nao-deveria-mudar");
  });

  it("returns the parsed JSON body on success", async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(200, { data: "ok" }));

    await expect(apiFetch("/accounts", { token: "valido" })).resolves.toEqual({ data: "ok" });
  });

  it("throws ApiError with the response's error details on failure", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse(422, { message: "Dados inválidos.", errors: { email: ["já em uso"] } }),
    );

    await expect(apiFetch("/auth/register")).rejects.toMatchObject({
      status: 422,
      message: "Dados inválidos.",
      errors: { email: ["já em uso"] },
    });
  });
});
