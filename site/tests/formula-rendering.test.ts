// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { readFileSync } from "node:fs";
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

declare const process: { cwd(): string };

const chapter00Files = ["00-llm-parts.mdx"] as const;
const chapterFiles = [
  "01-text-units.mdx",
  "02-corpus-partitions.mdx",
  "03-learn-bpe-merges.mdx",
  "04-apply-bpe-tokenizer.mdx",
  "05-autoregressive-examples.mdx",
  "06-bigram-baseline.mdx",
  "07-language-model-metrics.mdx",
] as const;
const chapter08To13Files = [
  "08-tensor-storage.mdx",
  "09-tensor-views.mdx",
  "10-broadcasting-reductions.mdx",
  "11-matrix-multiplication.mdx",
  "12-stable-softmax.mdx",
  "13-gradient-checking.mdx",
] as const;
const chapter14To39Files = [
  "14-scalar-autodiff.mdx",
  "15-tensor-autodiff-core.mdx",
  "16-model-autodiff-ops.mdx",
  "17-parameter-initialization.mdx",
  "18-token-embeddings.mdx",
  "19-linear-layers.mdx",
  "20-swiglu-feed-forward.mdx",
  "21-mini-batches.mdx",
  "22-adamw.mdx",
  "23-neural-ngram.mdx",
  "24-residual-connections.mdx",
  "25-rmsnorm.mdx",
  "26-qkv-projections.mdx",
  "27-self-attention.mdx",
  "28-causal-masking.mdx",
  "29-rope.mdx",
  "30-multi-head-attention.mdx",
  "31-decoder-block.mdx",
  "32-decoder-model.mdx",
  "33-training-selection.mdx",
  "34-final-evaluation.mdx",
  "35-checkpoints.mdx",
  "36-temperature-top-k.mdx",
  "37-incremental-attention.mdx",
  "38-cached-generation.mdx",
  "39-end-to-end-llm.mdx",
] as const;
const locales = ["en", "ru"] as const;
const chapterRoot = resolve(process.cwd(), "src/content/chapters");
const componentRoot = resolve(process.cwd(), "src/components");
const packageManifestPath = resolve(process.cwd(), "package.json");
const packageLockPath = resolve(process.cwd(), "package-lock.json");

function readChapter(locale: (typeof locales)[number], file: string): string {
  return readFileSync(resolve(chapterRoot, locale, file), "utf8");
}

function withoutFrontmatter(source: string): string {
  const result = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  expect(result, "chapter frontmatter must be present").not.toBe(source);
  return result;
}

function jsonFrontmatter(source: string): Record<string, unknown> {
  const match = source.match(/^---\r?\n(\{[\s\S]*?\})\r?\n---\r?\n/);
  expect(match, "JSON chapter frontmatter must be present").not.toBeNull();
  return JSON.parse(match![1]) as Record<string, unknown>;
}

function withoutFencedCode(source: string): string {
  return source.replace(/```[\s\S]*?```/g, "");
}

function mathMarkup(source: string) {
  const body = withoutFencedCode(withoutFrontmatter(source));
  const display = body.match(/\$\$[\s\S]+?\$\$/g) ?? [];
  const withoutDisplay = body.replace(/\$\$[\s\S]+?\$\$/g, "");
  const inline =
    withoutDisplay.match(/(?<!\\)\$(?!\$)[^$\r\n]+?(?<!\\)\$/g) ?? [];
  return { body, display, inline };
}

function proseOutsideMathAndCode(source: string): string {
  return withoutFencedCode(withoutFrontmatter(source))
    .replace(/\$\$[\s\S]+?\$\$/g, "")
    .replace(/(?<!\\)\$(?!\$)[^$\r\n]+?(?<!\\)\$/g, "")
    .replace(/(?<!`)`([^`\r\n]+)`(?!`)/g, "");
}

function inlineCode(source: string): string[] {
  const body = withoutFencedCode(withoutFrontmatter(source));
  return [...body.matchAll(/(?<!`)`([^`\r\n]+)`(?!`)/g)].map(
    (match) => match[1],
  );
}

const requiredBodyMath: Record<string, readonly string[]> = {
  "01": [String.raw`z_i`],
  "02": [String.raw`\mathcal{D}_{tr}`],
  "03": [String.raw`C(a,b)`],
  "04": [String.raw`\operatorname{encode}_{content}`],
  "05": [String.raw`T+1`, String.raw`x_i`],
  "06": [String.raw`C_{ij}`, String.raw`\alpha`],
  "07": [String.raw`-\ln`, String.raw`\operatorname{PPL}`],
};

const formerMathCodeSpans = [
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
] as const;

const rawFormulaPatterns = [
  /\bC\s*\(\s*[ab]\s*,\s*[ab]\s*\)/,
  /\b256\s*\+\s*[rk]\b/,
  /\bT\s*\+\s*1\b/,
  /\b[xy]_i\b/,
  /\bs_k\b/,
  /\bC_\{ij\}\b/,
  /\bN_i\b/,
  /-\s*(?:ln|log)\s+p\b/i,
  /\bp\s*=\s*0\b/,
  /\b(?:NLL|PPL)\s*=/,
] as const;

const suspiciousCode =
  /(?:[=+*/−×÷≤≥≠≈∞→]|->|\b(?:T|S|N|p|q|x|y|z|i|j|k|r)\b|\\(?:frac|sum|ln|log|exp)|_[{A-Za-z0-9])/;
const documentedLiteralData = [
  {
    name: "Unicode scalar notation",
    pattern: /^(?:U\+[0-9A-F]+|\[[^\]]*\bU\+[0-9A-F]+\b[^\]]*\])$/i,
  },
  {
    name: "literal count ratios emitted by examples",
    pattern: /^\d+(?:\s*\/\s*\d+)+$/,
  },
  {
    name: "literal Rust ranges",
    pattern: /^\d+\.\.=\d+$/,
  },
  {
    name: "literal trace fields",
    pattern: /^(?:index|test_selectable|target_count)=(?:\d+|yes|no)$/,
  },
  {
    name: "literal signed floating-point output",
    pattern: /^\+0\.0$/,
  },
  {
    name: "repository paths",
    pattern: /^(?:rust|src|examples)\//,
  },
  {
    name: "concrete shell commands",
    pattern: /^(?:cargo|docker|git|npm)\s/,
  },
  {
    name: "concrete API identifiers",
    pattern:
      /^(?=.{5,}$)(?:[A-Za-z][A-Za-z0-9]*(?:::|\.))?(?:[A-Za-z][A-Za-z0-9]*_)+[A-Za-z][A-Za-z0-9]*(?:\([^\r\n]*\))?$/,
  },
  {
    name: "literal token-transition records",
    pattern: /^[A-Z]+(?:\(\d+\))?→[A-Z]+(?:\(\d+\))?$/,
  },
  {
    name: "literal input-target records",
    pattern: /^\[[^\]]+\]\s*->\s*\[[^\]]+\]$/,
  },
  {
    name: "concrete Rust type signatures",
    pattern: /^[A-Za-z][\w:<>]*(?:\s*->\s*[A-Za-z][\w:<>, ]*)$/,
  },
] as const;

