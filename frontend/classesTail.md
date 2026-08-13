# Guia de Classes Tailwind (v4) — Scrap Dash Frontend

> Referência rápida das classes utilitárias do Tailwind usadas neste projeto.
> O Tailwind gera milhares de combinações numéricas (ex: `p-0` até `p-96`), então
> aqui você encontra **o padrão de cada categoria** + exemplos reais, e não uma
> lista exaustiva de cada número possível. Uma vez que você entende o padrão
> (ex: `p-{n}` = padding em múltiplos de 0.25rem), dá pra aplicar em qualquer valor.
>
> Cores, tamanhos de título e sombras customizados do projeto estão na seção
> [Tokens do projeto](#tokens-do-projeto-colorscss) no final — são as classes
> tipo `bg-primary`, `text-boxdark`, `text-title-md` que aparecem em quase toda tela.

---

## 1. Layout

| Classe | O que muda |
|---|---|
| `block` | `display: block` |
| `inline-block` | `display: inline-block` |
| `inline` | `display: inline` |
| `flex` | `display: flex` |
| `inline-flex` | `display: inline-flex` |
| `grid` | `display: grid` |
| `hidden` | `display: none` — some o elemento |
| `contents` | `display: contents` |

```tsx
<div className="hidden xl:flex">Só aparece em telas xl+</div>
```

### Posicionamento

| Classe | O que muda |
|---|---|
| `static` | `position: static` (padrão) |
| `relative` | `position: relative` |
| `absolute` | `position: absolute` |
| `fixed` | `position: fixed` |
| `sticky` | `position: sticky` |
| `top-0` / `right-0` / `bottom-0` / `left-0` | ancora a 0 no respectivo lado |
| `inset-0` | `top/right/bottom/left: 0` de uma vez |
| `z-10`, `z-50` | `z-index` (escala: 0, 10, 20, 30, 40, 50, auto) |

```tsx
<div className="relative">
  <span className="absolute top-0 right-0 z-10">Badge</span>
</div>
```

### Overflow

| Classe | O que muda |
|---|---|
| `overflow-hidden` | corta conteúdo que passa da caixa |
| `overflow-auto` | scroll automático quando necessário |
| `overflow-x-auto` / `overflow-y-auto` | scroll só no eixo X ou Y |
| `overflow-scroll` | scroll sempre visível |

---

## 2. Flexbox

| Classe | O que muda |
|---|---|
| `flex-row` | itens em linha (padrão) |
| `flex-col` | itens em coluna |
| `flex-wrap` | quebra linha quando não cabe |
| `flex-nowrap` | não quebra (padrão) |
| `items-start` / `items-center` / `items-end` | alinha no eixo cruzado |
| `items-stretch` | estica itens pra preencher (padrão) |
| `justify-start` / `justify-center` / `justify-end` | alinha no eixo principal |
| `justify-between` | espaço igual entre itens, nas pontas |
| `justify-around` | espaço igual ao redor de cada item |
| `flex-1` | cresce/encolhe pra preencher espaço |
| `flex-none` | não cresce nem encolhe |
| `grow` / `grow-0` | `flex-grow: 1` / `0` |
| `shrink` / `shrink-0` | `flex-shrink: 1` / `0` |

```tsx
<div className="flex flex-col items-center justify-between gap-4">
  <span>Item 1</span>
  <span>Item 2</span>
</div>
```

## 3. Grid

| Classe | O que muda |
|---|---|
| `grid-cols-3` | 3 colunas iguais (escala 1–12) |
| `grid-rows-2` | 2 linhas iguais |
| `col-span-2` | elemento ocupa 2 colunas |
| `row-span-2` | elemento ocupa 2 linhas |
| `col-start-2` / `col-end-4` | posição inicial/final na grade |
| `grid-cols-none` | remove definição de colunas |

```tsx
<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
  <div className="col-span-2 lg:col-span-1">Card</div>
</div>
```

---

## 4. Espaçamento (margin, padding, gap)

Escala padrão (múltiplos de `0.25rem` = 4px): `0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, ...`
Ex: `p-4` = `1rem` (16px), `p-8` = `2rem` (32px).

| Classe | O que muda |
|---|---|
| `p-4` | padding em todos os lados |
| `px-4` | padding horizontal (left + right) |
| `py-4` | padding vertical (top + bottom) |
| `pt-4` / `pr-4` / `pb-4` / `pl-4` | padding num lado só |
| `m-4` | margin em todos os lados (mesma lógica de `p-*`) |
| `mx-auto` | centraliza horizontalmente (margin left/right auto) |
| `-mt-4` | margin negativo (prefixo `-`) |
| `gap-4` | espaço entre itens de `flex`/`grid` |
| `gap-x-4` / `gap-y-4` | espaço só no eixo horizontal/vertical |
| `space-y-4` | espaço vertical entre filhos diretos (sem usar `gap`) |
| `space-x-4` | espaço horizontal entre filhos diretos |

```tsx
<div className="px-6 py-10 sm:px-10">
  <form className="flex flex-col gap-5">...</form>
</div>
```

---

## 5. Tamanho (width, height)

| Classe | O que muda |
|---|---|
| `w-full` | `width: 100%` |
| `w-screen` | `width: 100vw` |
| `w-1/2`, `w-1/3`, `w-2/3` | largura em frações |
| `w-4` | largura fixa na escala de espaçamento (1rem) |
| `w-fit` | `width: fit-content` |
| `w-auto` | `width: auto` |
| `max-w-4xl` | `max-width` (escala: xs, sm, md, lg, xl, 2xl...7xl, full, screen-sm...) |
| `min-w-0` | `min-width: 0` (útil pra truncar texto em flex) |
| `h-screen` | `height: 100vh` |
| `h-12` | altura fixa (mesma escala de espaçamento) |
| `min-h-screen` | `min-height: 100vh` |
| `max-h-96` | `max-height` limitada |

```tsx
<div className="flex min-h-screen w-full max-w-4xl items-center">...</div>
```

---

## 6. Tipografia

| Classe | O que muda |
|---|---|
| `text-xs` ... `text-9xl` | tamanho da fonte (escala padrão) |
| `font-thin` ... `font-black` | peso da fonte (100–900) |
| `font-medium` | peso 500 |
| `font-bold` | peso 700 |
| `italic` | `font-style: italic` |
| `not-italic` | remove itálico |
| `text-left` / `text-center` / `text-right` / `text-justify` | alinhamento |
| `underline` / `line-through` / `no-underline` | decoração de texto |
| `uppercase` / `lowercase` / `capitalize` | transformação de texto |
| `truncate` | corta com "..." em uma linha |
| `leading-tight` / `leading-normal` / `leading-loose` | `line-height` |
| `tracking-tight` / `tracking-wide` | `letter-spacing` |
| `whitespace-nowrap` | não quebra linha |
| `break-words` | quebra palavras longas |

```tsx
<h1 className="mb-2 text-title-sm font-bold text-black dark:text-white">Entrar</h1>
```

---

## 7. Cores (texto, fundo, borda)

Padrão: `{propriedade}-{cor}-{shade}`. Shades vão de `50` (mais claro) a `950` (mais escuro).

| Classe | O que muda |
|---|---|
| `text-red-500` | cor do texto |
| `bg-blue-600` | cor de fundo |
| `border-gray-200` | cor da borda |
| `text-white` / `bg-black` | cores fixas sem shade |
| `bg-primary` | cor de fundo com token custom do projeto (ver seção final) |
| `text-primary/50` | opacidade de 50% aplicada à cor (sufixo `/{0-100}`) |

```tsx
<button className="bg-primary text-white hover:bg-opacity-90">Entrar</button>
```

---

## 8. Bordas e Cantos

| Classe | O que muda |
|---|---|
| `border` | `border-width: 1px` em todos os lados |
| `border-2` | borda de 2px |
| `border-t` / `border-b` / `border-l` / `border-r` | borda só num lado |
| `border-stroke` | cor da borda (token do projeto) |
| `rounded` | `border-radius` padrão (0.25rem) |
| `rounded-sm` / `rounded-lg` / `rounded-full` | outros tamanhos de raio |
| `rounded-t-lg` | raio só no topo |
| `divide-y` | borda entre filhos diretos (empilhados) |

```tsx
<div className="rounded-sm border border-stroke dark:border-strokedark">...</div>
```

---

## 9. Efeitos (sombra, opacidade, filtros)

| Classe | O que muda |
|---|---|
| `shadow-sm` / `shadow` / `shadow-lg` | sombra da caixa (escala de intensidade) |
| `shadow-default` | sombra custom do projeto |
| `shadow-none` | remove sombra |
| `opacity-0` ... `opacity-100` | transparência do elemento (escala de 5 em 5 ou 10 em 10) |
| `blur-sm` / `blur-lg` | desfoque (`filter: blur`) |
| `grayscale` | remove cor (`filter: grayscale(100%)`) |

```tsx
<div className="rounded-sm shadow-default disabled:opacity-60">...</div>
```

---

## 10. Transições e Animação

| Classe | O que muda |
|---|---|
| `transition` | ativa transição suave nas propriedades comuns |
| `transition-colors` | transição só em cores |
| `transition-all` | transição em todas as propriedades |
| `duration-300` | duração da transição em ms |
| `ease-in` / `ease-out` / `ease-in-out` | curva de aceleração |
| `animate-spin` | rotação contínua (spinners) |
| `animate-pulse` | pulsação (loading skeletons) |

```tsx
<button className="bg-primary transition hover:bg-opacity-90">Entrar</button>
```

---

## 11. Interatividade

| Classe | O que muda |
|---|---|
| `cursor-pointer` | mostra mãozinha ao passar o mouse |
| `cursor-not-allowed` | mostra ícone de bloqueado |
| `pointer-events-none` | elemento ignora cliques/hover |
| `select-none` | impede seleção de texto |
| `outline-none` | remove contorno padrão de foco |
| `resize-none` | impede redimensionar `<textarea>` |

---

## 12. Variantes de estado (prefixos)

Qualquer classe acima pode ser combinada com um prefixo de estado:

| Prefixo | Quando aplica |
|---|---|
| `hover:` | ao passar o mouse |
| `focus:` | quando o elemento tem foco (inputs, botões) |
| `active:` | durante o clique |
| `disabled:` | quando o elemento está desabilitado |
| `focus-visible:` | foco por teclado (acessibilidade) |
| `group-hover:` | quando o pai com classe `group` está em hover |
| `first:` / `last:` | primeiro/último filho |

```tsx
<input className="border-stroke outline-none focus:border-primary" />
```

## 13. Responsividade (prefixos de breakpoint)

Mobile-first: a classe sem prefixo vale pra todos os tamanhos; o prefixo só *sobrescreve* a partir daquele breakpoint.

| Prefixo | Largura mínima |
|---|---|
| `sm:` | 640px |
| `md:` | 768px |
| `lg:` | 1024px |
| `xl:` | 1280px |
| `2xl:` | 1536px |

```tsx
<div className="hidden w-full xl:flex xl:w-1/2">
  Só some/aparece a partir de 1280px
</div>
```

## 14. Dark mode

Prefixo `dark:` aplica a classe quando o tema escuro está ativo (configurado via classe `dark` na `<html>`/`<body>` neste projeto).

```tsx
<p className="text-body dark:text-bodydark">Texto que muda de cor no dark mode</p>
```

---

## Tokens do projeto (`colors.css`)

Definidos em [colors.css](src/styles/colors.css) via `@theme` do Tailwind v4. **Nenhuma cor deve ser hardcoded fora desse arquivo** — sempre usar esses tokens em vez de `text-red-500`, `bg-[#3c50e0]`, etc.

### Cores (usar como `bg-*`, `text-*`, `border-*`)

| Token | Hex | Uso típico |
|---|---|---|
| `primary` | `#3c50e0` | cor principal da marca (botões, links) |
| `secondary` | `#80caee` | cor de apoio |
| `black` / `black-2` | `#1c2434` / `#010101` | texto em modo claro |
| `body` | `#64748b` | texto secundário (modo claro) |
| `bodydark` / `bodydark1` / `bodydark2` | tons de cinza claro | texto secundário (modo escuro) |
| `stroke` | `#e2e8f0` | bordas em modo claro |
| `strokedark` | `#2e3a47` | bordas em modo escuro |
| `form-strokedark` | `#3d4d60` | borda de inputs no modo escuro |
| `form-input` | `#1d2a39` | fundo de inputs no modo escuro |
| `gray`, `gray-2`, `gray-3`, `whiten`, `whiter` | tons de fundo claro | backgrounds de seções |
| `boxdark` / `boxdark-2` | `#24303f` / `#1a222c` | fundo de cards/página no modo escuro |
| `meta-1` a `meta-9` | cores variadas | badges, gráficos, status |
| `success` | `#219653` | mensagens/estados de sucesso |
| `danger` | `#d34053` | mensagens/estados de erro |
| `warning` | `#ffa70b` | mensagens/estados de alerta |

```tsx
<p className="text-sm text-danger">Não foi possível entrar.</p>
```

### Tamanhos de título (`text-title-*`)

| Token | Tamanho | Line-height |
|---|---|---|
| `text-title-xsm` | 18px | 24px |
| `text-title-sm` | 20px | 26px |
| `text-title-md` | 24px | 30px |
| `text-title-md2` | 26px | 30px |
| `text-title-lg` | 28px | 35px |
| `text-title-xl` | 36px | 45px |
| `text-title-xl2` | 33px | 45px |
| `text-title-xxl` | 44px | 55px |

```tsx
<h2 className="text-title-md font-bold">Scrap Dash</h2>
```

### Sombras

| Token | Uso |
|---|---|
| `shadow-1` | sombra leve |
| `shadow-2` | sombra um pouco mais forte |
| `shadow-default` | sombra padrão de cards/painéis |

```tsx
<div className="rounded-sm bg-white shadow-default dark:bg-boxdark">...</div>
```

---

## ⚠️ Erros comuns

- Tailwind **não gera CSS** pra classe que não existe — se você escrever `margin-left-2` ou `text-red` (sem shade), nada acontece e não aparece nenhum erro no console.
- Use sempre o nome real da utility: `ml-2` (não `margin-left-2`), `text-red-500` (não `text-red`).
- Classes dinâmicas construídas via template string (ex: `` `text-${cor}-500` ``) não funcionam — o Tailwind escaneia o código como texto e precisa ver a classe completa e literal.
