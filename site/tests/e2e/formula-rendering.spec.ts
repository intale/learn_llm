import { expect, test, type Page } from "@playwright/test";

import chapterLocaleManifest from "../../src/i18n/chapter-locales.json" with {
  type: "json",
};
import { expectNoOverflowOrClientScripts } from "./chapter-helpers";

const chapterIds = [
  "01-text-units",
  "02-corpus-partitions",
  "03-learn-bpe-merges",
  "04-apply-bpe-tokenizer",
  "05-autoregressive-examples",
  "06-bigram-baseline",
  "07-language-model-metrics",
] as const;
const chapter08To13Ids = [
  "08-tensor-storage",
  "09-tensor-views",
  "10-broadcasting-reductions",
  "11-matrix-multiplication",
  "12-stable-softmax",
  "13-gradient-checking",
] as const;
const chapter08To13Routes = chapter08To13Ids.flatMap((chapterId) => {
  const chapter = chapterLocaleManifest.chapters.find(
    (candidate) => candidate.chapterId === chapterId,
  );
  if (!chapter) {
    throw new Error(`Chapter-locale configuration has no ${chapterId} entry.`);
  }
  return chapter.activeLocales.map((locale) => ({ chapterId, locale }));
});
const chapter14To39Ids = [
  "14-scalar-autodiff",
  "15-tensor-autodiff-core",
  "16-model-autodiff-ops",
  "17-parameter-initialization",
  "18-token-embeddings",
  "19-linear-layers",
  "20-swiglu-feed-forward",
  "21-mini-batches",
  "22-adamw",
  "23-neural-ngram",
  "24-residual-connections",
  "25-rmsnorm",
  "26-qkv-projections",
  "27-self-attention",
  "28-causal-masking",
  "29-rope",
  "30-multi-head-attention",
  "31-decoder-block",
  "32-decoder-model",
  "33-training-selection",
  "34-final-evaluation",
  "35-checkpoints",
  "36-temperature-top-k",
  "37-incremental-attention",
  "38-cached-generation",
  "39-end-to-end-llm",
] as const;
const chapter14To39Routes = chapter14To39Ids.flatMap((chapterId) => {
  const chapter = chapterLocaleManifest.chapters.find(
    (candidate) => candidate.chapterId === chapterId,
  );
  if (!chapter) {
    throw new Error(`Chapter-locale configuration has no ${chapterId} entry.`);
  }
  return chapter.activeLocales.map((locale) => ({ chapterId, locale }));
});
const locales = ["en", "ru"] as const;
const viewports = {
  desktop: { width: 1280, height: 900 },
  narrow: { width: 390, height: 844 },
} as const;

async function expectCompatibleKatexLayout(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const problems = await page
    .locator(".lesson-body .katex-html")
    .evaluateAll((formulas) =>
      formulas.flatMap((formula, formulaIndex) => {
        const source =
          formula.parentElement
            ?.querySelector('annotation[encoding="application/x-tex"]')
            ?.textContent?.trim() ?? `formula ${formulaIndex}`;
        const struts = formula.querySelectorAll<HTMLElement>(
          ".strut, .katex-strut",
        );
        const problems =
          struts.length === 0
            ? [`${source} has no KaTeX layout strut`]
            : Array.from(struts).flatMap((strut, strutIndex) =>
                getComputedStyle(strut).display === "inline-block"
                  ? []
                  : [
                      `${source} strut ${strutIndex} is not laid out as inline-block`,
                    ],
              );
        const mathml =
          formula.parentElement?.querySelector<HTMLElement>(".katex-mathml");
        if (!mathml)
          problems.push(`${source} has no accessible MathML projection`);
        else {
          const style = getComputedStyle(mathml);
          if (style.display !== "block" || style.overflowX !== "clip") {
            problems.push(
              `${source} MathML is ${style.display} with ${style.overflowX} overflow`,
            );
          }
          if (style.clipPath === "none")
            problems.push(`${source} MathML has no clip path`);

          for (const element of mathml.querySelectorAll<MathMLElement>(
            "[mathvariant]",
          )) {
            const variant = element.getAttribute("mathvariant");
            if (variant !== "normal" || element.localName !== "mi") {
              problems.push(
                `${source} has unsupported mathvariant=${variant} on <${element.localName}>`,
              );
            }
          }

          const fixedArities = {
            mfrac: 2,
            mroot: 2,
            msub: 2,
            msup: 2,
            munder: 2,
            mover: 2,
            msubsup: 3,
            munderover: 3,
          } as const;
          for (const [tagName, expectedChildren] of Object.entries(
            fixedArities,
          )) {
            for (const element of mathml.querySelectorAll(tagName)) {
              if (element.children.length !== expectedChildren) {
                problems.push(
                  `${source} has <${tagName}> with ${element.children.length} children; expected ${expectedChildren}`,
                );
              }
            }
          }
        }
        return problems;
      }),
    );
  expect(problems).toEqual([]);
}