const requiredChapter08To13Math: Record<string, readonly string[]> = {
  "08": [String.raw`i_0s_0`, String.raw`0 \le i_k`, String.raw`[|V|,m]=[5,3]`],
  "09": [
    String.raw`2\cdot3=3\cdot2=6`,
    String.raw`QK^{\mathsf T}`,
    String.raw`\operatorname{start}\cdot\operatorname{stride}`,
  ],
  "10": [
    String.raw`\begin{bmatrix}`,
    String.raw`\beta_{\mathrm{tokens}}`,
    String.raw`n-1`,
  ],
  "11": [
    String.raw`C_{1,0}`,
    String.raw`y=b+Wx+U\tanh(d+Hx)`,
    String.raw`QK^{\mathsf T}`,
  ],
  "12": [
    String.raw`[-1001,-1000]-(-1000)`,
    String.raw`\exp(1000)`,
    String.raw`\ln(1+\mathrm{tail})`,
  ],
  "13": [
    String.raw`q(\theta)=\theta^2`,
    String.raw`s=\max`,
    String.raw`\left\lfloor k(N-1)/(S-1)\right\rfloor`,
  ],
};

const formerChapter08To13MathCodeSpans = [
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
] as const;

const rawChapter08To13FormulaPatterns = [
  /\bi_k\b/,
  /\bs_k\b/,
  /\bn'_j\b/,
  /\bQ\s*\/\s*K\s*\/\s*V\b/,
  /\bQK(?:\^T|ᵀ)\b/,
  /\bbeta_(?:tokens|bias)\s*\(/,
  /\bsoftmax\s*\(\s*QK/i,
  /\b(?:exp|ln|sqrt)\s*\([^)]*\)/i,
  /\bq\s*\(\s*theta/i,
  /\bg\s*\(\s*theta/i,
  /\b(?:theta|h|scale|scaled_error)\s*=/i,
  /\d\s*[×*]\s*\d\s*=/,
] as const;

const documentedChapter08To13Code = [
  {
    name: "literal Rust shapes, coordinates, vectors, and matrices",
    pattern: /^\[[^\r\n]*\]$/,
  },
  {
    name: "literal numeric fixture or tolerance values",
    pattern: /^[+-]?(?:\d+(?:\.\d+)?)(?:e[+-]?\d+)?$/i,
  },
  {
    name: "concrete Rust APIs, identifiers, and types",
    pattern:
      /^&?[A-Za-z][A-Za-z0-9_]*(?:(?:::|\.)[A-Za-z][A-Za-z0-9_]*)*(?:<[^>\r\n]+>)?(?:\([^\r\n]*\))?(?:\[[^\]\r\n]+\])?$/,
  },
  {
    name: "literal typed error records",
    pattern: /^[A-Za-z][A-Za-z0-9_]*\s*\{[^}\r\n]*\}$/,
  },
  {
    name: "concrete source and trace filenames",
    pattern: /^[A-Za-z0-9_-]+\.(?:rs|txt|py)$/,
  },
  {
    name: "literal Rust ranges",
    pattern: /^\d+\.\.=*\d+$/,
  },
  {
    name: "literal trace or boolean fields",
    pattern: /^(?:keep dimension|[A-Za-z][A-Za-z0-9_]*=(?:true|false))$/i,
  },
] as const;

const requiredChapter14To39Math: Record<string, readonly string[]> = {
  "14": [
    String.raw`\bar{\mathrm{loss}}=1`,
    String.raw`\mathrm{square}=x\cdot x`,
    String.raw`2x^2`,
  ],
  "15": [
    String.raw`\bar{\mathrm{add}}=[4,4,10,12,12,24]`,
    String.raw`\bar{\mathrm{bias}}=[16,16,34]`,
    String.raw`\mathrel{+}=`,
  ],
  "16": [
    String.raw`dE=`,
    String.raw`-\frac{3}{8}`,
    String.raw`\bar E_{i,:}\mathrel{+}=\bar X_{b,t,:}`,
  ],
  "17": [String.raw`1/\sqrt{2}`, String.raw`[-a,a)`, String.raw`a=\sqrt{6/`],
  "18": [
    String.raw`X_{b,t,:}=E_{z_{b,t},:}`,
    String.raw`\bar{X}_{b,t,:}=\partial L/\partial X_{b,t,:}`,
    String.raw`[1,0]+[3,4]=[4,4]`,
  ],
  "19": [
    String.raw`Y=XW+b`,
    String.raw`G=\partial L/\partial Y`,
    String.raw`[d_{in},d_{out}]`,
  ],
  "20": [
    String.raw`\operatorname{FFN}(X)`,
    String.raw`\operatorname{SiLU}(z)=z\sigma(z)`,
    String.raw`A=XW_g`,
    String.raw`dA &= dS\odot\operatorname{SiLU}'(A)`,
    String.raw`dX_p &= dA_pW_g^\top+dU_pW_u^\top`,
    String.raw`dW_2 &= \sum_p H_p^\top G_p`,
  ],
  "21": [
    String.raw`\mathcal{L}_B=\frac{1}{|B|T}`,
    String.raw`\nabla_{\theta}\mathcal{L}_B`,
    String.raw`\bar g=`,
    String.raw`\mathcal{L}_{B_1}=\frac{1.75}{2\cdot2}=0.4375`,
  ],
  "22": [
    String.raw`m_t=\beta_1m_{t-1}+(1-\beta_1)g_t`,
    String.raw`\hat m_t=\frac{m_t}{1-\beta_1^t}`,
    String.raw`\hat m_t=\frac{m_t}{1-\beta_1^t},\quad \hat v_t=\frac{v_t}{1-\beta_2^t},\quad \theta_t=(1-\eta\lambda)\theta_{t-1}-\eta\frac{\hat m_t}{\sqrt{\hat v_t}+\varepsilon}`,
    String.raw`\eta\lambda\theta_0=[0.01,-0.02]`,
    String.raw`q(x,y)=\frac12(x^2+4y^2)`,
  ],
  "23": [
    String.raw`[1,2]\to[1,2,4]\to[1,8]\to[1,8]\to[1,266]`,
    String.raw`h=\operatorname{SwiGLU}([E_{z_{t-C}},\ldots,E_{z_{t-1}}]),\quad \ell=hW_o`,
    String.raw`L=-\frac{1}{B}\sum_{b=1}^{B}\log`,
    String.raw`y_b=\operatorname{target\_row}(b)_{C-1}`,
  ],
  "24": [
    String.raw`y=x+F(x)`,
    String.raw`\operatorname{shape}(F(x))=\operatorname{shape}(x)=\operatorname{shape}(y)`,
    String.raw`\bar{x}=\bar{y}+J_F(x)^\top\bar{y}`,
    String.raw`y=x+\alpha F(x)`,
  ],
  "25": [
    String.raw`\operatorname{RMSNorm}(x)`,
    String.raw`\operatorname{RMSNorm}_{0}(ax)=\operatorname{RMSNorm}_{0}(x)`,
    String.raw`\operatorname{mean}(\hat{x}^2)`,
    String.raw`\bar g\approx[0.848528,-2.262741]`,
  ],
  "26": [
    String.raw`Q=XW_Q,\quad K=XW_K,\quad V=XW_V`,
    String.raw`W_Q,W_K,W_V\in\mathbb{R}^{d_{model}\times d_{head}}`,
    String.raw`L=\langle Q,U_Q\rangle+\langle K,U_K\rangle+\langle V,U_V\rangle`,
    String.raw`\bar X=\begin{bmatrix}3&1.5&1.5\\-1.5&3.5&-5\end{bmatrix}`,
  ],
  "27": [
    String.raw`A=\operatorname{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right),\quad O=AV`,
    String.raw`\sum_j A_{ij}=1`,
    String.raw`A_{bij}=\frac{\exp(S_{bij})}{\sum_{r=0}^{T-1}\exp(S_{bir})}`,
    String.raw`\bar Q\approx[0.079000,-0.039500,-0.014389,0.007195]`,
  ],
  "28": [
    String.raw`M_{ij}=`,
    String.raw`A=\operatorname{softmax}(S+M),\qquad O=AV`,
    String.raw`\sum_{j=0}^{i}A_{bij}=1`,
    String.raw`A_{bij}=0\quad\text{when }j>i`,
    String.raw`\bar S_{bij}=0\quad\text{when }j>i`,
    String.raw`\frac{\partial L_{\le1}}{\partial q_2}`,
  ],
  "29": [
    String.raw`\left(\operatorname{RoPE}(x_m)\right)_{2k:2k+2}`,
    String.raw`R(\phi)=`,
    String.raw`\theta_k=b^{-2k/d}`,
    String.raw`R(a)^\top R(b)=R(b-a)`,
    String.raw`\begin{bmatrix}\bar{x}_{2k}`,
  ],
  "30": [
    String.raw`\operatorname{MHA}(X)=\operatorname{Concat}(H_1,\ldots,H_h)W_O`,
    String.raw`d_h=\frac{d_{\mathrm{model}}}{h}=2`,
    String.raw`A_i=\operatorname{softmax}_{\mathrm{keys}}`,
    String.raw`H_i=A_iV_i`,
    String.raw`W_O\in\mathbb{R}^{d_{\mathrm{model}}\times d_{\mathrm{model}}}`,
  ],
  "31": [
    String.raw`x'=x+\operatorname{MHA}(\operatorname{RMSNorm}(x)),\quad`,
    String.raw`y=x'+\operatorname{FFN}(\operatorname{RMSNorm}(x'))`,
    String.raw`x,x',y\in\mathbb{R}^{B\times T\times d_{\mathrm{model}}}`,
    String.raw`N_\theta`,
    String.raw`\operatorname{LayerNorm}(x+\operatorname{MHA}(x))`,
  ],
  "32": [
    String.raw`\ell=\operatorname{RMSNorm}(B_N(\cdots B_1(E[z])\cdots))E^\top`,
    String.raw`\ell\in\mathbb{R}^{B\times T\times V}`,
    String.raw`\mathcal{L}=-\frac{1}{BT}`,
    String.raw`\bar E=\bar E_{\mathrm{lookup}}+\bar E_{\mathrm{output}}`,
    String.raw`\tau=2\times10^{-5}`,
  ],
  "33": [
    String.raw`\theta_{s+1}=\operatorname{AdamW}`,
    String.raw`s^*=\arg\min_s\mathcal{L}_{va}(\theta_s)`,
    String.raw`\widetilde g_s=\alpha_s g_s`,
    String.raw`\frac{\sum_j n_j\mathcal{L}^{(j)}_{va}}{\sum_j n_j}`,
    String.raw`s^*=\min\left\{s:\mathcal{L}_{va}(\theta_s)`,
  ],
  "34": [
    String.raw`\mathcal{L}_{te}(\theta_{s^*})=-\frac{1}{N_{te}}`,
    String.raw`\sum_{n=1}^{N_{te}}\log p_{\theta_{s^*}}(y_n\mid x_n)`,
    String.raw`\frac{\sum_d N_d\mathcal{L}^{(d)}_{te}}{\sum_d N_d}`,
    String.raw`N_{te}=24`,
    String.raw`\Delta_{te}=0.629055`,
  ],
  "35": [
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
  "36": [
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
  ],
  "37": [
    String.raw`K^{(\ell)}_{1:t}=[K^{(\ell)}_{1:t-1};k^{(\ell)}_t],\quad V^{(\ell)}_{1:t}=[V^{(\ell)}_{1:t-1};v^{(\ell)}_t]`,
    String.raw`[B,H,C,d_h]`,
    String.raw`[B,H,t,d_h]`,
    String.raw`10^{-12}`,
    String.raw`[B,H,1,t+1]`,
    String.raw`1+2+3=6`,
    String.raw`1+1+1=3`,
  ],
  "38": [
    String.raw`\sum_{t=1}^{T}t^2\in\Theta(T^3),\quad \sum_{t=1}^{T}t\in\Theta(T^2)`,
    String.raw`[1,2,2,2]`,
    String.raw`2\times10^{-12}`,
    String.raw`4(1+2+3)=24`,
    String.raw`4(2^2+3^2)=52`,
    String.raw`1\times2\times2=4`,
    String.raw`4\times6=24`,
  ],
  "39": [
    String.raw`P_\theta(z_{1:T})=\prod_{t=1}^{T}P_\theta(z_t\mid z_{<t})`,
    String.raw`C=4`,
    String.raw`3.981342714-3.866087547=0.115255167`,
  ],
};

const formerChapter14To39MathCodeSpans = [
  "square=4",
  "loss=8",
  "bar(loss)=1",
  "bar(square)=2",
  "bar(x)=8",
  "square=x*x",
  "loss=square+square",
  "loss=1",
  "square=2",
  "x=8",
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
  "a\u00b2/3",
  "aÂ²/3",
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
  "k=40",
  "k = 40",
] as const;

const rawChapter14To39FormulaPatterns = [
  /\bbar\s*\([A-Za-z]+\)/,
  /\b(?:square|loss|dbias|dx|dE|dW)\s*=/,
  /\b1\s*\/\s*sqrt\s*\(/i,
  /\bsqrt\s*\([^)]*\)/i,
  /\ba\u00b2\s*\/\s*3/,
  /\ba(?:Â²|Â²|\^2)\s*\/\s*3/,
  /\|V\|\s+by\s+m/,
  /\bd_model\b/,
  /\bbar\s*\([EX]\)\s*\[/,
  /\bXW_[gu]\b/,
  /\bd[WX]_(?:g|u|2|p)\b/,
  /\b(?:FFN|SiLU)\s*\([^)]*\)\s*=/,
  /\|B\|\s*T/,
  /\b(?:3|2)\s*\*\s*2\b/,
  /\b1\.75\s*\/\s*(?:4|6)\b/,
  /\b(?:theta|[gmv])_(?:0|1|t)\b/,
  /\b(?:beta_[12]|eta|lambda|epsilon|varepsilon)\s*=/,
  /\bhW_o\b/,
  /\bC\s*\*\s*D\b/,
  /\[B\s*,\s*(?:C|CD|H|V)(?:\s*,\s*D)?\]/,
  /\btarget_row\s*\([^)]*\)\s*\[\s*C\s*-\s*1\s*\]/,
  /\by\s*=\s*x\s*\+\s*F\s*\(x\)/,
  /\bF\s*\(x\)\s*=\s*0/,
  /\bRMSNorm\s*\([^)]*\)\s*=/,
  /\bmean\s*\(\s*x\^?2\s*\)/i,
  /\b[QKV]\s*=\s*XW_[QKV]\b/,
  /\bW_[QKV]\b/,
  /\[B\s*,\s*T\s*,\s*d_(?:model|head)\s*\]/,
  /\bQK(?:\^T|áµ€)\b/,
  /\b(?:d_k|d_v)\b/,
  /\bA\s*=\s*softmax\s*\(/i,
  /\bO\s*=\s*AV\b/,
  /\[B\s*,\s*T\s*,\s*(?:T|d_[kv])\s*\]/,
  /\bRoPE\s*\([^)]*\)/,
  /\btheta_k\b/,
  /\bn\s*-\s*m\b/,
  /\bR\s*\(\s*(?:phi|[ab])\s*\)/,
  /\bMHA\s*\([^)]*\)/,
  /\bConcat\s*\(/,
  /\bW_O\b/,
  /\bd_h\b/,
  /\[B\s*,\s*h\s*,\s*T\s*,\s*d_h\s*\]/,
  /\bE\s*\^\s*T\b/,
  /\bbar\s*\(\s*E(?:_[A-Za-z]+)?\s*\)/,
  /\[B\s*,\s*T\s*,\s*V\s*\]/,
  /\bN\s+in\s*\{/i,
  /o_\{k\+1\}/,
  /\bo_(?:k|0)\b/,
  /\bb_k\b/,
  /\bn_i\^\{\(k\)\}/,
  /\bprod_i\b/,
  /\b2874\s*\+\s*8\s*\(\s*5\s*[*×]\s*4\s*\)\s*=\s*3034\b/,
  /\btau\s*=\s*0\b/i,
  /\btau\s*(?:->|→)\s*0\+?/i,
  /\b1\s*<=\s*k\s*<=\s*V\b/,
  /\bq_i\b/,
  /\[\s*a_i\s*,\s*b_i\s*\)/,
  /\ba_i\s*<=\s*u\s*<\s*b_i\b/,
  /\bk\s*=\s*\d+\b/,
  /\bk\s+(?:equals?|equal\s+to)\s+\d+\b/i,
  /\b(?:one|fixed|the)\s+k\b/i,
] as const;

const documentedChapter14To39Code = [
  {
    name: "literal tensor shapes, coordinates, vectors, and matrices",
    pattern: /^\[[^\r\n]*\]$/,
  },
  {
    name: "literal numeric fixture, index, seed, or tolerance values",
    pattern: /^[+-]?(?:\d+(?:\.\d+)?)(?:e[+-]?\d+)?$/i,
  },
  {
    name: "literal hexadecimal RNG states",
    pattern: /^0x[0-9a-f]+$/i,
  },
  {
    name: "concrete Rust APIs, node names, identifiers, and types",
    pattern:
      /^&?[A-Za-z][A-Za-z0-9_]*(?:(?:::|\.)[A-Za-z][A-Za-z0-9_]*)*(?:<[^>\r\n]+>)?(?:\([^\r\n]*\))?(?:\[[^\]\r\n]+\])?$/,
  },
  {
    name: "concrete source and trace paths",
    pattern: /^(?:rust|src|examples)\/[A-Za-z0-9_./-]+$/,
  },
  {
    name: "concrete dotted parameter names",
    pattern: /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+$/,
  },
  {
    name: "concrete shell commands",
    pattern: /^(?:\.\/course run )?(?:cargo|docker|git|npm)\s/,
  },
  {
    name: "literal shuffled window trace tokens",
    pattern: /^[a-z][a-z0-9-]*@\d+$/,
  },
  {
    name: "literal ordered update-event trace",
    pattern: /^forward>backward>finite-check>clip>adamw-step>zero-grad$/,
  },
  {
    name: "literal checkpoint record and proof trace tokens",
    pattern:
      /^(?:literal-token-[0-9]+|(?:logits_bits_identical|checksum):true)$/,
  },
  {
    name: "literal selection and final-evaluation trace fields",
    pattern:
      /^(?:criterion=validation-only|snapshot=true|test_reads=[01]|test_accesses=1|fnv1a64:[0-9a-f]{16})$/,
  },
] as const;