async function expectChapter30FractionMatrixLayout(page: Page) {
  const result = await page
    .locator(".lesson-body .katex-display")
    .evaluateAll((displays) => {
      const display = displays.find((candidate) =>
        candidate
          .querySelector('annotation[encoding="application/x-tex"]')
          ?.textContent?.includes("A^{(0)}="),
      ) as HTMLElement | undefined;
      if (!display)
        return { problems: ["missing the A^(0) causal-probability matrix"] };

      const base = display.querySelector<HTMLElement>(".katex");
      const fractionSizing = Array.from(
        display.querySelectorAll<HTMLElement>(
          ".sizing.reset-size6.size3, .katex-sizing.reset-size6.size3",
        ),
      );
      const fractions = Array.from(
        display.querySelectorAll<HTMLElement>(".mfrac"),
      );
      const problems: string[] = [];
      if (!base) problems.push("matrix has no visible KaTeX root");
      if (fractionSizing.length === 0)
        problems.push("matrix has no text-style fraction sizing");
      if (fractions.length < 5)
        problems.push(`matrix exposes only ${fractions.length} fractions`);

      const baseSize = base
        ? Number.parseFloat(getComputedStyle(base).fontSize)
        : 0;
      for (const [index, sizing] of fractionSizing.entries()) {
        const size = Number.parseFloat(getComputedStyle(sizing).fontSize);
        if (!(size > 0 && baseSize > 0 && size / baseSize < 0.85)) {
          problems.push(
            `fraction sizing ${index} is ${size}px against ${baseSize}px base`,
          );
        }
      }

      const fractionRects = fractions
        .map((fraction) => fraction.getBoundingClientRect())
        .filter((rect) => rect.width > 0 && rect.height > 0)
        .sort((left, right) => left.top - right.top);
      const rowBands: Array<{ top: number; bottom: number }> = [];
      for (const rect of fractionRects) {
        const existing = rowBands.find(
          (band) => Math.abs(band.top - rect.top) < 1,
        );
        if (existing) existing.bottom = Math.max(existing.bottom, rect.bottom);
        else rowBands.push({ top: rect.top, bottom: rect.bottom });
      }
      rowBands.sort((left, right) => left.top - right.top);
      for (let index = 1; index < rowBands.length; index += 1) {
        // Firefox's fraction line boxes can share less than one CSS pixel even
        // when their painted numerators and denominators are visibly separate.
        if (rowBands[index - 1]!.bottom > rowBands[index]!.top + 1) {
          problems.push(`fraction rows ${index - 1} and ${index} overlap`);
        }
      }

      return {
        problems,
        baseSize,
        fractionSizes: fractionSizing.map((node) =>
          Number.parseFloat(getComputedStyle(node).fontSize),
        ),
        rowBands,
      };
    });
  expect(result.problems).toEqual([]);
}
const formerMathCode = new Set([
  "i",
  "r",
  "k",
  "T",
  "S",
  "N",
  "s_k",
  "T+1",
  "x_i",
  "y_i",
  "C(a,b)",
  "-a",
  "-b",
  "256+r",
  "256+k",
  "encode_content(decode_content(z)) = z",
  "C_{ij}",
  "N_i",
  "alpha",
  "-ln p",
  "NLL",
  "PPL",
  "p=0",
  "exp(NLL/N)",
  "i_k",
  "s_k",
  "d=0",
  "2×3=6",
  "0 ≤ i_k < shape[k]",
  "n_k",
  "n'_j",
  "π(k)",
  "2×3 = 3×2 = 6",
  "start × stride[axis]",
  "0 + 1×1 = 1",
  "y_i",
  "beta_a(i)",
  "beta_b(i)",
  "usize::MAX × 2",
  "C[1,0]",
  "k=0",
  "K-1",
  "A[i,k]",
  "B[k,j]",
  "[...,M,K]",
  "[...,K,N]",
  "W^T",
  "K=0",
  "QK^T",
  "exp(1000)",
  "ln(1 + tail)",
  "1 + tail",
  "q(2.9)=8.41",
  "q(3.1)=9.61",
  "2h=0.2",
  "theta^2",
  "theta-h",
  "theta+h",
  "scale=max(1,abs(a),abs(n))",
  "scaled_error=abs(a/scale-n/scale)",
  "g(theta)=theta^3-2theta",
  "h=1e-5",
  "square=4",
  "loss=8",
  "bar(loss)=1",
  "bar(square)=2",
  "bar(x)=8",
  "square=x*x",
  "loss=square+square",
  "x*x + detach(x)*3",
  "2x^2",
  "4x",
  "bar(add) = [4,4,10,12,12,24]",
  "dbias=[16,16,34]",
  "dx=[4,12,4,12,10,24]",
  "bar(y)",
  "+=",
  "bar(E)[i,:] += bar(X)[b,t,:]",
  "1/sqrt(2)",
  "sqrt(3/2)",
  "[-a,a)",
  "a=sqrt(6/(fan-in+fan-out))",
  "dW",
  "exp(0)",
  "log(1)",
  "SiLU(0)",
  "+/-1000",
  "E",
  "V",
  "d",
  "d_in",
]);

const formerChapter14To38MathCode = new Set([
  "square=4",
  "loss=8",
  "bar(loss)=1",
  "bar(square)=2",
  "bar(x)=8",
  "square=x*x",
  "loss=square+square",
  "x*x + detach(x)*3",
  "2x^2",
  "4x",
  "bar(add) = [4,4,10,12,12,24]",
  "dbias=[16,16,34]",
  "dx=[4,12,4,12,10,24]",
  "bar(y)",
  "+=",
  "bar(E)[i,:] += bar(X)[b,t,:]",
  "1/sqrt(2)",
  "sqrt(3/2)",
  "[-a,a)",
  "a=sqrt(6/(fan-in+fan-out))",
  "dW",
  "exp(0)",
  "log(1)",
  "SiLU(0)",
  "+/-1000",
  "E",
  "V",
  "d",
  "d_in",
  "XW_g",
  "XW_u",
  "dX_p",
  "dW_g",
  "dW_u",
  "dW_2",
  "FFN(X)",
  "SiLU(z)",
  "|B|T",
  "3*2",
  "2*2",
  "1.75/4",
  "4/6",
  "theta_0",
  "g_1",
  "m_t",
  "v_t",
  "beta_1",
  "eta*lambda",
  "[0.923333,-1.9]",
  "hW_o",
  "C*D",
  "[B,C]",
  "[B,C,D]",
  "[B,CD]",
  "[B,H]",
  "[B,V]",
  "target_row(b)[C-1]",
  "y=x+F(x)",
  "F(x)=0",
  "bar(x)=bar(y)+J_F(x)^T bar(y)",
  "RMSNorm(x)=g*x/sqrt(mean(x^2)+epsilon)",
  "mean(x^2)",
  "epsilon=0",
  "Q=XW_Q",
  "K=XW_K",
  "V=XW_V",
  "W_Q",
  "W_K",
  "W_V",
  "[B,T,d_model]",
  "[B,T,d_head]",
  "QK^T",
  "1/sqrt(d_k)",
  "A=softmax(QK^T/sqrt(d_k))",
  "O=AV",
  "[B,T,T]",
  "[B,T,d_v]",
  "RoPE(x_m)",
  "theta_k",
  "n-m",
  "MHA(X)",
  "Concat",
  "W_O",
  "d_h",
  "[B,h,T,d_h]",
  "x'=x+MHA(RMSNorm(x))",
  "y=x'+FFN(RMSNorm(x'))",
  "N_theta",
  "E^T",
  "[B,T,V]",
  "ell=RMSNorm(B_N(...B_1(E[z])...))E^T",
  "bar(E)=bar(E_lookup)+bar(E_output)",
  "N in {0,1,2}",
  "o_{k+1}",
  "o_k",
  "b_k",
  "n_i^{(k)}",
  "o_0=h",
  "2874+8(5*4)=3034",
  "tau=0",
  "tau->0+",
  "1<=k<=V",
  "q_i",
  "[a_i,b_i)",
  "a_i<=u<b_i",
  "k=2",
  "k = 2",
  "k=3",
  "k = 3",
]);

const chapter08To13Latex: Record<
  (typeof chapter08To13Ids)[number],
  readonly string[]
> = {
  "08-tensor-storage": [String.raw`i_0s_0`, String.raw`0 \le i_k`],
  "09-tensor-views": [
    String.raw`2\cdot3=3\cdot2=6`,
    String.raw`QK^{\mathsf T}`,
  ],
  "10-broadcasting-reductions": [
    String.raw`\beta_{\mathrm{tokens}}`,
    String.raw`3\ne2`,
  ],
  "11-matrix-multiplication": [
    String.raw`C_{1,0}`,
    String.raw`4.0\cdot1.0=4.0`,
  ],
  "12-stable-softmax": [
    String.raw`[-1001,-1000]-(-1000)`,
    String.raw`\ln(1+\mathrm{tail})`,
  ],
  "13-gradient-checking": [String.raw`q(\theta)=\theta^2`, String.raw`s=\max`],
};

const chapter14To39FormulaLatex: Record<
  (typeof chapter14To39Ids)[number],
  readonly string[]