describe("KaTeX renderer and stylesheet compatibility", () => {
  it("pins one KaTeX version for Markdown, components, and the loaded stylesheet", () => {
    const manifest = JSON.parse(readFileSync(packageManifestPath, "utf8")) as {
      devDependencies: Record<string, string>;
    };
    const lock = JSON.parse(readFileSync(packageLockPath, "utf8")) as {
      packages: Record<
        string,
        { version?: string; devDependencies?: Record<string, string> }
      >;
    };

    expect(manifest.devDependencies.katex).toBe("0.16.47");
    expect(lock.packages[""]?.devDependencies?.katex).toBe("0.16.47");

    const installedKatex = Object.entries(lock.packages)
      .filter(([path]) => /(^|\/)node_modules\/katex$/.test(path))
      .map(([path, entry]) => ({ path, version: entry.version }));
    expect(installedKatex).toEqual([
      { path: "node_modules/katex", version: "0.16.47" },
    ]);
  });
});

describe("Chapter 0 formula-source contract", () => {
  it("routes the causal objective and every explanatory symbol through math markup", () => {
    const source = readChapter("en", chapter00Files[0]);
    const frontmatter = jsonFrontmatter(source) as {
      formula: { symbols: Array<{ symbol: string; meaning: string }> };
    };
    const { body, display, inline } = mathMarkup(source);
    expect(display).toHaveLength(1);
    expect(display[0]).toContain(
      String.raw`P_\theta(z_{1:T})=\prod_{t=1}^{T}P_\theta(z_t\mid z_{<t})`,
    );
    expect(inline.length).toBeGreaterThanOrEqual(8);
    for (const fragment of [
      String.raw`P_\theta`,
      String.raw`\theta`,
      String.raw`z_{1:T}`,
      String.raw`z_{<t}`,
      String.raw`\prod_{t=1}^{T}`,
    ]) {
      expect(body).toContain(fragment);
    }
    const glossaryStart = source.indexOf("{/* chapter-section:symbol-glossary */}");
    const glossaryEnd = source.indexOf("{/* chapter-section:history */}", glossaryStart);
    expect(glossaryStart).toBeGreaterThan(-1);
    expect(glossaryEnd).toBeGreaterThan(glossaryStart);
    const glossary = source.slice(glossaryStart, glossaryEnd);
    const normalizedGlossary = glossary.replace(/\s+/g, " ");
    expect(frontmatter.formula.symbols).toHaveLength(8);
    for (const { symbol, meaning } of frontmatter.formula.symbols) {
      expect(glossary, `missing Chapter 0 glossary notation ${symbol}`).toContain(`$${symbol}$`);
      expect(
        normalizedGlossary,
        `missing Chapter 0 glossary meaning for ${symbol}`,
      ).toContain(meaning.replace(/\s+/g, " "));
    }
    expect(proseOutsideMathAndCode(source)).not.toMatch(
      /P_\\theta|z_\{|\\prod|z_<t/,
    );
    expect(inlineCode(source)).not.toEqual(
      expect.arrayContaining(["P_theta", "z_{1:T}", "z_{<t}"]),
    );
  });
});

describe("Chapter 1-7 formula-source contract", () => {
  it("enumerates both published locales and routes every reviewed expression through math markup", () => {
    const reviewed: string[] = [];
    for (const locale of locales) {
      for (const file of chapterFiles) {
        const source = readChapter(locale, file);
        const { body, display, inline } = mathMarkup(source);
        const chapter = file.slice(0, 2);
        reviewed.push(`${locale}/${file}`);

        expect(
          display.length,
          `${locale}/${file} display math`,
        ).toBeGreaterThan(0);
        expect(inline.length, `${locale}/${file} inline math`).toBeGreaterThan(
          0,
        );
        for (const fragment of requiredBodyMath[chapter]) {
          expect(body, `${locale}/${file} must retain ${fragment}`).toContain(
            fragment,
          );
        }

        const code = inlineCode(source);
        for (const oldExpression of formerMathCodeSpans) {
          expect(
            code,
            `${locale}/${file} still styles ${oldExpression} as code`,
          ).not.toContain(oldExpression);
        }

        const prose = proseOutsideMathAndCode(source);
        for (const pattern of rawFormulaPatterns) {
          expect(
            prose,
            `${locale}/${file} contains raw formula ${pattern}`,
          ).not.toMatch(pattern);
        }
      }
    }

    expect(reviewed).toHaveLength(14);
    expect(new Set(reviewed).size).toBe(14);
  });

  it("keeps math-like code spans only when they are concrete program or trace data", () => {
    const seen = new Set<string>();
    for (const locale of locales) {
      for (const file of chapterFiles) {
        for (const value of inlineCode(readChapter(locale, file))) {
          if (!suspiciousCode.test(value)) continue;
          const allowance = documentedLiteralData.find(({ pattern }) =>
            pattern.test(value),
          );
          expect(
            allowance?.name,
            `${locale}/${file} has an undocumented math-like code span: \`${value}\``,
          ).toBeTruthy();
          if (allowance) seen.add(allowance.name);
        }
      }
    }

    expect([...seen].sort()).toEqual(
      documentedLiteralData.map(({ name }) => name).sort(),
    );
  });
});

describe("Chapter 8-13 formula-source contract", () => {
  it("routes every audited expression through math markup and rejects the former code styling", () => {
    const reviewed: string[] = [];
    for (const file of chapter08To13Files) {
      const source = readChapter("en", file);
      const { body, display, inline } = mathMarkup(source);
      const chapter = file.slice(0, 2);
      reviewed.push(file);

      expect(display.length, `${file} display math`).toBeGreaterThan(0);
      expect(inline.length, `${file} inline math`).toBeGreaterThan(0);
      for (const fragment of requiredChapter08To13Math[chapter] ?? []) {
        expect(body, `${file} must retain ${fragment}`).toContain(fragment);
      }

      const code = inlineCode(source);
      for (const oldExpression of formerChapter08To13MathCodeSpans) {
        expect(
          code,
          `${file} still styles ${oldExpression} as code`,
        ).not.toContain(oldExpression);
      }

      const prose = proseOutsideMathAndCode(source);
      for (const pattern of rawChapter08To13FormulaPatterns) {
        expect(prose, `${file} contains raw formula ${pattern}`).not.toMatch(
          pattern,
        );
      }
    }

    expect(reviewed).toEqual(chapter08To13Files);
  });

  it("keeps every remaining code span within a documented program-data category", () => {
    const seen = new Set<string>();
    for (const file of chapter08To13Files) {
      for (const value of inlineCode(readChapter("en", file))) {
        const allowance = documentedChapter08To13Code.find(({ pattern }) =>
          pattern.test(value),
        );
        expect(
          allowance?.name,
          `${file} has an undocumented code span after the formula audit: \`${value}\``,
        ).toBeTruthy();
        if (allowance) seen.add(allowance.name);
      }
    }

    expect([...seen].sort()).toEqual(
      documentedChapter08To13Code.map(({ name }) => name).sort(),
    );
  });
});

describe("Chapter 14-39 formula-source contract", () => {
  it("completes the source audit for all 47 published localized lessons", () => {
    const reviewed: string[] = [];
    for (const file of chapter14To39Files) {
      const source = readChapter("en", file);
      const { body, display, inline } = mathMarkup(source);
      const chapter = file.slice(0, 2);
      reviewed.push(file);

      expect(display.length, `${file} display math`).toBeGreaterThan(0);
      expect(inline.length, `${file} inline math`).toBeGreaterThan(0);
      for (const expression of [...display, ...inline]) {
        expect(
          expression,
          `${file} uses the malformed TeX control symbol \\*`,
        ).not.toContain(String.raw`\*`);
      }
      for (const fragment of requiredChapter14To39Math[chapter] ?? []) {
        expect(body, `${file} must retain ${fragment}`).toContain(fragment);
      }

      const code = inlineCode(source);
      for (const oldExpression of formerChapter14To39MathCodeSpans) {
        expect(
          code,
          `${file} still styles ${oldExpression} as code`,
        ).not.toContain(oldExpression);
      }

      const prose = proseOutsideMathAndCode(source);
      for (const pattern of rawChapter14To39FormulaPatterns) {
        expect(prose, `${file} contains raw formula ${pattern}`).not.toMatch(
          pattern,
        );
      }
    }

    expect(reviewed).toEqual(chapter14To39Files);
    expect(
      chapter00Files.length +
        chapterFiles.length * locales.length +
        chapter08To13Files.length +
        reviewed.length,
    ).toBe(47);
  });

  it("keeps every remaining code span within a documented program-data category", () => {
    for (const file of chapter14To39Files) {
      for (const value of inlineCode(readChapter("en", file))) {
        const allowance = documentedChapter14To39Code.find(({ pattern }) =>
          pattern.test(value),
        );
        expect(
          allowance?.name,
          `${file} has an undocumented code span after the formula audit: \`${value}\``,
        ).toBeTruthy();
      }
    }
  });
});

describe("build-time formula rendering in Chapter 14-39 diagrams", () => {
  it("renders every diagram-owned expression as strict HTML plus MathML", () => {
    const components = {
      initialization: readFileSync(
        resolve(componentRoot, "chapters/ParameterInitializationDiagram.astro"),
        "utf8",
      ),
      embeddings: readFileSync(
        resolve(componentRoot, "chapters/TokenEmbeddingsDiagram.astro"),
        "utf8",
      ),
      linear: readFileSync(
        resolve(componentRoot, "chapters/LinearLayersDiagram.astro"),
        "utf8",
      ),
      swiglu: readFileSync(
        resolve(componentRoot, "chapters/SwigluFeedForwardDiagram.astro"),
        "utf8",
      ),
      batches: readFileSync(
        resolve(componentRoot, "chapters/MiniBatchesDiagram.astro"),
        "utf8",
      ),
      adamw: readFileSync(
        resolve(componentRoot, "chapters/AdamwDiagram.astro"),
        "utf8",
      ),
      neuralNgram: readFileSync(
        resolve(componentRoot, "chapters/NeuralNgramDiagram.astro"),
        "utf8",
      ),
      residual: readFileSync(
        resolve(componentRoot, "chapters/ResidualConnectionsDiagram.astro"),
        "utf8",
      ),
      rmsnorm: readFileSync(
        resolve(componentRoot, "chapters/RmsnormDiagram.astro"),
        "utf8",
      ),
      qkv: readFileSync(
        resolve(componentRoot, "chapters/QkvProjectionsDiagram.astro"),
        "utf8",
      ),
      selfAttention: readFileSync(
        resolve(componentRoot, "chapters/SelfAttentionDiagram.astro"),
        "utf8",
      ),
      causalMasking: readFileSync(
        resolve(componentRoot, "chapters/CausalMaskingDiagram.astro"),
        "utf8",
      ),
      rope: readFileSync(
        resolve(componentRoot, "chapters/RopeDiagram.astro"),
        "utf8",
      ),
      multiHeadAttention: readFileSync(
        resolve(componentRoot, "chapters/MultiHeadAttentionDiagram.astro"),
        "utf8",
      ),
      decoderModel: readFileSync(
        resolve(componentRoot, "chapters/DecoderModelDiagram.astro"),
        "utf8",
      ),
      trainingSelection: readFileSync(
        resolve(componentRoot, "chapters/TrainingSelectionDiagram.astro"),
        "utf8",
      ),
      finalEvaluation: readFileSync(
        resolve(componentRoot, "chapters/FinalEvaluationDiagram.astro"),
        "utf8",
      ),
      temperatureTopK: readFileSync(
        resolve(componentRoot, "chapters/TemperatureTopKDiagram.astro"),
        "utf8",
      ),
      incrementalAttention: readFileSync(
        resolve(componentRoot, "chapters/IncrementalAttentionDiagram.astro"),
        "utf8",
      ),
      cachedGeneration: readFileSync(
        resolve(componentRoot, "chapters/CachedGenerationDiagram.astro"),
        "utf8",
      ),
      endToEndLlm: readFileSync(
        resolve(componentRoot, "chapters/EndToEndLlmDiagram.astro"),
        "utf8",
      ),
    };

    expect(components.initialization).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(components.initialization).toContain(
      "String.raw`\\Delta=${trace.binning.width.lexeme}`",
    );
    expect(components.initialization).not.toContain(
      "[{bin.lower.lexeme}, {bin.upper.lexeme}",
    );

    expect(components.embeddings).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(components.embeddings).toContain(
      "String.raw`E_{${row.row.lexeme},:}`",
    );
    expect(components.embeddings).toContain(
      "String.raw`e_{${lookup.id.lexeme}}E`",
    );
    expect(components.embeddings).toContain(
      "String.raw`\\bar E_{${gradient.row.lexeme},:}`",
    );
    expect(components.embeddings).not.toContain(
      "e<sub>{lookup.id.lexeme}</sub> E",
    );

    expect(components.linear).toContain(
      "import { renderToString } from 'katex'",
    );
    expect(components.linear).toContain("output: 'htmlAndMathml'");
    expect(components.linear).toContain("strict: 'error'");
    expect(components.linear).toContain("throwOnError: true");
    expect(components.linear).toContain(
      "set:html={inlineMath(selectedProductsLatex)}",
    );
    expect(components.linear).toContain(
      "String.raw`dX_{${row.position.lexeme}}`",
    );
    expect(components.linear).not.toContain(
      "y[{selectedCell.outputFeature.lexeme}]",
    );

    expect(components.swiglu).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(components.swiglu).toContain(
      "String.raw`g_{${position}}=X_{${position}}W_g`",
    );
    expect(components.swiglu).toContain(
      "String.raw`s_{${position}}=\\operatorname{SiLU}(g_{${position}})`",
    );
    expect(components.swiglu).toContain(
      "String.raw`h_{${position}}=s_{${position}}\\odot u_{${position}}`",
    );
    expect(components.swiglu).toContain(
      "String.raw`dX_{${row.position.lexeme}}`",
    );

    expect(components.batches).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(components.batches).toContain(
      "String.raw`|B|_{\\mathrm{max}}=${trace.meta.capacity}`",
    );
    expect(components.batches).toContain(
      "String.raw`\\mathcal{L}_{B_${batch.index}}=${batch.lossSum}/${batch.tokens}=${batch.meanLoss}`",
    );
    expect(components.batches).toContain(
      "String.raw`\\bar g_{B_${batch.index}}=${batch.meanGradient.lexeme}`",
    );

    expect(components.adamw).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(components.adamw).toContain("vectorLatex(parameter.correctedFirst)");
    expect(components.adamw).toContain(
      "String.raw`\\eta\\lambda\\theta=${trace.proof.zeroGradientDecay}`",
    );

    expect(components.neuralNgram).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(components.neuralNgram).toContain("latex={stage.shape.lexeme}");
    expect(components.neuralNgram).toContain(
      "String.raw`L_{\\mathrm{train}}=${checkpoint.train}`",
    );
    expect(components.neuralNgram).toContain(
      "String.raw`L_{\\mathrm{val}}=${checkpoint.validation}`",
    );
    expect(components.neuralNgram).toContain(
      "String.raw`\\Delta L_{\\mathrm{val}}=${trace.result.improvement}`",
    );

    expect(components.residual).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(components.residual).toContain(
      "String.raw`x=${trace.forward.input.latex}`",
    );
    expect(components.residual).toContain(
      "String.raw`J_F(x)^\\top\\bar y=${trace.backward.branch.latex}`",
    );
    expect(components.residual).toContain(
      "String.raw`\\bar W=${trace.zeroBranch.weightGradient.latex}${zeroWeightRelation}`",
    );
    expect(components.residual).toContain("String.raw`\\ne0` : '=0'");

    expect(components.rmsnorm).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(components.rmsnorm).toContain(
      "String.raw`\\hat x_{${index}}=${value}`",
    );
    expect(components.rmsnorm).toContain(
      "String.raw`\\bar g=${trace.backward.gainGradient.latex}`",
    );
    expect(components.rmsnorm).toContain(
      "String.raw`\\Delta_{\\mathrm{max}}=${scale.maxAbsDiff}`",
    );

    expect(components.qkv).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(components.qkv).toContain(
      "String.raw`${roleSymbols[projection.role].output}=X${roleSymbols[projection.role].weight}`",
    );
    expect(components.qkv).toContain(
      "trace.backward.inputGradient.values.slice(0, 3)",
    );
    expect(components.qkv).toContain(
      "trace.backward.inputGradient.values.slice(3, 6)",
    );
    expect(components.qkv).toContain(
      "String.raw`\\bar X=${inputGradientMatrix}`",
    );
    expect(components.qkv).toContain(
      "String.raw`\\bar ${roleSymbols[gradient.role].weight}=${gradient.values.latex}`",
    );

    expect(components.selfAttention).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(components.selfAttention).toContain(
      "String.raw`A_{${row.query},:}=${row.values.latex}`",
    );
    expect(components.selfAttention).toContain(
      "String.raw`o_${row.query}=${row.output.latex}`",
    );
    expect(components.selfAttention).toContain(
      "String.raw`d_k=${trace.meta.keyWidth},\\quad d_v=${trace.meta.valueWidth}`",
    );

    expect(components.causalMasking).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(components.causalMasking).toContain(
      'latex="M_{ij}=\\begin{cases}0&j\\le i\\\\-\\infty&j>i\\end{cases}"',
    );
    expect(components.causalMasking).toContain(
      'latex="A=\\operatorname{softmax}(S+M)"',
    );
    expect(components.causalMasking).toContain("latex={mathValue(value)}");
    expect(components.causalMasking).toContain(
      "latex={tokenMatrix(trace.backward.queryGradient)}",
    );

    expect(components.rope).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(components.rope).toContain(
      'latex="\\left(\\operatorname{RoPE}(x_m)\\right)_{2k:2k+2}=R(m\\theta_k)(x_m)_{2k:2k+2}"',
    );
    expect(components.rope).toContain(
      'latex="\\left(R(m\\theta_k)q\\right)^\\top\\left(R(n\\theta_k)k\\right)=q^\\top R((n-m)\\theta_k)k"',
    );
    expect(components.rope).toContain(
      "latex={tokenMatrix(trace.backward.queryGradient)}",
    );
    expect(components.rope).toContain(
      "String.raw`\\theta_${row.pair.pair}=${row.pair.theta}`",
    );
    expect(components.rope).toContain(
      "String.raw`\\varepsilon_g=${trace.proof.gradient_tolerance}`",
    );

    expect(components.multiHeadAttention).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(components.multiHeadAttention).toContain(
      "String.raw`[B,T,d_{\\mathrm{model}}]\\to[B,h,T,d_h]`",
    );
    expect(components.multiHeadAttention).toContain(
      "String.raw`A_i=\\operatorname{softmax}_{\\mathrm{keys}}",
    );
    expect(components.multiHeadAttention).toContain(
      "String.raw`\\operatorname{MHA}(X)=\\operatorname{Concat}(H_1,\\ldots,H_h)W_O`",
    );

    expect(components.decoderModel).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(components.decoderModel).toContain("String.raw`E^\\top`");
    expect(components.decoderModel).toContain(
      "String.raw`\\bar E=\\bar E_{\\mathrm{lookup}}+\\bar E_{\\mathrm{output}}`",
    );
    expect(components.decoderModel).toContain(
      "String.raw`\\mathcal{L}=${trace.loss.mean}`",
    );

    expect(components.trainingSelection).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(components.trainingSelection).toContain(
      "String.raw`\\mathcal{L}_{va}=${selectedCheckpoint.validationLoss}`",
    );
    expect(components.trainingSelection).toContain(
      "String.raw`\\lVert g_s\\rVert_2\\leq0.35`",
    );
    expect(components.trainingSelection).toContain(
      "String.raw`\\eta_s\\in\\{0.040,0.025,0.015,0.008\\}`",
    );

    expect(components.finalEvaluation).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(components.finalEvaluation).toContain(
      "String.raw`\\sum_n-\\log p_n=${score.total_nll}`",
    );
    expect(components.finalEvaluation).toContain(
      "String.raw`\\mathcal{L}_{te}=${score.mean_nll}`",
    );
    expect(components.finalEvaluation).toContain(
      "latex={`N_{te}=${trace.provenance.targets}`}",
    );

    expect(components.temperatureTopK).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(components.temperatureTopK).toContain(
      "latex={`\\\\tau=${scenario.tau}`}",
    );
    expect(components.temperatureTopK).toContain(
      "latex={`q_i=${token.probability}`}",
    );
    expect(components.temperatureTopK).toContain(
      "String.raw`[${draw.interval_start},${draw.interval_end})`",
    );
    expect(components.temperatureTopK).toContain(
      "latex={`i_{\\\\mathrm{EOS}}=${trace.eos.eos}`}",
    );

    expect(components.incrementalAttention).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(components.incrementalAttention).toContain(
      "latex={`${step.cacheBefore}\\\\to${step.cacheAfter}`}",
    );
    expect(components.incrementalAttention).toContain(
      "latex={`\\\\Delta_{\\\\mathrm{max}}=${step.maxAbsDiff}`}",
    );
    expect(components.incrementalAttention).toContain(
      "latex={`2\\\\times${trace.work.reused_rows_per_kv_projection}=${trace.work.avoided_rows_across_kv}`}",
    );

    expect(components.cachedGeneration).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(components.cachedGeneration).toContain(
      "latex={`${trace.prefill.cacheBefore}\\\\to${trace.prefill.cacheAfter}`}",
    );
    expect(components.cachedGeneration).toContain(
      "latex={`g^{\\\\mathrm{cache}}_{${index}}=${value}`}",
    );
    expect(components.cachedGeneration).toContain(
      "latex={`\\\\Delta_{\\\\mathrm{max}}=${trace.decode.match.maxAbsDiff}`}",
    );
    expect(components.cachedGeneration).toContain(
      "latex={`4\\\\times(1+2+3)=${trace.work.cachedScores}`}",
    );
    expect(components.cachedGeneration).toContain(
      "latex={`N_{\\\\mathrm{cache}}=${trace.loaded.cachedScores}`}",
    );
    expect(components.cachedGeneration).toContain(
      "latex={`z_{\\\\mathrm{EOS}}=${trace.eos.token}`}",
    );

    expect(components.endToEndLlm).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(components.endToEndLlm).toContain(
      "latex={'C=' + trace.batches.context}",
    );
    expect(components.endToEndLlm).toContain(
      "latex={trace.test.decoder + '<' + trace.test.bigram}",
    );

    for (const source of Object.values(components)) {
      expect(source).not.toContain("<script");
      expect(source).not.toContain("client:");
    }
  });
});

describe("build-time formula rendering in Chapter 8-13 diagrams", () => {
  it("uses the shared strict helper for every component-owned equation", () => {
    const components = {
      storage: readFileSync(
        resolve(componentRoot, "chapters/TensorStorageDiagram.astro"),
        "utf8",
      ),
      broadcasting: readFileSync(
        resolve(componentRoot, "chapters/BroadcastingReductionsDiagram.astro"),
        "utf8",
      ),
      matmul: readFileSync(
        resolve(componentRoot, "chapters/MatrixMultiplicationDiagram.astro"),
        "utf8",
      ),
      gradcheck: readFileSync(
        resolve(componentRoot, "chapters/GradientCheckingDiagram.astro"),
        "utf8",
      ),
    };

    for (const source of Object.values(components)) {
      expect(source).toContain("import InlineMath from '../InlineMath.astro'");
      expect(source).not.toContain("<script");
      expect(source).not.toContain("client:");
    }
    expect(components.storage).toContain(
      "String.raw`i_0=${slice.axis0.lexeme}`",
    );
    expect(components.storage).toContain("\\cdot${term.stride.lexeme}");
    expect(components.storage).not.toContain("i<sub>");
    expect(components.broadcasting).toContain(
      "\\ne${trace.errors[0].rightSize.lexeme}",
    );
    expect(components.broadcasting).not.toContain("{' ≠ '}");
    expect(components.matmul).toContain('<InlineMath latex="\\times" />');
    expect(components.matmul).toContain("String.raw`k=${term.inner.lexeme}`");
    expect(components.matmul).not.toContain("{' × '}");
    expect(components.gradcheck).toContain(
      "String.raw`\\theta-h=${trace.central.minusPoint.lexeme}`",
    );
    expect(components.gradcheck).not.toContain(">θ-h</span>");
    expect(components.gradcheck).not.toContain(
      "return `h=${error.step.lexeme}`",
    );
  });
});

describe("build-time formula rendering in Chapter 1-7 diagrams", () => {
  it("uses one strict HTML-plus-MathML helper without client JavaScript", () => {
    const source = readFileSync(
      resolve(componentRoot, "InlineMath.astro"),
      "utf8",
    );
    expect(source).toContain("import { renderToString } from 'katex'");
    expect(source).toContain(
      "import { normalizeMathmlVariantsInHtml } from '../lib/mathml-compat.mjs'",
    );
    expect(source).toContain("normalizeMathmlVariantsInHtml(");
    expect(source).toContain("output: 'htmlAndMathml'");
    expect(source).toContain("strict: 'error'");
    expect(source).toContain("throwOnError: true");
    expect(source).toContain("data-inline-math");
    expect(source).not.toContain("<script");
    expect(source).not.toContain("client:");
  });

  it("renders component-owned expressions or replaces them with natural localized wording", () => {
    const components = {
      corpus: readFileSync(
        resolve(componentRoot, "chapters/CorpusPartitionsDiagram.astro"),
        "utf8",
      ),
      tokenizer: readFileSync(
        resolve(componentRoot, "chapters/ApplyBpeTokenizerDiagram.astro"),
        "utf8",
      ),
      windows: readFileSync(
        resolve(componentRoot, "chapters/AutoregressiveExamplesDiagram.astro"),
        "utf8",
      ),
      bigram: readFileSync(
        resolve(componentRoot, "chapters/BigramBaselineDiagram.astro"),
        "utf8",
      ),
      metrics: readFileSync(
        resolve(componentRoot, "chapters/LanguageModelMetricsDiagram.astro"),
        "utf8",
      ),
    };

    expect(components.corpus).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(components.corpus).toContain(
      "String.raw`\\frac{${assignedCount}}{${assignedCount}}`",
    );
    expect(components.corpus).not.toContain(
      "{assignedCount} / {assignedCount}",
    );
    expect(components.tokenizer).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(components.tokenizer).toContain('<InlineMath latex="+2" />');
    expect(components.windows).not.toContain("↳ +1");
    expect(components.windows).not.toContain(
      '<span aria-hidden="true">+1</span>',
    );
    expect(components.bigram).not.toMatch(/C_\{ij\}|\\alpha/);
    expect(components.metrics).not.toMatch(/−ln p|-\\ln p/);
    for (const source of Object.values(components)) {
      expect(source).not.toContain("<script");
      expect(source).not.toContain("client:");
    }
  });
});