> = {
  "14-scalar-autodiff": [
    String.raw`\bar v=\sum_{e\in E(v)}\bar{c(e)}\,d_e`,
    String.raw`\bar{\mathrm{loss}}=1`,
    String.raw`2x^2`,
  ],
  "15-tensor-autodiff-core": [
    String.raw`\bar{\mathrm{add}}=[4,4,10,12,12,24]`,
    String.raw`\bar{p(e)}\mathrel{+}=J_e^\top\bar{c(e)},\qquad e\in E`,
  ],
  "16-model-autodiff-ops": [
    String.raw`\frac{\partial L}{\partial E_{i,:}}=`,
    String.raw`\bar E_{i,:}\mathrel{+}=\bar X_{b,t,:}`,
    String.raw`i=1,\;n=3`,
    String.raw`[3,2]`,
    String.raw`[]`,
  ],
  "17-parameter-initialization": [String.raw`1/\sqrt{2}`, String.raw`\Delta=`],
  "18-token-embeddings": [
    String.raw`E=\begin{bmatrix}`,
    String.raw`X_{b,t,:}=E_{z_{b,t},:}`,
    String.raw`E_{2,:}`,
    String.raw`e_{2}E`,
    String.raw`\left[30.000000000000,31.000000000000\right]`,
  ],
  "19-linear-layers": [
    String.raw`Y=XW+b`,
    String.raw`dX_{0}`,
    String.raw`1\cdot1+2\cdot2`,
  ],
  "20-swiglu-feed-forward": [
    String.raw`\operatorname{FFN}(X)=\left(\operatorname{SiLU}(XW_g)\odot(XW_u)\right)W_2`,
    String.raw`dA &= dS\odot\operatorname{SiLU}'(A)`,
    String.raw`h=s\odot u`,
    String.raw`dX_{0}`,
  ],
  "21-mini-batches": [
    String.raw`\mathcal{L}_B=\frac{1}{|B|T}\sum_{b\in B}\sum_{t=1}^{T}\mathcal{L}_{b,t}`,
    String.raw`\mathcal{L}_{B_{1}}=\frac{1.75}{4}=0.4375`,
    String.raw`|B|_{\mathrm{max}}=3`,
    String.raw`\bar g_{B_{1}}=\left[0.875000,1.562500\right]`,
  ],
  "22-adamw": [
    String.raw`m_t=\beta_1m_{t-1}+(1-\beta_1)g_t`,
    String.raw`\hat m_t=\frac{m_t}{1-\beta_1^t}`,
    String.raw`\hat m_t=\frac{m_t}{1-\beta_1^t},\quad \hat v_t=\frac{v_t}{1-\beta_2^t},\quad \theta_t=(1-\eta\lambda)\theta_{t-1}-\eta\frac{\hat m_t}{\sqrt{\hat v_t}+\varepsilon}`,
    String.raw`1-\beta_1^t=0.500000`,
    String.raw`\eta\lambda\theta=0.030000`,
    String.raw`q(x,y)=\frac12(x^2+4y^2)`,
    String.raw`\operatorname{diag}(H)=\left[1,4\right]`,
  ],
  "23-neural-ngram": [
    String.raw`[1,2]\to[1,2,4]\to[1,8]\to[1,8]\to[1,266]`,
    String.raw`h=\operatorname{SwiGLU}([E_{z_{t-C}},\ldots,E_{z_{t-1}}]),\quad \ell=hW_o`,
    String.raw`L=-\frac{1}{B}\sum_{b=1}^{B}\log`,
    String.raw`y_b=\operatorname{target\_row}(b)_{C-1}`,
    String.raw`V=266,\ C=2,\ D=4,\ H=8`,
    String.raw`L_{\mathrm{train}}=5.555850`,
    String.raw`L_{\mathrm{val}}=5.557362`,
    String.raw`\Delta L_{\mathrm{val}}=0.026120`,
  ],
  "24-residual-connections": [
    String.raw`y=x+F(x)`,
    String.raw`\operatorname{shape}(F(x))=\operatorname{shape}(x)=\operatorname{shape}(y)`,
    String.raw`\bar{x}=\bar{y}+J_F(x)^\top\bar{y}`,
    String.raw`J_F(x)^\top\bar y=[-0.500000,2.250000]`,
    String.raw`\bar W=[2.000000,2.000000,-1.000000,-1.000000]\ne0`,
  ],
  "25-rmsnorm": [
    String.raw`\operatorname{RMSNorm}(x)=`,
    String.raw`\operatorname{RMSNorm}_{0}(ax)=\operatorname{RMSNorm}_{0}(x)`,
    String.raw`\operatorname{mean}(\hat{x}^2)=`,
    String.raw`\bar x=[0.407293,-0.305470]`,
    String.raw`\bar g=[0.848528,-2.262741]`,
    String.raw`\Delta_{\mathrm{max}}=0.717566`,
  ],
  "26-qkv-projections": [
    String.raw`Q=XW_Q,\quad K=XW_K,\quad V=XW_V`,
    String.raw`W_Q,W_K,W_V\in\mathbb{R}^{d_{model}\times d_{head}}`,
    String.raw`Q,K,V\in\mathbb{R}^{B\times T\times d_{head}}`,
    String.raw`L=\langle Q,U_Q\rangle+\langle K,U_K\rangle+\langle V,U_V\rangle`,
    String.raw`\bar X=\bar QW_Q^{\mathsf T}+\bar KW_K^{\mathsf T}+\bar VW_V^{\mathsf T}`,
    String.raw`\bar W_Q=X_{(BT)}^{\mathsf T}\bar Q_{(BT)}`,
    String.raw`\bar X=\begin{bmatrix}3&1.5&1.5\\-1.5&3.5&-5\end{bmatrix}`,
    String.raw`\operatorname{shape}(Q)=[1,2,2]`,
  ],
  "27-self-attention": [
    String.raw`A=\operatorname{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right),\quad O=AV`,
    String.raw`QK^\top=\begin{bmatrix}0&6\\6&-4\end{bmatrix}`,
    String.raw`\sum_j A_{ij}=1`,
    String.raw`A_{bij}=\frac{\exp(S_{bij})}{\sum_{r=0}^{T-1}\exp(S_{bir})}`,
    String.raw`\bar X=\frac{\partial L}{\partial X}`,
    String.raw`L=\langle O,\bar O\rangle=O_{00}+O_{11}\approx-1.966576`,
    String.raw`\bar S_{bij}`,
    String.raw`A_{bij}\left(\bar A_{bij}-\sum_r A_{bir}\bar A_{bir}\right)`,
    String.raw`\bar Q_b=\frac{\bar S_bK_b}{\sqrt{d_k}}`,
    String.raw`0.079000&-0.039500\\`,
    String.raw`-0.014389&0.007195`,
    String.raw`A_{0,:}=[0.014166,0.985834]`,
    String.raw`d_k=2,\quad d_v=2`,
  ],
  "28-causal-masking": [
    String.raw`M_{ij}=\begin{cases}0&j\le i\\-\infty&j>i\end{cases},\quad A=\operatorname{softmax}(S+M)`,
    String.raw`A=\operatorname{softmax}(S+M),\qquad O=AV`,
    String.raw`\sum_{j=0}^{i}A_{bij}=1`,
    String.raw`A_{bij}=0,\qquad j>i`,
    String.raw`\bar S_{bij}=0,\qquad j>i`,
    String.raw`\frac{\partial L_{\le1}}{\partial q_2}`,
  ],
  "29-rope": [
    String.raw`\left(\operatorname{RoPE}(x_m)\right)_{2k:2k+2}`,
    String.raw`R(\phi)=`,
    String.raw`\theta_k=b^{-2k/d}`,
    String.raw`R(\alpha)^\top R(\beta)=R(\beta-\alpha)`,
    String.raw`\begin{bmatrix}\bar{x}_{2k}`,
  ],
  "30-multi-head-attention": [
    String.raw`\operatorname{MHA}(X)=\operatorname{Concat}(H_1,\ldots,H_h)W_O`,
    String.raw`d_h=\frac{d_{\mathrm{model}}}{h}=2`,
    String.raw`[B,T,d_{\mathrm{model}}]\to[B,h,T,d_h]`,
    String.raw`A_i=\operatorname{softmax}_{\mathrm{keys}}`,
    String.raw`H_i=A_iV_i`,
    String.raw`W_O\in\mathbb{R}^{d_{\mathrm{model}}\times d_{\mathrm{model}}}`,
  ],
  "31-decoder-block": [
    String.raw`x'=x+\operatorname{MHA}(\operatorname{RMSNorm}(x)),\quad`,
    String.raw`y=x'+\operatorname{FFN}(\operatorname{RMSNorm}(x'))`,
    String.raw`x,x',y\in\mathbb{R}^{B\times T\times d_{\mathrm{model}}}`,
    String.raw`N_\theta`,
    String.raw`\operatorname{LayerNorm}(x+\operatorname{MHA}(x))`,
  ],
  "32-decoder-model": [
    String.raw`\ell=\operatorname{RMSNorm}(B_N(\cdots B_1(E[z])\cdots))E^\top`,
    String.raw`\ell\in\mathbb{R}^{B\times T\times V}`,
    String.raw`\mathcal{L}=-\frac{1}{BT}`,
    String.raw`\bar E=\bar E_{\mathrm{lookup}}+\bar E_{\mathrm{output}}`,
    String.raw`\tau=2\times10^{-5}`,
    String.raw`E^\top`,
  ],
  "33-training-selection": [
    String.raw`\theta_{s+1}=\operatorname{AdamW}`,
    String.raw`s^*=\arg\min_s\mathcal{L}_{va}(\theta_s)`,
    String.raw`\widetilde g_s=\alpha_s g_s`,
    String.raw`\frac{\sum_j n_j\mathcal{L}^{(j)}_{va}}{\sum_j n_j}`,
    String.raw`s^*=8`,
    String.raw`\lVert g_s\rVert_2\leq0.35`,
  ],
  "34-final-evaluation": [
    String.raw`\mathcal{L}_{te}(\theta_{s^*})=-\frac{1}{N_{te}}`,
    String.raw`\sum_{n=1}^{N_{te}}\log p_{\theta_{s^*}}(y_n\mid x_n)`,
    String.raw`\frac{\sum_d N_d\mathcal{L}^{(d)}_{te}}{\sum_d N_d}`,
    String.raw`N_{te}=24`,
    String.raw`\Delta_{te}=0.629055`,
  ],
  "35-checkpoints": [
    String.raw`o_{k+1}=o_k+b_k\prod_i n_i^{(k)},\quad o_0=h`,
    String.raw`2874+8(5\cdot4)=3034`,
    String.raw`5+11+22=38`,
    String.raw`h=2869`,
    String.raw`[2869,2874)`,
    String.raw`o_{k+1}`,
    String.raw`o_k`,
    String.raw`b_k`,
    String.raw`n_i^{(k)}`,
    String.raw`\prod_i n_i^{(k)}`,
    String.raw`o_0=h`,
  ],
  "36-temperature-top-k": [
    String.raw`q_i^{(\tau,k)}=\frac{\mathbf{1}[i\in K_k]\exp(\ell_i/\tau)}{\sum_j\mathbf{1}[j\in K_k]\exp(\ell_j/\tau)}`,
    String.raw`\tau=0.5`,
    String.raw`q_1=0.268941421370`,
    String.raw`k=2`,
    String.raw`k=3`,
    String.raw`k=40`,
    String.raw`1\le k\le V`,
    String.raw`\tau\to0^+`,
    String.raw`\tau=0`,
    String.raw`[a_i,b_i)`,
    String.raw`a_i\le u<b_i`,
    String.raw`[0.211941557617,0.423883115234)`,
    String.raw`i_{\mathrm{EOS}}=4`,
  ],
  "37-incremental-attention": [
    String.raw`K^{(\ell)}_{1:t}=[K^{(\ell)}_{1:t-1};k^{(\ell)}_t],\quad V^{(\ell)}_{1:t}=[V^{(\ell)}_{1:t-1};v^{(\ell)}_t]`,
    String.raw`K_{2,0}=-1.325444263`,
    String.raw`K_{2,1}=0.493150590`,
    String.raw`\Delta_{\mathrm{max}}=0.000000000000`,
    String.raw`2\times3=6`,
    String.raw`10^{-12}`,
  ],
  "38-cached-generation": [
    String.raw`\sum_{t=1}^{T}t^2\in\Theta(T^3),\quad \sum_{t=1}^{T}t\in\Theta(T^2)`,
    String.raw`2\times10^{-12}`,
    String.raw`4(1+2+3)=24`,
    String.raw`4(2^2+3^2)=52`,
    String.raw`\Delta_{\mathrm{max}}=0.000000000000`,
    String.raw`4\times(1+2+3)=24`,
    String.raw`4\times(2^2+3^2)=52`,
    String.raw`N_{\mathrm{cache}}=6`,
    String.raw`z_{\mathrm{EOS}}=4`,
  ],
  "39-end-to-end-llm": [
    String.raw`P_\theta(z_{1:T})=\prod_{t=1}^{T}P_\theta(z_t\mid z_{<t})`,
    String.raw`C=4`,
    String.raw`3.981342714-3.866087547=0.115255167`,
    String.raw`3.866087547<3.981342714`,
  ],
};

test.describe("@formula-rendering:ch01-ch07 rendered formula contract", () => {
  for (const [viewportName, viewport] of Object.entries(viewports)) {
    for (const locale of locales) {
      for (const chapterId of chapterIds) {
        test(`${viewportName} ${locale}/${chapterId} exposes readable server-rendered math`, async ({
          page,
        }) => {
          await page.setViewportSize(viewport);
          const response = await page.goto(`/${locale}/course/${chapterId}/`);
          expect(response?.ok()).toBe(true);
          await expect(page.locator("article.lesson")).toBeVisible();
          await expectCompatibleKatexLayout(page);
          await expectNoOverflowOrClientScripts(page);

          const math = page.locator(".lesson-body .katex");
          const mathCount = await math.count();
          expect(
            mathCount,
            `${locale}/${chapterId} should render formulas`,
          ).toBeGreaterThan(0);
          await expect(
            page.locator(
              '.lesson-body .katex annotation[encoding="application/x-tex"]',
            ),
          ).toHaveCount(mathCount);
          await expect(
            page.locator(".lesson-body .katex .katex-mathml"),
          ).toHaveCount(mathCount);

          const geometryProblems = await page
            .locator(
              ".lesson-body .katex-display, .lesson-body [data-inline-math] > .katex",
            )
            .evaluateAll((nodes) =>
              nodes.flatMap((node, index) => {
                const element = node as HTMLElement;
                const rect = element.getBoundingClientRect();
                const problems: string[] = [];
                if (
                  rect.left < -1 ||
                  rect.right > document.documentElement.clientWidth + 1
                ) {
                  problems.push(
                    `formula ${index} escapes the viewport horizontally`,
                  );
                }
                if (rect.height <= 0 || rect.width <= 0) {
                  problems.push(`formula ${index} has no visible box`);
                }
                const { overflowY } = getComputedStyle(element);
                if (
                  ["auto", "clip", "hidden", "scroll"].includes(overflowY) &&
                  element.scrollHeight > element.clientHeight + 2
                ) {
                  problems.push(`formula ${index} clips vertically`);
                }

                if (element.classList.contains("katex-display")) {
                  const container = element.parentElement;
                  const next =
                    container?.nextElementSibling as HTMLElement | null;
                  if (container && next) {
                    const nextRect = next.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();
                    if (containerRect.bottom > nextRect.top + 1) {
                      problems.push(
                        `formula ${index} overlaps the following block`,
                      );
                    }
                  }
                }
                return problems;
              }),
            );
          expect(geometryProblems).toEqual([]);

          const inlineCode = await page
            .locator(".lesson-body :not(pre) > code")
            .allInnerTexts();
          expect(
            inlineCode.filter((value) => formerMathCode.has(value.trim())),
          ).toEqual([]);

          if (chapterId === "02-corpus-partitions") {
            await expect(
              page.locator(
                '[data-assigned-count="12"] annotation[encoding="application/x-tex"]',
              ),
            ).toHaveText(String.raw`\frac{12}{12}`);
          }
          if (chapterId === "04-apply-bpe-tokenizer") {
            await expect(
              page.locator(
                '[data-inline-math] annotation[encoding="application/x-tex"]',
              ),
            ).toHaveText("+2");
          }
        });
      }
    }
  }
});

test.describe("@formula-rendering:ch08-ch13 rendered formula contract", () => {
  for (const [viewportName, viewport] of Object.entries(viewports)) {
    for (const { chapterId, locale } of chapter08To13Routes) {
      test(`${viewportName} ${locale}/${chapterId} exposes readable server-rendered math`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        const response = await page.goto(`/${locale}/course/${chapterId}/`);
        expect(response?.ok()).toBe(true);
        await expect(page.locator("article.lesson")).toBeVisible();
        await expectCompatibleKatexLayout(page);
        await expectNoOverflowOrClientScripts(page);

        const math = page.locator(".lesson-body .katex");
        const mathCount = await math.count();
        expect(
          mathCount,
          `${locale}/${chapterId} should render formulas`,
        ).toBeGreaterThan(0);
        await expect(
          page.locator(
            '.lesson-body .katex annotation[encoding="application/x-tex"]',
          ),
        ).toHaveCount(mathCount);
        await expect(
          page.locator(".lesson-body .katex .katex-mathml"),
        ).toHaveCount(mathCount);
        await expect(page.locator(".lesson-body .katex-error")).toHaveCount(0);

        const latex = await page
          .locator(
            '.lesson-body .katex annotation[encoding="application/x-tex"]',
          )
          .evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ""));
        for (const fragment of chapter08To13Latex[chapterId]) {
          expect(
            latex.some((expression) => expression.includes(fragment)),
            `${locale}/${chapterId} should render ${fragment}`,
          ).toBe(true);
        }

        const geometryProblems = await page
          .locator(
            ".lesson-body .katex-display, .lesson-body [data-inline-math] > .katex",
          )
          .evaluateAll((nodes) =>
            nodes.flatMap((node, index) => {
              const element = node as HTMLElement;
              const rect = element.getBoundingClientRect();
              const problems: string[] = [];
              const source =
                element
                  .querySelector('annotation[encoding="application/x-tex"]')
                  ?.textContent?.trim() ?? `index ${index}`;
              let scrollAncestor: HTMLElement | null = element.parentElement;
              let containedByHorizontalScroller = false;
              while (scrollAncestor && scrollAncestor !== document.body) {
                const { overflowX } = getComputedStyle(scrollAncestor);
                if (
                  ["auto", "scroll"].includes(overflowX) &&
                  scrollAncestor.scrollWidth > scrollAncestor.clientWidth + 1
                ) {
                  containedByHorizontalScroller = true;
                  break;
                }
                scrollAncestor = scrollAncestor.parentElement;
              }
              if (
                (rect.left < -1 ||
                  rect.right > document.documentElement.clientWidth + 1) &&
                !containedByHorizontalScroller
              ) {
                problems.push(
                  `formula ${source} escapes the viewport horizontally`,
                );
              }
              if (rect.height <= 0 || rect.width <= 0) {
                problems.push(`formula ${source} has no visible box`);
              }
              const { overflowY } = getComputedStyle(element);
              if (
                ["auto", "clip", "hidden", "scroll"].includes(overflowY) &&
                element.scrollHeight > element.clientHeight + 2
              ) {
                problems.push(`formula ${source} clips vertically`);
              }
              if (element.classList.contains("katex-display")) {
                const container = element.parentElement;
                const next =
                  container?.nextElementSibling as HTMLElement | null;
                if (container && next) {
                  const nextRect = next.getBoundingClientRect();
                  const containerRect = container.getBoundingClientRect();
                  if (containerRect.bottom > nextRect.top + 1) {
                    problems.push(
                      `formula ${source} overlaps the following block`,
                    );
                  }
                }
              }
              return problems;
            }),
          );
        expect(geometryProblems).toEqual([]);

        const inlineCode = await page
          .locator(".lesson-body :not(pre) > code")
          .allInnerTexts();
        expect(
          inlineCode.filter((value) => formerMathCode.has(value.trim())),
        ).toEqual([]);
      });
    }
  }
});

test.describe("@formula-rendering:Chapter 14-39 active-locale rendered formula contract", () => {
  for (const [viewportName, viewport] of Object.entries(viewports)) {
    for (const { chapterId, locale } of chapter14To39Routes) {
      test(`${viewportName} ${locale}/${chapterId} exposes readable server-rendered math`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        const response = await page.goto(`/${locale}/course/${chapterId}/`);
        expect(response?.ok()).toBe(true);
        await expect(page.locator("article.lesson")).toBeVisible();
        await expectCompatibleKatexLayout(page);
        if (chapterId === "30-multi-head-attention") {
          await expectChapter30FractionMatrixLayout(page);
        }
        await expectNoOverflowOrClientScripts(page);

        const math = page.locator(".lesson-body .katex");
        const mathCount = await math.count();
        expect(
          mathCount,
          `${chapterId} should render formulas`,
        ).toBeGreaterThan(0);
        await expect(
          page.locator(
            '.lesson-body .katex annotation[encoding="application/x-tex"]',
          ),
        ).toHaveCount(mathCount);
        await expect(
          page.locator(".lesson-body .katex .katex-mathml"),
        ).toHaveCount(mathCount);
        await expect(page.locator(".lesson-body .katex-error")).toHaveCount(0);

        const latex = await page
          .locator(
            '.lesson-body .katex annotation[encoding="application/x-tex"]',
          )
          .evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ""));
        expect(
          latex.some((expression) => expression.includes(String.raw`\*`)),
          `${chapterId} must not render the malformed TeX control symbol \\*`,
        ).toBe(false);
        for (const fragment of chapter14To39FormulaLatex[chapterId]) {
          expect(
            latex.some((expression) => expression.includes(fragment)),
            `${chapterId} should render ${fragment}`,
          ).toBe(true);
        }
        if (chapterId === "16-model-autodiff-ops") {
          const diagramLatex = await page
            .locator(
              'figure[data-visualization-id="model-autodiff-ops"] annotation[encoding="application/x-tex"]',
            )
            .allTextContents();
          for (const expression of [
            String.raw`i=1,\;n=3`,
            "[3,2]",
            "[4,2]",
            "[2,2]",
            "[]",
          ]) {
            expect(
              diagramLatex.includes(expression),
              `${locale}/${chapterId} diagram should render ${expression}`,
            ).toBe(true);
          }
        }

        const geometryProblems = await page
          .locator(
            ".lesson-body .katex-display, .lesson-body [data-inline-math] > .katex, .lesson-body .diagram-math .katex",
          )
          .evaluateAll((nodes) =>
            nodes.flatMap((node, index) => {
              const element = node as HTMLElement;
              const rect = element.getBoundingClientRect();
              const problems: string[] = [];
              const source =
                element
                  .querySelector('annotation[encoding="application/x-tex"]')
                  ?.textContent?.trim() ?? `index ${index}`;
              let scrollAncestor: HTMLElement | null = element.parentElement;
              let containedByHorizontalScroller = false;
              while (scrollAncestor && scrollAncestor !== document.body) {
                const { overflowX } = getComputedStyle(scrollAncestor);
                if (
                  ["auto", "scroll"].includes(overflowX) &&
                  scrollAncestor.scrollWidth > scrollAncestor.clientWidth + 1
                ) {
                  containedByHorizontalScroller = true;
                  break;
                }
                scrollAncestor = scrollAncestor.parentElement;
              }
              if (
                (rect.left < -1 ||
                  rect.right > document.documentElement.clientWidth + 1) &&
                !containedByHorizontalScroller
              ) {
                problems.push(
                  `formula ${source} escapes the viewport horizontally`,
                );
              }
              if (rect.height <= 0 || rect.width <= 0) {
                problems.push(`formula ${source} has no visible box`);
              }
              const { direction, overflowY } = getComputedStyle(element);
              if (direction !== "ltr") {
                problems.push(`formula ${source} has ${direction} direction`);
              }
              if (
                ["auto", "clip", "hidden", "scroll"].includes(overflowY) &&
                element.scrollHeight > element.clientHeight + 2
              ) {
                problems.push(`formula ${source} clips vertically`);
              }
              if (element.classList.contains("katex-display")) {
                const container = element.parentElement;
                const next =
                  container?.nextElementSibling as HTMLElement | null;
                if (container && next) {
                  const nextRect = next.getBoundingClientRect();
                  const containerRect = container.getBoundingClientRect();
                  if (containerRect.bottom > nextRect.top + 1) {
                    problems.push(
                      `formula ${source} overlaps the following block`,
                    );
                  }
                }
              }
              return problems;
            }),
          );
        expect(geometryProblems).toEqual([]);

        const inlineCode = await page
          .locator(".lesson-body :not(pre) > code")
          .allInnerTexts();
        expect(
          inlineCode.filter((value) =>
            formerChapter14To38MathCode.has(value.trim()),
          ),
        ).toEqual([]);
      });
    }
  }
});
