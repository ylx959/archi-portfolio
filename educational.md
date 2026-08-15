# educational.md — YLX studio Portfolio 技術教科書

> 這份文件的用途：你用 vibe coding 做出了這個網站，現在要能在面試桌上把它**完整講清楚**。
> 所以這裡不只寫「用了什麼」，而是寫「為什麼這樣寫」「代價是什麼」「面試官會追問什麼」。
>
> 讀法建議：
> 1. 第一遍讀 §1–§5（技術地圖），建立詞彙。
> 2. 第二遍搭配原始碼讀 §6（逐子系統解剖），每讀一節就打開對應檔案對照。
> 3. 面試前一天讀 §10（題庫）+ §11（名詞速查）。
>
> 所有檔案路徑都相對於專案根目錄。

---

## 目錄

1. [專案定位與技術選型](#1-專案定位與技術選型)
2. [瀏覽器如何跑這個網站](#2-瀏覽器如何跑這個網站)
3. [架構：模組圖與三個接縫](#3-架構模組圖與三個接縫)
4. [CSS 系統](#4-css-系統)
5. [JavaScript 核心技巧](#5-javascript-核心技巧)
6. [逐子系統解剖](#6-逐子系統解剖)
7. [效能工程](#7-效能工程)
8. [無障礙（a11y）與漸進增強](#8-無障礙a11y與漸進增強)
9. [工具鏈與部署](#9-工具鏈與部署)
10. [面試題庫](#10-面試題庫)
11. [名詞速查表](#11-名詞速查表)
12. [自我驗收練習](#12-自我驗收練習)

-----

## 1. 專案定位與技術選型

### 1.1 這是什麼

一個**單頁靜態網站**（single-page static site，注意不是 SPA framework）：

| 項目 | 內容 |
| --- | --- |
| 語言 | HTML5 + CSS3 + Vanilla JavaScript（ES2020 模組） |
| 框架 | 無。沒有 React / Vue / Svelte |
| 建置工具 | 無。沒有 webpack / Vite / package.json |
| 相依套件 | 執行期 0 個（`vendor/` 有 Lenis、GSAP，但**尚未接上**） |
| 測試 | 無自動化測試 |
| 部署 | `main` 分支即上線（repo `github.com/ylx959/portfolio-website`，線上位址 `ylx-portfolio.netlify.app`）。無 CI、無 build |
| 規模 | 約 9,750 行（JS ~5,050 / CSS ~4,180 / HTML 517） |

### 1.2 為什麼不用框架（這題一定會被問）

**誠實版答案的三個支點：**

1. **內容是靜態的。** 全站只有一份 HTML，資料是 9 個專案的固定陣列。React 的核心價值是「狀態 → UI 的自動同步」，但這個網站的狀態極少（是否進場、目前 filter、overlay 開關），而動畫需求極高。用框架反而要跟它的 render 週期打架。
2. **動畫需要直接控制每一幀。** 專案裡多處是 `requestAnimationFrame` 迴圈直接寫 CSS 變數（hero scrub、inertia scroll、cursor、ripple、可變字重）。在 React 裡這些一樣要走 `useRef` + 繞過 render，等於框架幫不上忙。
3. **零建置 = 零腐爛。** 沒有 `node_modules`，兩年後 clone 下來仍能跑。作品集網站的維護週期很長。

**必須主動承認的代價（面試官愛聽這段）：**

- 沒有 component 重用機制 → 專案卡片是**手寫 9 份 HTML**，新增專案要改 4 個地方（見 §6.5）。
- 沒有型別檢查 → 資料結構打錯只能在 runtime 發現。
- 沒有 tree-shaking / bundling → 15 個 JS 檔各自一個 HTTP 請求（HTTP/2 下影響小，但仍是事實）。
- 沒有測試 → 每次改動靠手動回歸。
- 手動 cache busting（`?v=N`），忘記 bump 就會有人看到舊版。

> 面試話術：「我知道這在團隊專案裡不成立。這是一個一人維護、內容穩定、動畫密集的專案，所以我選擇把複雜度花在動畫控制而不是狀態管理上。如果要加第二個維護者或動態內容，我第一件事會導入 Vite + TypeScript。」

### 1.3 目錄結構

```
index.html                    全站唯一的 HTML，所有 section 的 markup
scripts/
  main.js                     進入點：import 每個 component 並呼叫其 init
  mineport-project-data.js    專案詳細資料（掛在 window 上的全域）
  core/                       跨 component 共用的東西
  components/                 一個 UI 區塊一個檔案，各自擁有自己的 DOM 與 state
  bump-assets.js              cache busting 腳本（Node）
  generate-previews.js        產生模糊佔位圖（Node + sips）
  compress-large-project-images.js  壓縮過大圖片（Node + sips）
styles/
  base.css                    reset、:root tokens、裸元素樣式
  components/*.css            與 JS 同名的一支樣式表
assets/images/projects/projectN/{card,detail,gallery}/
vendor/                       Lenis、GSAP（未接上）
```

---

## 2. 瀏覽器如何跑這個網站

這一節是「前端基本功」被追問時的防線。

### 2.1 關鍵渲染路徑（Critical Rendering Path）

```
HTML bytes → tokens → DOM tree ─┐
                                 ├→ Render tree → Layout(reflow) → Paint → Composite
CSS bytes → tokens → CSSOM ─────┘
```

- **DOM**：HTML 的樹狀結構。
- **CSSOM**：CSS 的樹狀結構。**CSS 是 render-blocking**：CSSOM 沒建好，畫面不會畫。
- **Layout / Reflow**：算出每個 box 的位置與大小。**很貴**。
- **Paint**：把 box 畫成像素。
- **Composite**：把各圖層合成。GPU 做，**很便宜**。

**核心結論（面試必背）：**
改 `width` / `top` / `font-size` → 觸發 Layout → Paint → Composite（全套）。
改 `background-color` → 跳過 Layout，Paint → Composite。
改 `transform` / `opacity` → **只有 Composite**。

這就是為什麼本專案的所有動畫（hero 卡片變形、drawings 堆疊縮放、cursor 跟隨、視差）都盡量落在 `transform` 與 `opacity` 上。

### 2.2 這個網站的載入順序

`index.html` 尾端：

```html
<script src="scripts/mineport-project-data.js?v=43"></script>       <!-- classic -->
<script type="module" src="scripts/main.js?v=17"></script>          <!-- module -->
```

**為什麼順序這樣寫，是一個很好的面試回答：**

- 第一支是 **classic script**：同步執行，執行完 `window.MINEPORT_PROJECT_DETAIL_DATA` 就存在。
- 第二支是 **module script**：`type="module"` **預設就是 defer**，會等 HTML 解析完才執行。
- 所以模組跑起來時，全域資料保證已就緒 —— `scripts/core/project-data.js` 直接讀 `window.MINEPORT_PROJECT_DETAIL_DATA` 才安全。

> 追問：「那為什麼資料不也寫成 module？」
> 答：可以，而且更好（避免污染全域）。目前用全域是歷史包袱，`core/project-data.js` 就是那層轉接，把全域收斂成一個具名 export，讓其他模組不用碰 `window`。

### 2.3 ES Modules 與 `file://` 的坑

專案的 `CLAUDE.md` 特別註明：**必須用 HTTP 開啟**。

```bash
python3 -m http.server 8000    # 然後開 http://localhost:8000
```

原因：ES module 受 **CORS** 規範，而 `file://` 協定的 origin 是 `null`，瀏覽器會直接拒絕 module import。雙擊 `index.html` 會白畫面 + console 報 CORS 錯誤。

> 這題常被拿來考「你有沒有真的自己跑過專案」。

### 2.4 第一幀要長什麼樣：inline critical CSS 與 `is-intro-pending`

`index.html` 的 `<head>` 裡有一小段 inline `<style>`：

```html
<style>
    .hero { background: #ffffff; }

    /* 只寫 opacity，不寫 visibility：加了 visibility 之後淡入會卡在 0，
       因為元素是在同一幀裡才翻出 hidden 的 */
    .hero .hero-main-image { opacity: 0; }
</style>
```

**為什麼要 inline？** 外部 CSS 是非同步下載的；在它到達之前，`<img>` 已經可能被畫出來，造成主視覺「先閃一下再淡入」。inline 的規則跟著 HTML 同時到達，能保證圖片一開始就是隱藏的，等 JS 確認 `decode()` 完成才淡入（見 `scripts/components/hero.js` 的 `preloadHeroMainImage`）。

這是 **critical CSS** 的最小實作。

**同一類問題的第二個案例：`is-intro-pending`**

標題「Architecture & Design」是 `index.html` 裡的靜態 markup，跟著 HTML 一起畫；模組是 defer，要等 HTML 解析完才跑。實測模組跑完在 2151ms，第一次繪製在那之前 —— 所以第一眼看到的是動畫的**結局**，然後 JS 才清空重演。

初始狀態掛在 markup 上，由 render-blocking 的 `hero.css` 隱藏，JS 開演時移除：

```html
<header class="hero is-intro-pending" id="home">
```
```css
.hero.is-intro-pending .hero-expand-title { opacity: 0; visibility: hidden; animation: none; }
```

**通則**：初始狀態若靠 JS 設定，就必然有一段 JS 還沒跑的視窗期。只能靠**阻塞繪製的 CSS** 解決 —— `DOMContentLoaded` / `defer` 保證的是「DOM 好了」，不是「還沒畫」。

### 2.5 字型載入

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="...family=Inter...&family=Roboto+Flex:wdth,wght@25..151,100..1000&display=swap" rel="stylesheet">
```

- `preconnect`：提前完成 DNS + TCP + TLS 握手，省 100–300ms。
- `display=swap`：字型還沒到時先用系統字型顯示（FOUT），而不是隱藏文字（FOIT）。**優先保證內容可讀**。
- `wdth,wght@25..151,100..1000`：這是**可變字型（variable font）的軸範圍**語法，是 drawings 標題效果的前提（見 §6.8）。

---

## 3. 架構：模組圖與三個接縫

### 3.1 進入點

`scripts/main.js`：

```js
function start() {
    initHero();          // 先鎖頁面
    initScroll();        // 再掛捲動監聽
    initSections();
    initProjectGrid();
    ...
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
} else {
    start();
}
```

**兩個知識點：**

1. `DOMContentLoaded` vs `load`：前者是「DOM 建好」，後者要等所有圖片。這裡只需要 DOM。
2. 那個 `readyState` 檢查是防呆：module 是 defer，理論上 DOM 已好，但若日後有人把它改成同步載入也不會壞。

### 3.2 `core/` 的職責

| 檔案 | 內容 |
| --- | --- |
| `constants.js` | 時間常數、`HERO_PHASES` 列舉、`matchMedia` 查詢 |
| `dom.js` | `html` / `body` 兩個節點 |
| `utils.js` | easing 函式、文字亂碼動畫、格式化、`isMobileHeroMode()`、`getPreviewImageSrc()` |
| `state.js` | 是否已進場、訪客輸入的名字 |
| `project-data.js` | `projectDetails`，從全域切片而來 |
| `sections.js` | section 清單、目前 section 判斷、sticky 堆疊位移 |
| `scroll.js` | 平滑捲動、自訂慣性捲動、wheel/touch 監聽 |

**規則：component 不互相 import。** 每個 component 只碰自己的 DOM 與自己的模組層變數。

### 3.3 三個接縫（seams）—— 這是本專案最值得講的架構決策

沒有框架時，最容易出事的就是**模組互相 import 形成循環**。這個專案用三個手法把依賴圖保持成**無環有向圖（DAG）**：

#### 接縫 1：accessor 取代裸變數（`core/state.js`）

```js
let hasEntered = false;
export function isEntered() { return hasEntered; }
export function markEntered(name) { hasEntered = true; submittedDisplayName = name; }
```

**為什麼不直接 `export let hasEntered`？**
因為 ES module 的 import 是 **live binding 且唯讀**：import 端讀得到最新值，但**不能賦值**。所以「誰能寫」必須靠函式來收斂 —— 只有 hero 呼叫 `markEntered()`，其他人只能 `isEntered()`。

> 這題可以延伸到「ES module 與 CommonJS 的差異」：CJS 是值的拷貝（snapshot），ESM 是活的參照（live binding）。

#### 接縫 2：依賴反轉（`core/scroll.js` 的 scrollGate）

`scroll.js` 擁有 wheel/touch 監聽，但它**完全不知道 hero 的存在**。hero 在 init 時反過來註冊規則：

```js
// hero.js
setScrollGate({
    isLocked: isHeroScrollLocked,
    isStoryActive: isHeroStoryActive,
    scrub: scrubHeroStory
});
```

```js
// scroll.js 的預設值：什麼都不擋
const scrollGate = {
    isLocked: function () { return false; },
    isStoryActive: function () { return false; },
    scrub: function () { return false; }
};
```

這就是 **Inversion of Control / Dependency Injection**。好處：`scroll.js` 可以獨立測試、hero 被拿掉也不會壞。

同樣手法還有 `onWheelActivity(handler)` / `onScrollSettle(handler)` —— 這是 **observer pattern** 的極簡實作（一個陣列 + forEach）。

#### 接縫 3：自訂事件解耦（`portfolio:entered`）

```js
// hero.js
document.dispatchEvent(new CustomEvent("portfolio:entered"));

// floating-nav.js
document.addEventListener("portfolio:entered", updateFloatingNavState);
// cursor-follower.js
document.addEventListener("portfolio:entered", handleEnteredStateChange);
```

**為什麼用事件而不是 import？** 因為「進場」是**一對多廣播**。用事件，新增第三個訂閱者不需要動 hero 一行程式碼。命名空間前綴 `portfolio:` 是避免和原生事件撞名的慣例。

> 面試官若問「這是什麼設計模式」：Observer / Pub-Sub，透過 DOM 當 event bus。

### 3.4 用一張圖總結依賴方向

```
                 constants ── dom ── utils ── state
                     │                          ▲
                     ▼                          │ (只有 hero 寫)
   components ──► core/scroll ◄── setScrollGate ┘
        │            │
        │            └─ onWheelActivity / onScrollSettle ──► components
        │
        └── document CustomEvent("portfolio:entered") ──► components
```

箭頭永遠往 core 走，回頭的路只有「註冊 callback」與「事件」。

---

## 4. CSS 系統

### 4.1 設計 token 與 derived token

`styles/base.css`：

```css
:root {
    --project-shell-padding: 28px;
    --project-card-scale: 0.985;
    --project-column-count: 3;
    --project-edge-inset: calc((100% / var(--project-column-count)) * ((1 - var(--project-card-scale)) / 2));
    --stack-section-overlap: 34vh;
    --contact-section-overlap: 18vh;
    --filter-panel-open-duration: 0.42s;
    ...
}
```

**兩個重點：**

1. `--project-edge-inset` 是**推導出來的 token**：改欄數或卡片縮放，全站的邊界內縮自動跟著變。這讓 project / drawings / about / contact 四個 section 的左右對齊線永遠一致。
2. **響應式是覆寫 token，不是覆寫規則**：

```css
@media (max-width: 1080px) { :root { --project-column-count: 2; } }
@media (max-width: 768px)  { :root { --project-column-count: 1; --project-shell-padding: 16px; ... } }
```

一行改變欄數，所有依賴它的計算全部連動。這是 CSS custom property 相對 Sass 變數最大的優勢 —— **Sass 變數在編譯期就死了，CSS 變數活在 runtime、可被 media query 與 JS 改寫**。

> 追問：「custom property 什麼時候求值？」
> 答：在**使用的地方**（substitution at use site），而且會**繼承**。所以在 `.project-grid` 上覆寫 `--project-card-fill`，只影響它的子樹。本專案就是靠這點，把專案卡片的留白調整**侷限在 grid 內**，不動到全站共用的 `--project-card-scale`（見 `styles/components/project-grid.css` 的 `.project-grid`）。

### 4.2 命名空間取代 BEM

每個 component 的選擇器都有自己的前綴：`.drawings-*`、`.project-detail-*`、`.contact-*`、`.hero-*`。

**效果：`index.html` 裡樣式表的 link 順序不影響結果**（因為沒有選擇器互撞），唯一要求是 `base.css` 放第一個（reset 要先套）。

這其實是「窮人版的 CSS Modules / scoped styles」。面試可以說：「我沒有 build step 幫我做 scoping，所以用命名紀律換等效的隔離。」

### 4.3 排版：Grid、Flex、clamp

**Grid** 用在二維版面：

```css
.project-grid {
    display: grid;
    grid-template-columns: repeat(var(--project-column-count), minmax(0, 1fr));
    gap: 20px;
}
```

`minmax(0, 1fr)` 是必須的細節：`1fr` 的預設最小值是 `auto`，遇到長字串或大圖會撐破欄位；寫成 `minmax(0, 1fr)` 才真的能被壓縮。**這是很常見的面試考點。**

**Flex** 用在一維排列（filter chips、footer 兩端）。

**clamp()** 用在流體字級：

```css
.about-title { font-size: clamp(2rem, 3.7vw, 3.15rem); }
```

讀作「最小 2rem、理想 3.7vw、最大 3.15rem」，取代一堆 media query 斷點。

### 4.4 `position: sticky` 與堆疊

Drawings 卡片與 sections 都靠 sticky 疊在一起：

```css
.drawings-track {
    --drawings-stack-top: 148px;     /* 卡片停在哪 */
    --drawings-stack-step: 14px;     /* 下一張往下錯開多少 */
}

.drawings-card {
    position: sticky;
    top: calc(var(--drawings-stack-top) + (var(--drawings-card-index, 0) * var(--drawings-stack-step)));
    z-index: calc(20 + var(--drawings-card-index, 0));
    transform: translate3d(0, 0, 0) scale(var(--drawings-card-scale, 0.92));
}
```

停靠位置寫成 track 上的兩個 token，是因為 **`drawings.js` 也要用到同一組數字**（算陰影衰減時要知道卡片錯開多少）。手機斷點只覆寫這兩個值就換了一整套堆疊節奏。這叫「**單一事實來源（single source of truth）**」—— 若兩邊各寫一份，改了 CSS 而忘記改 JS，陰影就會算錯而且不會報錯。詳見 §6.11。

**sticky 的成立條件（面試常考）：**
1. 必須指定 `top`/`bottom`/`left`/`right` 至少一個，否則等同 `static`。
2. 它只在**父容器的範圍內**黏住，父容器捲出畫面就跟著走。
3. **祖先若有 `overflow: hidden/auto/scroll`，sticky 會失效**（因為 sticky 是相對最近的 scroll container 定位）。這是最常見的「為什麼我的 sticky 不動」原因。

JS 只負責寫入 `--drawings-card-index` 與 `--drawings-card-scale`（`scripts/components/drawings.js`），位移與層級交給 CSS 算 —— 這正是本專案的 JS↔CSS 契約。

### 4.5 `aspect-ratio` 與 `object-fit`

```css
.project-card { aspect-ratio: 1 / 1; }
.drawings-image { aspect-ratio: 1 / 1; object-fit: contain; }
.hero-main-image { object-fit: cover; object-position: center 76%; }
```

- `aspect-ratio` 讓元素在圖片載入前就佔好位置 → **消除 CLS（Cumulative Layout Shift）**。
- `object-fit: cover` 填滿並裁切；`contain` 完整顯示留白。
- `object-position` 決定裁切的重心（`center 76%` = 偏下，讓人物的頭不被切掉）。

§6.7 的放大鏡功能就是**反推 object-fit 的幾何**才做得到。

### 4.6 動畫效能三兄弟：`transform` / `will-change` / `contain`

```css
.drawings-section {
    transform: translate3d(0, calc((1 - var(--section-separate, 0)) * var(--section-overlap) * -1), 0);
    will-change: transform;
    backface-visibility: hidden;
    contain: paint;
}
```

- `translate3d(...)` 而非 `translateY(...)`：促使瀏覽器把它提到自己的 **compositing layer**（GPU）。
- `will-change: transform`：**提前**告知瀏覽器要動，讓它先建好圖層，避免動畫第一幀掉幀。
  ⚠️ **濫用會反效果**：每個圖層都吃 GPU 記憶體。正確用法是只加在「真的會持續動」的元素，動完可以移除。面試官若問「will-change 有什麼副作用」，這就是答案。
- `contain: paint`：宣告「這個元素的繪製不會溢出邊界」，瀏覽器就能把重繪範圍限制在此，不必檢查外面。屬於 **CSS Containment** 規範。
- `backface-visibility: hidden`：老派的強制圖層提升技巧（也用在 about 卡片翻面時隱藏背面）。

### 4.7 視覺效果：`backdrop-filter`、`mix-blend-mode`、`clip-path`

```css
.section-floating-nav { backdrop-filter: blur(28px) saturate(148%); }
.project-image::after  { mix-blend-mode: screen; }
.hero-visual           { clip-path: inset(0 round calc(30px + (999px * var(--hero-story-progress)))); }
.hero.is-comma-phase .hero-visual { clip-path: polygon(18% 0, 100% 0, 100% 56%, 64% 100%, 20% 100%, 46% 54%, 18% 54%); }
```

- `backdrop-filter`：模糊「元素背後」的內容 → 毛玻璃。**很貴**，因為要先把背後畫面 render 成貼圖再模糊。需要 `-webkit-` 前綴支援舊 Safari。
- `mix-blend-mode: screen`：混合模式，效果等同攝影裡的「濾色」，用來做打光。
- `clip-path`：裁切形狀。`inset(0 round Npx)` 可以做圓角動畫；`polygon()` 可以做任意多邊形 —— hero 最後把主視覺變成一個「逗號」形狀就是靠它。
  ⚠️ **`clip-path` 在 inset ↔ polygon 之間是無法平滑補間的**（頂點數不同），所以程式碼裡是用 class 切換做「瞬間換形」，靠前面的縮放動畫掩護。

### 4.8 `transition` vs `animation`

| | `transition` | `animation` (`@keyframes`) |
| --- | --- | --- |
| 觸發 | 屬性值改變時 | 套用 animation 時 |
| 中間狀態 | 只有起點與終點 | 可定義任意百分比關鍵影格 |
| 重播 | 需要值再變一次 | 可 `iteration-count` / 重設 class |

本專案裡「一次性播放的圖示滾動」用 animation，且用了一個經典技巧強制重播：

```js
button.classList.remove("is-scrolling");
void button.offsetWidth;          // ← 強制 reflow，讓瀏覽器認知到「移除」發生了
button.classList.add("is-scrolling");
```

**`void element.offsetWidth` 是什麼？** 讀取 `offsetWidth` 會強迫瀏覽器**同步計算 layout**（flush pending style changes）。若不讀，瀏覽器會把「移除 class」和「加回 class」合併成沒有變化，動畫就不會重播。這叫 **forced synchronous layout / layout flush**，在這裡是刻意為之，但在迴圈裡就是效能殺手（見 §7.1）。

### 4.9 可變字型（Variable Fonts）

```css
.drawings-title-char {
    font-variation-settings: "wght" var(--char-wght, 200), "wdth" var(--char-wdth, 60);
}
```

傳統字型每個字重是一個獨立檔案；可變字型是**一個檔案 + 連續的軸（axis）**。標準軸有 `wght`（100–1000）、`wdth`（寬度）、`slnt`（傾斜）、`opsz`（光學尺寸）等。

本專案特地讓 `.drawings-title` 用 **Roboto Flex** 而不是全站的 Inter，就是因為 **Inter 沒有 `wdth` 軸**，而這個效果主要靠寬度變化。

⚠️ **效能陷阱**：改 `wdth` 會改變字符寬度（advance width）→ 觸發**重新排版**。所以 `drawings-title.js` 做了兩層防護（見 §6.8）。

### 4.10 媒體查詢策略

```
1080px  → 欄數 3 → 2
768px   → 欄數 2 → 1、關閉 hero story、關閉慣性捲動
(hover: none), (pointer: coarse)  → 觸控裝置行為
prefers-reduced-motion: reduce    → 關閉動畫
```

`(hover: hover) and (pointer: fine)` 是**能力查詢（capability query）**，比用寬度猜「是不是手機」精確得多 —— 因為觸控筆電確實存在。cursor follower 就是用它決定要不要啟用（`scripts/components/cursor-follower.js` 的 `finePointerQuery`）。

### 4.11 JS 與 CSS 的溝通契約

**規則：JS 只寫兩種東西 —— `is-*` class 與 CSS custom property。幾乎不直接寫 `element.style.width`。**

```js
section.style.setProperty("--section-separate", String(progress));   // 數值 → CSS 自己算
hero.classList.toggle("is-story-complete", ...);                     // 狀態 → CSS 自己決定樣式
```

好處：
- 樣式邏輯全部留在 CSS，改視覺不必動 JS。
- CSS 可以用同一個變數同時驅動多個屬性（hero 的 `--hero-story-progress` 一個值同時驅動寬、高、圓角、旋轉、位移）。
- 支援 `prefers-reduced-motion` 這類覆寫，不必在 JS 裡分支。

> 面試話術：「我把 JS 當成『狀態的來源』，CSS 當成『狀態的呈現』。JS 只負責回答 progress 是 0.42，至於 0.42 長什麼樣子是 CSS 的事。」

---

## 5. JavaScript 核心技巧

### 5.1 事件系統

**冒泡（bubbling）與事件委派（delegation）：**

```js
// scripts/components/drawings.js —— 只掛一個監聽在 track 上
drawingsTrack.addEventListener("click", function (event) {
    const card = event.target.closest(".drawings-card");
    if (!card) { return; }
    openDrawingsDetail(...);
});
```

`event.target` 是**實際被點的最深元素**，`closest()` 往上找最近的符合祖先。用一個監聽處理 N 張卡片，而且日後動態新增卡片也不必重新綁定。

（對照：`project-grid.js` 是每張卡片各綁一次，因為它同時要在該處建立 list-view 的 DOM。兩種寫法都在專案裡，可以拿來比較優劣。）

**passive listener：**

```js
window.addEventListener("scroll", handler, { passive: true });   // 承諾不會 preventDefault
window.addEventListener("wheel", handler, { passive: false });   // 明確表示「我要 preventDefault」
```

瀏覽器為了捲動流暢，必須先知道你會不會攔截事件。`passive: true` = 我不攔，你放心先捲；瀏覽器就不用等 JS 執行完。本專案的慣性捲動**必須**攔截 wheel，所以那支監聽只能是 `passive: false` —— 這也是自訂捲動的固有成本。

**Pointer Events：**
`pointermove` / `pointerdown` / `pointerenter` 統一了滑鼠、觸控、觸控筆，用 `event.pointerType === "touch"` 分辨來源。比同時綁 mouse + touch 事件乾淨。

### 5.2 rAF 迴圈與節流

```js
let isTicking = false;
function requestSectionStackMotion() {
    if (isTicking) { return; }
    isTicking = true;
    window.requestAnimationFrame(function () {
        updateSectionStackMotion();
        isTicking = false;
    });
}
window.addEventListener("scroll", requestSectionStackMotion, { passive: true });
```

**為什麼要這個 flag？** 一次捲動可能觸發幾十個 scroll 事件，但畫面一秒只更新 60 次。這個模式（**rAF throttle**）保證「每一幀最多算一次」，是 scroll-linked 動畫的標準寫法。

比起 `setTimeout` 節流，rAF 的優勢是**與螢幕刷新同步**，而且分頁在背景時會自動暫停。

**只在需要時保持迴圈存活：**

```js
// drawings-title.js
if (!isSettled) { renderFrame = window.requestAnimationFrame(applyPressure); }
// contact.js
if (ripples.length > 0 && isContactFieldVisible) { ... requestAnimationFrame(...) }
```

動畫停下來就讓迴圈自然結束，不留一個永遠在跑的 rAF。這對筆電電池與背景分頁很重要。

### 5.3 lerp（線性插值）與 easing

整個網站的「順滑感」幾乎都來自同一個三行公式：

```js
current += (target - current) * lerpFactor;      // lerpFactor 介於 0~1
```

這是**指數趨近（exponential smoothing）**：每幀補上剩餘距離的固定比例，所以起步快、收尾慢，自然產生 ease-out。`core/scroll.js` 的 `lerp: 0.018` 很小，所以慣性很長；hero 的 `lerp: 0.14` 就俐落得多。

搭配**收斂閾值**避免無限逼近：

```js
if (Math.abs(distance) <= settleDistance) { current = target; /* 停止迴圈 */ }
```

另一種是**時間驅動 easing**（`core/utils.js`）：

```js
export function easeInOutCubic(p) {
    return p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p + 2, 3) / 2;
}
export function easeOutBack(p, overshoot) { /* 會超過 1 再彈回來 */ }
```

用在有明確時長的動作（`smoothScrollTo` 的 1600ms）。

> **必須誠實承認的缺陷**：`current += (target-current) * 0.018` 沒有考慮 **delta time**。在 120Hz 螢幕上一秒會執行 120 次而非 60 次，捲動會變快。正確做法是 `factor = 1 - Math.pow(1 - lerp, dt / 16.67)`。專案裡只有 contact ripple 有做 dt 補償（`RIPPLE_SPEED * delta`）。**這是很好的「我知道我的程式碼哪裡不完美」素材。**

### 5.4 IntersectionObserver

```js
const contactObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
        isContactFieldVisible = entry.isIntersecting;
        if (isContactFieldVisible) { requestContactFieldAnimation(); }
    });
}, { threshold: 0.08 });
contactObserver.observe(contactSection);
```

**為什麼不用 scroll + getBoundingClientRect？** 因為那要在主執行緒每幀量測；IntersectionObserver 由瀏覽器在合成階段非同步判斷，**不阻塞主執行緒也不觸發 layout**。

`threshold: 0.08` = 露出 8% 就算進入。

### 5.5 matchMedia：在 JS 裡讀媒體查詢

```js
export const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
if (reducedMotionQuery.matches) { /* 不跑動畫 */ }
finePointerQuery.addEventListener("change", syncCursorAvailability);   // 也能監聽變化
```

比 `window.innerWidth < 768` 好，因為它與 CSS 用同一套判斷標準，不會兩邊漂移。

### 5.6 WeakMap

```js
const heroScrambleTimers = new WeakMap();
heroScrambleTimers.set(element, timer);
```

key 是 DOM 元素。**WeakMap 的 key 是弱參照**：元素被移除後，這筆記錄可被 GC 回收，不會造成記憶體洩漏。若用普通 `Map`，就會永遠抓著已被移除的節點。

### 5.7 TreeWalker + Range（進階 DOM）

`cursor-follower.js` 要判斷「滑鼠是否落在**文字本身**上」而不只是文字的容器盒子：

```js
const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
const range = document.createRange();
range.selectNodeContents(textNode);
range.getClientRects();     // ← 拿到每一「行」文字的實際矩形
```

`Range.getClientRects()` 會回傳文字換行後的**每一行**矩形。這是原生 API 少見但很強的部分，面試講出來很加分。

### 5.8 Canvas 2D 與型別陣列

contact 的漣漪效果（`scripts/components/contact.js`）：

```js
dotsX = new Float32Array(dotCount);        // 型別陣列：連續記憶體、無裝箱
crestBuffer = new Float32Array(dotCount * 3);   // 每幀重複使用，迴圈裡零配置

context.beginPath();
for (...) { context.moveTo(x + r, y); context.arc(x, y, r, 0, Math.PI*2); }
context.fill();                            // ← 幾千個點只 fill 一次
```

**三個效能重點：**
1. `Float32Array` 取代物件陣列，避免每個點都是一個 heap 物件。
2. **一次 `beginPath()` + N 次 `arc()` + 一次 `fill()`**，而不是每個點 fill 一次。狀態切換（`fillStyle`）與 draw call 才是 canvas 的成本大宗。
3. `moveTo()` 必須寫在 `arc()` 前面，否則 `arc` 會從上一個點畫一條連接線過來。

還有 **DPR（devicePixelRatio）處理**：

```js
const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
canvas.width  = Math.round(width * pixelRatio);     // 實際像素
canvas.style.width = width + "px";                  // CSS 尺寸
context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
```

不做這件事，Retina 螢幕上 canvas 會糊掉。上限設 2 是避免 3x 手機畫太多像素。

---

## 6. 逐子系統解剖

每一節的結構：**要解決什麼 → 怎麼做 → 關鍵程式碼 → 面試官會追問什麼**。

### 6.1 進場門（Enter Gate）

**檔案**：`scripts/components/hero.js`、`styles/base.css`

**問題**：想讓訪客先輸入名字，在那之前不能捲動、不能點導覽。

**做法**：
- `html` / `body` 初始帶 `is-locked`；CSS 對其他 section 套 `opacity: 0.18; filter: blur(3px); pointer-events: none;`，並 `overflow: hidden` 鎖捲動。
- `scroll.js` 的 wheel 監聽第一件事就是問 `scrollGate.isLocked()`，是就 `preventDefault()`。
- 表單送出 → `markEntered(name)` → 移除 class → `dispatchEvent(new CustomEvent("portfolio:entered"))`。
- 進場前錨點連結也是死的（`floating-nav.js` 的 `protectedLinks` 會 `preventDefault`）。

**追問：**
- 「只用 CSS `overflow: hidden` 鎖捲動夠嗎？」→ 不夠。iOS Safari 上 body overflow 會漏，且鍵盤（空白鍵、PageDown）仍能捲。所以這裡是 **CSS + wheel/touch preventDefault + keydown 處理** 三層。
- 「這對 SEO / 無障礙的代價？」→ 內容在 DOM 裡（爬蟲讀得到），但螢幕閱讀器使用者被迫先過表單，這是**體驗設計凌駕可用性**的取捨，要能坦白說出來。

### 6.2 Hero 故事捲動（Scrub）狀態機

**檔案**：`scripts/components/hero.js`

**問題**：進場後，主視覺要在「捲動時」從全螢幕卡片變形成一個小逗號，變形完成才放行讓頁面真的往下捲。

**做法**：

```js
export const HERO_PHASES = { IDLE, ENTERING, MORPHED, SCRUBBING, COMPLETE };
```

1. wheel 事件不直接改畫面，只改 `heroStoryTargetProgress`（0→1）。
2. 一個 rAF 迴圈 `stepHeroStory()` 把 `heroState.progress` 用 lerp 逼近 target。
3. 每幀把 progress 寫成 CSS 變數：

```js
hero.style.setProperty("--hero-story-progress", progress.toFixed(4));
hero.style.setProperty("--hero-side-pull", magneticPull.toFixed(4));
hero.style.setProperty("--hero-side-scale", magneticScale.toFixed(4));
```

4. CSS 用這一個變數同時驅動寬、高、圓角、clip-path、旋轉、位移：

```css
.hero.is-entered .hero-visual {
    width: calc(var(--hero-card-width) - ((var(--hero-card-width) - var(--hero-comma-width)) * var(--hero-story-progress)));
    border-radius: calc(30px + (999px * var(--hero-story-progress)));
    transform: translate(-50%, calc(-50% + (var(--hero-comma-shift-y) * var(--hero-story-progress))))
               rotate(calc(10deg * var(--hero-story-progress)));
}
```

5. progress 到 1 → `completeHeroStory()` → 1.3 秒後自動捲到 `#projects`。

**最精巧的一行 —— `isSettling`：**

```js
const isSettling = heroStoryFrame !== null;
const isConsumed = isSettling ||
    (delta > 0 && heroStoryTargetProgress < 1) ||
    (delta < 0 && heroStoryTargetProgress > 0);
if (!isConsumed) { return false; }     // 回 false = 交還捲動權
```

**為什麼需要？** 因為 target 可能已經到 1，但畫面上的 progress 還在 0.83 慢慢追。如果這時就把 wheel 還給頁面，使用者會看到「動畫還沒演完，頁面已經滑走了」。所以只要 rAF 還在跑（`heroStoryFrame !== null`），wheel 就繼續被吃掉。

**追問：**
- 「為什麼不用 GSAP ScrollTrigger？」→ 可以，而且會少寫很多程式碼。這裡是刻意手寫來完全控制「何時交還捲動權」。專案裡 `vendor/` 確實放了 GSAP 但沒接。
- 「狀態機為什麼用字串常數不用 enum？」→ 沒有 TypeScript。`HERO_PHASES` 物件是窮人版 enum。
- 「手機怎麼辦？」→ 見下一小節。**降級而非硬撐**，但降級本身有代價。

#### 6.2.1 觸控降級：連續驅動 vs 離散驅動

hero 第一幕（媒體撐滿畫面）由 `--hero-expand-progress` 一個變數驅動。桌機用滾輪把它從 0 推到 1；觸控沒有滾輪可 scrub，`completeHeroExpand()` 直接 `writeExpandProgress(1)` —— **同一幀從 0 跳到 1**。

於是所有讀這個變數的樣式，桌機是漸變、手機是跳變：

```css
.hero-visual::after { opacity: clamp(0, calc((var(--hero-expand-progress) - 0.45) / 0.55), 1); }  /* 黑色遮罩 */
.hero-expand-title  { opacity: clamp(0, calc(1.6 - (var(--hero-expand-progress) * 1.9)), 1); }    /* 標題 */
```

**修法：在觸控區塊裡替這些屬性補 `transition`，給跳變一段路可走。**

```css
@media (hover: none), (pointer: coarse) {
    .hero-visual::after { transition: opacity 1.8s cubic-bezier(0.33, 0, 0.15, 1); }

    .hero-expand-title {
        will-change: opacity, filter, transform;
        transition:
            opacity 1.5s cubic-bezier(0.33, 0, 0.15, 1),
            filter  1.5s cubic-bezier(0.33, 0, 0.15, 1),
            transform 1.9s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .hero.is-expanded .hero-expand-title {
        filter: blur(6px);
        transform: translateY(-50%) scale(1.06);   /* 散開比淡出慢 0.4s 收尾 */
    }
}
```

**核心觀念：同一個屬性，連續驅動時不能有 transition，離散驅動時必須有。** 桌機的值每一幀都被 JS 改寫，加了 transition 等於讓瀏覽器去追一個一直在跑的目標，動畫會遲滯、手感變黏。所以 transition 只能寫在觸控區塊裡。

**降級還有兩個不是 transition 的問題：**

| 症狀 | 原因 | 修法 |
| --- | --- | --- |
| 卡片進到輸入名字時縮一下 | 觸控的起始值 `calc(100% - 16px)` 與展開終點 `calc(100% - 24px)` 不一致 | 兩個數字對齊。桌機是滑到終點所以必然相同，觸控是直接把起點設成終點，得手動保證 |
| resize 把還在演的開場戲掐斷 | 手機瀏覽器自發 `resize`（網址列收起、鍵盤彈出），而 `syncHeroExpandMode()` 一被呼叫就快轉到結尾 | 補 `!isHeroIntroComplete` 守衛 |

> 一句話：**降級路徑不是原路徑的子集，是另一條路徑，要另外測。** 「關掉動畫」不等於降級完成 —— 還要重新指定那個瞬間怎麼過渡、起點終點自己對齊。

#### 6.2.2 手機表單進場：blur 的成本與高度預留

**(1) 進場只用 `opacity` + `transform`。** 原本加了 `filter: blur(8px)`，實測會頓：blur 半徑動起來**無法被合成**，每幀都要在主執行緒重新光柵化，而它出場的同時描述文字正在跑逐字亂碼（每 55ms 改一次 DOM）。opacity 與 transform 走合成器，主執行緒再忙都不影響。

（§6.2.1 的標題留著 blur，是因為只跑 1.5s，且下面 (2) 的重排問題已修掉。**同一個屬性能不能用，取決於當下主執行緒還剩多少。**）

**(2) 高度要先撐住，否則表單會被文字推走。** `.content` 絕對置中，描述句子逐字打出 —— 手機寬度下每多一行，整塊就往下移半行（實測掉 21px、分兩次跳）。把 markup 裡本來就有的 `aria-hidden` 複本疊進同一個 grid 格當「幽靈」：

```css
.description-track { display: grid; }
.description-copy  { grid-area: 1 / 1; }
.description-copy[aria-hidden="true"] { display: block; visibility: hidden; }
```

幽靈那份一開始就是完整句子，區塊從第一幀就是最終高度。**這是 `visibility: hidden` vs `display: none` 最實際的用例：看不見但仍佔位。**

**(3) 輸入框可以變小，字級不行。** `font-size: 16px` 是刻意保留的 —— **iOS Safari 在字級小於 16px 的輸入框取得焦點時會放大整個頁面**，之後 hero 的構圖回不來。縮的是盒子與 padding。

### 6.3 自訂慣性捲動

**檔案**：`scripts/core/scroll.js`

**做法**：攔截 wheel → 累加到 `inertiaScrollTargetY` → rAF 迴圈 lerp 到 `window.scrollTo()`。

```js
const inertiaScrollSettings = { lerp: 0.018, wheelMultiplier: 1.12, settleDistance: 0.2 };
```

**必須知道的三個「不做」條件**（`shouldUseInertiaScroll`）：

```js
if (!isEntered() || reducedMotionQuery.matches || nonDesktopScrollQuery.matches) return false;
if (event.ctrlKey || event.metaKey || event.shiftKey) return false;     // 縮放 / 水平捲動
if (hasScrollableAncestor(event.target)) return false;                  // 滑鼠在可捲動子元素上
```

`hasScrollableAncestor()` 會往上走 DOM，用 `getComputedStyle` 檢查 `overflow-y` 是否為 `auto/scroll` 且 `scrollHeight > clientHeight`。**沒有這段，overlay 內的圖片列表就捲不動** —— 這是自訂捲動最常見的 bug。

**還要處理 `deltaMode`：**

```js
if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
return event.deltaY;      // DOM_DELTA_PIXEL
```

Firefox 傳的是「行數」而不是像素。忽略這點會讓 Firefox 的捲動慢到不能用。**這題答得出來，面試官會知道你真的跨瀏覽器測過。**

**追問：**
- 「scroll hijacking 不是反模式嗎？」→ 是。要能說出代價：鍵盤捲動、找頁面搜尋、輔助技術、暈眩敏感者都會受影響。本專案的補救是：`prefers-reduced-motion` 關閉、觸控/窄螢幕關閉、鍵盤按鍵時 `cancelInertiaScroll()` 交還控制權。
- 「為什麼不用 Lenis？」→ `vendor/` 裡就有 Lenis。手寫是為了學習與控制；正式產品應該用經過驗證的函式庫。

### 6.4 Section 堆疊

**檔案**：`scripts/core/sections.js` + 各 section 的 CSS

section 用**負 margin 互相重疊**，捲動時逐漸分離：

```js
const progress = Math.min((triggerDistance - rect.top) / triggerDistance, 1);
section.style.setProperty("--section-separate", String(progress));
```

```css
transform: translate3d(0, calc((1 - var(--section-separate, 0)) * var(--section-overlap) * -1), 0);
```

progress 0 → 位移 `-overlap`（疊住）；progress 1 → 位移 0（分開）。JS 只給一個 0–1 的數字。

`smoothScrollToSection()` 因此要補償負 margin：

```js
const marginTop = parseFloat(computedStyles.marginTop) || 0;
const overlapOffset = marginTop < 0 ? Math.abs(marginTop) : 0;
const targetY = window.scrollY + rect.top + overlapOffset + sectionScrollOffset;
```

**追問**：「為什麼捲到 contact 不會停在正確位置？」→ 就是因為負 margin，這段補償邏輯就是答案。

### 6.5 專案列表：篩選與雙檢視

**檔案**：`scripts/components/project-grid.js`、`styles/components/project-grid.css`

**資料與 markup 的耦合（本專案最大的技術債，要能主動講）：**

- 卡片是 `index.html` 裡的**靜態 markup**。
- 詳細內容在 `scripts/mineport-project-data.js` 的 `window.MINEPORT_PROJECT_DETAIL_DATA`。
- 兩者**只靠陣列索引對齊**：

```js
export const projectDetails = projectDetailData.slice(0, cardCount);
```

所以新增一個專案要動 **4 個地方**：`index.html` 的 `<article>`、資料檔對應索引、`.image-grid-NN` 的 CSS 背景圖、以及三個圖片資料夾。

> 面試話術：「這是我會第一個重構的地方。正確做法是讓卡片由資料 render 出來，索引耦合就消失了。我當時保留靜態 markup 是為了讓沒有 JS 時仍看得到內容，但這個理由在有 9 張卡片之後已經不划算了。」

**三軸篩選**：category（`data-category`）、year（`data-year`）、typology（來自資料檔）。三個條件 AND：

```js
const shouldShow = matchesCategory && matchesYear && matchesTypology;
card.style.display = shouldShow ? "" : "none";
```

**面板動畫的 open/closing 雙狀態**：CSS 裡 `.is-open` 和 `.is-closing` 各有一組 transition，因為「展開」與「收合」需要不同的時長與曲線（展開要有彈性、收合要俐落）。收合時還用 `visibility 0s linear 0.56s` 延遲隱藏，讓淡出動畫演完。這是**用 transition-delay 控制 visibility** 的經典技巧（`visibility` 可以被 transition，`display` 不行）。

**grid ↔ list 切換**：切換一個 class，然後用 stagger 動畫：

```css
.project-grid.is-switching-to-list .project-card {
    animation: project-list-drop 1.45s cubic-bezier(0.16, 1, 0.3, 1) both;
    animation-delay: calc(var(--card-index) * 96ms);
}
```

`--card-index` 是 JS 在 init 時寫上去的，讓 CSS 自己算延遲 —— 又一次「JS 給數字、CSS 給表現」。

**卡片縮圖的 blur-up：背景圖沒有 `load` 事件**

卡片縮圖不是 `<img>`，是 `.image-grid-NN` 的 `background-image`。**CSS 背景圖不會觸發 `load`**，所以中途沒有任何可掛勾的時機點，只能一張張硬跳出來。解法是用一個探針去問同一個 URL：

```js
// scripts/components/project-grid.js
function setupProjectCardImage(card) {
    const image = card.querySelector(".project-image");
    const match = /url\(["']?([^"')]+)["']?\)/.exec(window.getComputedStyle(image).backgroundImage);
    if (!match) { return; }

    const probe = new Image();
    probe.decoding = "async";
    probe.src = match[1];

    if (probe.complete && probe.naturalWidth > 0) {   // 已在快取：直接顯示
        card.classList.add("is-image-loaded");
        return;
    }

    card.style.setProperty("--preview-image", "url('…')");
    card.classList.add("is-image-pending");
    probe.addEventListener("load",  settle, { once: true });
    probe.addEventListener("error", settle, { once: true });
}
```

**四個設計重點：**

1. **探針不會重複下載** —— 同一個 URL 命中同一個快取項目，只發一個請求。這是「幫背景圖補上 load 事件」的標準手法。
2. **網址從 `getComputedStyle` 讀回**，不在 JS 重寫一份路徑，避免兩份事實來源。
3. **`probe.complete` 早退**：專案區在首屏下方但背景圖跟頁面一起下載，模組跑起來時有些已經好了。少了這個判斷，那些卡片會先變模糊再淡回來 —— 往回閃比原本的問題更糟。
4. **`error` 也要 settle**：任何「等待 → 揭曉」的狀態機都要有失敗出口，否則壞檔會讓卡片永遠卡在模糊層後面。

CSS 端讓**預設狀態是「看得見」**，模糊層只有 JS 明確說「還沒好」時才蓋上：

```css
.project-card::before { opacity: 0; }
.project-card.is-image-pending::before { opacity: 1; }
.project-card.is-image-pending .project-image { opacity: 0; }
```

反過來寫的話，JS 一壞整片作品就是空白。**降級的方向要是「少了效果」，不能是「少了內容」。**

### 6.6 專案詳細 Overlay

**檔案**：`scripts/components/project-detail.js`

這是全專案最複雜的模組（584 行），有四個值得講的技術點：

**(1) 批次載入圖片**

```js
export const projectImageBatchSize = 5;
// 捲到剩 900px 就再補一批
if (remainingScroll < 900) { loadMoreProjectDetailImages(); }
```

一個專案可能有 40+ 張圖，一次塞進 DOM 會爆。這是**手寫的無限捲動 / 虛擬化（簡化版）**。

**(2) blur-up 佔位圖（progressive image loading）**

```js
// scripts/core/utils.js —— 卡片縮圖與詳細圖共用，所以放在 core 而不是某個 component
export function getPreviewImageSrc(imageSrc) {
    return String(imageSrc || "")
        .split("?")[0]
        .replace("assets/images/", "assets/images/previews/")
        .replace(/\.[^/.]+$/, ".jpg") + "?v=2";
}
```

`scripts/generate-previews.js` 用 macOS 的 `sips` 把每張圖縮成 **48px 寬、品質 45 的 JPEG**（通常 1–2KB），放在鏡像的 `previews/` 目錄。CSS 先把它當背景放大模糊顯示，真圖 `load` 後加上 `is-loaded`，把真圖淡入。

這就是 Medium / Next.js `<Image placeholder="blur">` 的原理，只是手工做。

> 這個函式原本住在 `project-detail.js`，卡片縮圖也要用之後才搬到 `core/utils.js`。判斷標準是**有沒有第二個使用者**，不是「看起來夠不夠通用」。

**(2b) 模糊佔位還不夠：版面仍會跳（CLS）**

blur-up 解決的是「出現時突不突兀」，沒解決「**出現時把下面的內容推走**」。詳細頁的 `<img>` 是 `height: auto` 且沒寫尺寸，載完之前瀏覽器不知道它多高。

修法是**用佔位圖的尺寸把框先釘住** —— 佔位圖同比例、只有 1–2KB，會比原圖早很多到：

```js
function reserveProgressiveImageBox(image, previewSrc) {
    const probe = new Image();

    function applyRatio() {
        if (probe.naturalWidth && probe.naturalHeight) {
            image.style.aspectRatio = probe.naturalWidth + " / " + probe.naturalHeight;
        }
    }

    probe.addEventListener("load", applyRatio, { once: true });
    probe.decoding = "async";
    probe.src = previewSrc;

    if (probe.complete) { applyRatio(); }    // 快取命中就在這一幀套用
}
```

**兩個設計決定：**

1. **比例是「釘住」而非載完交還給原圖。** 佔位圖的短邊被四捨五入到整數像素，兩者比例差約 1%；載完放手就等於把 bug 縮小後裝回去。圖片是 `object-fit: contain`，那 1% 只表現成邊緣一條髮絲寬的白。
2. **必須處理 `probe.complete`。** 重開同一個專案、或兩個專案共用同一張圖時是快取命中，`load` 不會再發一次，少了這行圖片會先塌成 0 高再撐開。**「已經在快取裡」是所有非同步載入邏輯都要另外處理的路徑**（§6.5 的卡片縮圖同理）。

實測載入前後高度都是 `[516, 482, 465, 465, 991]`，位移為 0。

> 為什麼不直接在 HTML 寫 `width`/`height`？圖片是 JS 動態 append 的，尺寸只存在於圖檔本身；寫死就要在資料檔多維護一份會過期的尺寸表。用佔位圖去問，等於讓檔案自己回答。

**(3) 兩種 lazy loading 並存 —— 而且知道為什麼**

- 詳細列表用 `image.loading = "lazy"`（原生）。
- **Gallery 舞台不能用原生**，因為那條 track 是靠 `transform` 位移的，**slide 的 layout box 永遠不會離開 viewport**，瀏覽器認為它們全都可見，於是一次下載全部。所以真正的網址被藏在 `data-src`，由 JS 判斷距離目前 slide 兩格內才寫進 `src`：

```js
if (Math.abs(slideIndex - activeSlideIndex) > galleryStagePreloadRadius) { return; }
image.setAttribute("src", deferredSrc);
```

> **這一題非常適合拿來展示深度**：「我知道 `loading="lazy"` 的判斷依據是 layout 位置而不是視覺位置，所以 transform 位移的輪播它幫不上忙。」

**(4) 無限迴圈輪播的 clone 技巧**

```js
const stageImages = [last].concat(all, first);   // 頭尾各複製一張
```

走到尾端的 clone 後，在 `transitionend` 時**關掉 transition、瞬間跳回真正的那一張、再打開 transition**：

```js
projectDetailStageTrack.style.transition = "none";
renderProjectGalleryMode();
void projectDetailStageTrack.offsetWidth;      // 強制 reflow，讓「無 transition 的位移」生效
projectDetailStageTrack.style.transition = "";
```

使用者看不出接縫。clone 用 `aria-hidden="true"` 對輔助技術隱藏。

**(5) 焦點管理（a11y）**

```js
// 開啟後把焦點移到關閉鈕
projectDetailClose.focus({ preventScroll: true });
// 關閉後還給原本那張卡片
lastFocusedProjectCard.focus({ preventScroll: true });
```

`preventScroll: true` 很關鍵 —— 否則 focus 會讓瀏覽器自動捲動，破壞已鎖定的位置。

### 6.7 游標放大鏡

**檔案**：`scripts/components/cursor-follower.js`（522 行）

**問題**：自訂游標在圖片上時要變成一個放大鏡，顯示圖片該點的 2.25 倍。

**難點**：`object-fit: cover` 的圖片，**元素的邊界 ≠ 圖片實際被畫出來的邊界**。要正確取樣，必須反推真正的繪製矩形：

```js
const scale = objectFit === "cover"
    ? Math.max(rect.width / naturalWidth, rect.height / naturalHeight)
    : Math.min(rect.width / naturalWidth, rect.height / naturalHeight);
const renderedWidth  = naturalWidth  * scale;
const renderedHeight = naturalHeight * scale;
// 再用 object-position 算出偏移
left: rect.left + getObjectPositionOffset(objectPosition.x, rect.width - renderedWidth, "x")
```

`cover` 取 `Math.max`（填滿、超出的裁掉），`contain` 取 `Math.min`（完整、留白）—— 這兩行就是 `object-fit` 的數學定義。

然後把放大後的圖當背景，用負偏移把「滑鼠所在的那一點」對到鏡片中心：

```js
positionX = lensCenter - (localX * imageMagnifierScale);
```

**還有一個命中測試（hit testing）的細節**：用 `document.elementsFromPoint(x, y)` 拿到該座標**所有**堆疊的元素（注意是複數），依序找出第一個可放大的。因為自訂游標本身覆蓋在最上層，單數版 `elementFromPoint` 只會回傳游標自己。

**追問**：「觸控裝置怎麼辦？」→ `(hover: hover) and (pointer: fine)` 不成立就整個不啟用，並移除 `has-custom-cursor` class 把原生游標還回去。

### 6.8 Drawings 標題的可變字型壓力場

**檔案**：`scripts/components/drawings-title.js`

「THE MOMENTS」被拆成一個字一個 `<span>`，每個字依「與滑鼠的距離」改變 `wght` 與 `wdth`。

**三個效能防護（這節是效能面試的精華）：**

**(1) 只量測一次，不在 pointermove 量**

```js
function measureChars() { charCenters = charElements.map(c => c.getBoundingClientRect() ... ); }
function queueMeasure() { measureQueued = true; }        // 捲動/縮放只標記
function applyPressure() {
    if (measureQueued) { measureChars(); }               // 在同一幀裡才真的量
    ...
}
```

**為什麼？** `getBoundingClientRect()` 會**強制同步 layout**。如果在每個 pointermove 都量 23 個字，就是典型的 **layout thrashing**（讀→寫→讀→寫，每次讀都逼瀏覽器重算）。正確模式是**批次讀、批次寫**，而且都在同一個 rAF 裡。

**(2) 量化寫入（quantisation）**

```js
const weightStep = 20, widthStep = 4;
const nextWeight = Math.round(state.weight / weightStep) * weightStep;
if (nextWeight !== state.writtenWeight) { el.style.setProperty("--char-wght", nextWeight); }
```

改 `wdth` 會改變字符寬度 → 重新排版。把值量化成 4 的倍數，慢慢移動的滑鼠就只會寫入幾次而不是每幀 23 次。**視覺上看不出階梯，效能差很多。**

**(3) 迴圈會自己停**

```js
if (!isSettled) { renderFrame = requestAnimationFrame(applyPressure); }
```

外加 `isTitleVisible()` 檢查 —— 標題淡出時完全不算。

**(4) 為什麼沒有用 CSS transition？**
程式碼裡有註解特別說明：`font-variation-settings` 若加 transition，會**每一幀重新光柵化字形**（re-rasterise glyphs）。所以緩動是在 JS 裡用 lerp 做的，CSS 只負責套用最終值。

### 6.9 Contact 漣漪場

**檔案**：`scripts/components/contact.js`

**問題**：舊版是「滑鼠附近的點放大」，是一個跟著滑鼠的光暈。新版要「滑鼠移動時放出漣漪，一圈一圈擴散到整頁」。

**模型**：每個 ripple 是 `{x, y, radius, strength}`，每幀 `radius += RIPPLE_SPEED * delta`（有做 dt 補償）。對每個點計算它與波前的距離：

```js
const offsetFromFront = distance - ripple.radius;
if (Math.abs(offsetFromFront) > RIPPLE_BAND) continue;     // 早退：不在波帶內就跳過

const normalized = offsetFromFront / RIPPLE_BAND;          // -1 ~ 1
const envelope = Math.cos(normalized * Math.PI * 0.5);     // 邊緣為 0 的包絡
const shape = envelope * envelope * Math.cos(normalized * Math.PI * 0.85);
const decay = Math.pow(Math.max(0, 1 - ripple.radius / travelDistance), 1.15);
const amount = shape * ripple.strength * decay;
```

`envelope²` 保證波帶邊緣平滑歸零，乘上一個 cos 產生「一個波峰 + 兩側淺波谷」，看起來才像水而不像一個擴散的圓框。`decay` 讓波在抵達最遠角落時剛好衰減完（`travelDistance` = 對角線 + 一個波帶寬）。

點的半徑隨 `amount` 膨脹，並沿徑向被推開（`pushX/pushY`），是水面質感的來源。

**節流生成**：滑鼠移動時，距離 > 54px 且間隔 > 240ms 才生一個新 ripple，最多同時 6 個。否則一秒會生出上百個波。

**繪製**：波峰上的點收進 `crestBuffer`，第二輪用更深的顏色一次畫完 —— 全幀只切換 **2 次 `fillStyle`**（見 §5.8）。

**驗證方法（可以拿來講「你怎麼確認它真的對」）**：用 `getImageData` 把畫布依「離原點的距離」分成 12 個環，量每環的平均 alpha。在 t≈1100ms 時，第 7 環（600–700px）的墨量是背景的 4.7 倍，其餘各環都在基準值 —— 證明波前確實在 `0.58 px/ms × 1100ms ≈ 640px` 的位置，一個環、正在往外走。

### 6.10 浮動導覽的果凍高亮

**檔案**：`scripts/components/floating-nav.js`

高亮塊不是每個連結各一個，而是**一個共用的元素**，用 CSS 變數移動：

```js
sectionFloatingNav.style.setProperty("--nav-highlight-x", highlightX + "px");
sectionFloatingNav.style.setProperty("--nav-highlight-width", linkRect.width + "px");
sectionFloatingNav.style.setProperty("--nav-highlight-scale-x", "1.18");   // 果凍：先拉長
sectionFloatingNav.style.setProperty("--nav-highlight-scale-y", "0.92");   // 再壓扁
// 340ms 後回到 1 / 1
```

這是「**squash and stretch**」，迪士尼十二動畫原則之一：物體移動時先變形再回彈，看起來有重量。

另外它會在閒置 800ms 後收合（`scheduleFloatingNavCollapse`），並透過 `onWheelActivity(wakeFloatingNav)` 在使用者捲動時醒來 —— 又一次用 §3.3 的 observer 接縫，而不是 import hero 或 scroll 的內部狀態。

### 6.11 Drawings 卡片堆疊與陰影衰減

**檔案**：`scripts/components/drawings.js`、`styles/components/drawings.css`

卡片用 `position: sticky` 逐張停靠、疊成一落。位置完全由 CSS 算（見 §4.4），JS 只寫入三個變數：`--drawings-card-index`（init 時寫一次）、`--drawings-card-scale`、`--drawings-card-shadow`。

**(1) 手機也要能堆疊。** 原本 `drawings.js` 有一行 `if (window.innerWidth <= 768) return;` 直接放棄；移掉之後，手機只需覆寫兩個 token 就換一整套節奏：

```css
@media (max-width: 768px) {
    .drawings-track { --drawings-stack-top: 88px; --drawings-stack-step: 9px; }
}
```

（十張卡片用桌機的 14px 步進，在短螢幕上會走出畫面外，所以步進要縮。）

順帶要小心觸控上的 `:hover`：**點過一次之後 `:hover` 會黏著**，所以手機的「取消 hover 效果」規則不能寫 `transform: none` —— 那會把堆疊用的 scale 一起清掉，被點到的那張卡會掉出隊伍。要改成重述堆疊的 transform：

```css
.drawings-card:hover { transform: translate3d(0, 0, 0) scale(var(--drawings-card-scale, 0.94)); }
```

**(2) 陰影不能累加。** 卡片的投影展開到 22px 和 44px，遠大於堆疊 9–14px 的步進 —— 四張停好的卡片各自把整片陰影壓在下一張上，看起來就是一條灰帶而不是四張卡。

修法是讓**陰影隨被覆蓋程度衰減**，用實際距離量而不是用捲動位置換算：

```js
function getCardShadowStrength(rects, index, stickyStep) {
    const next = rects[index + 1];
    if (!next) { return "1"; }

    const distance = next.top - rects[index].top;
    // distance = 卡片高度 → 完全沒被蓋；distance = 步進 → 正停在上面
    const span = Math.max(1, rects[index].height - stickyStep);
    const covered = Math.max(0, Math.min((rects[index].height - distance) / span, 1));

    return (1 - (covered * 0.88)).toFixed(3);   // 留 0.12 的底，卡片之間仍有接縫
}
```

```css
box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,                                    /* 不衰減：卡片自己的邊 */
    0 2px 5px  rgba(18, 15, 12, calc(0.018 * var(--drawings-card-shadow, 1))),
    0 10px 22px rgba(18, 15, 12, calc(0.032 * var(--drawings-card-shadow, 1))),
    0 24px 44px rgba(18, 15, 12, calc(0.028 * var(--drawings-card-shadow, 1)));
```

**兩個觀念：**
- **只縮「投射到別人身上」的層，不縮「自己的邊」**（inset 高光與髮絲邊框）。前者是深度，後者是物件本身。
- **不歸零**：留 0.12 的底，堆疊仍有可見的接縫，不會融成一塊。

> ⚠️ `box-shadow` 改變是 **repaint，不是合成**（見 §2.1）。這裡每幀最多改 10 張卡的陰影，在手機上是可接受的取捨；若真的拖幀，最便宜的退路是拿掉最寬的那層 `0 24px 44px`。

---

## 7. 效能工程

### 7.1 Layout thrashing（最重要的一題）

```js
// ❌ 壞：讀→寫→讀→寫，每次讀都強迫瀏覽器重算 layout
elements.forEach(el => { el.style.height = el.offsetHeight + 10 + "px"; });

// ✅ 好：先全部讀，再全部寫
const heights = elements.map(el => el.offsetHeight);
elements.forEach((el, i) => { el.style.height = heights[i] + 10 + "px"; });
```

會觸發強制同步 layout 的常見屬性：`offsetTop/Left/Width/Height`、`clientWidth/Height`、`scrollTop/Height`、`getBoundingClientRect()`、`getComputedStyle()`。

本專案的體現：`drawings-title.js` 的 measure/apply 分離、`sections.js` 的 rAF ticking、以及刻意使用 `void offsetWidth` 觸發 reflow 來重播動畫（§4.8）。

`drawings.js` 的堆疊迴圈是同一個模式的實例 —— 陰影衰減需要相鄰卡片的位置，所以**先全部量、再全部寫**：

```js
const rects = cards.map(function (card) { return card.getBoundingClientRect(); });   // 讀

cards.forEach(function (card, index) {                                              // 寫
    card.style.setProperty("--drawings-card-scale", ...);
    card.style.setProperty("--drawings-card-shadow", getCardShadowStrength(rects, index, stickyStep));
});
```

交錯寫的話，每次 `setProperty` 都會讓下一張卡的 `getBoundingClientRect()` 失效 —— 一次捲動幀就從**一次** forced layout 變成**每張卡一次**。

### 7.2 圖片管線

三個腳本構成完整流程：

```bash
node scripts/compress-large-project-images.js   # 尺寸上限 → 再壓到位元組預算
node scripts/generate-previews.js               # 產生 48px 模糊佔位圖
node scripts/bump-assets.js                     # 更新 ?v=N
```

**`compress-large-project-images.js` 開頭的註解是整個專案最好的效能教材：**

> 先限制像素尺寸（detail 1800px、gallery 2400px），**再**壓到位元組預算。反過來做（只調品質、保留尺寸）會產生「9449px 寬但硬壓到 1MB」的檔案 —— 又有壓縮瑕疵，**解碼成本還大到讓瀏覽器在位元組都到齊之後才卡住**。

**這是很深的一課**：檔案大小不是唯一指標，**解碼（decode）成本**同樣真實。一張 9000px 寬的 JPEG 解壓後在記憶體裡是 `9449 × 6000 × 4 bytes ≈ 227MB` 的點陣圖。

### 7.3 Cache busting

```html
<link rel="stylesheet" href="styles/components/about.css?v=13">
<script type="module" src="scripts/main.js?v=17"></script>
```

```js
// 而且每一個 import 也要各自帶版本
import { body } from "../core/dom.js?v=17";
```

**為什麼 import 也要？** 因為 `index.html` 上的 `?v=` **不會傳遞**給它 import 的模組。瀏覽器把每個模組 URL 當成獨立的快取項目。所以 `bump-assets.js` 同時處理兩種樣式：

```js
const markupPattern = /((?:href|src)="(?:styles|scripts)\/[^"]+\.(?:css|js)\?v=)(\d+)(")/g;
const importPattern = /(from "\.{1,2}\/[^"]+\.js\?v=)(\d+)(")/g;
```

圖片網址也各自手寫 `?v=N`（在資料檔裡）。

> **這題非常適合展示「我理解 HTTP 快取」**：正確的產品做法是用 build tool 產生內容雜湊檔名（`main.a3f9c2.js`）並設定 `Cache-Control: immutable`。手動 `?v=N` 是沒有 build step 時的替代方案，缺點是靠人記得執行。

### 7.4 只在必要時運算

| 機制 | 位置 |
| --- | --- |
| rAF ticking flag | `sections.js`、`drawings.js` |
| 動畫收斂就停止迴圈 | `scroll.js`、`hero.js`、`drawings-title.js`、`contact.js` |
| IntersectionObserver 控制可見性 | `contact.js` |
| `passive: true` 監聽 | 幾乎所有 scroll/touch 監聽 |
| 早退（early return） | ripple 的波帶檢查、cursor 的 section 檢查 |

### 7.5 怎麼量測（面試官可能會請你現場示範）

- **DevTools → Performance**：錄一段捲動，看有沒有長 task（>50ms）、有沒有紫色的 Layout 條密集出現。
- **Rendering 面板**：開 *Paint flashing*（看哪裡在重繪）、*Layer borders*（看圖層有沒有爆炸）、*Frame Rendering Stats*。
- **Lighthouse**：看 LCP / CLS / TBT。本站 LCP 幾乎確定是 hero 主視覺圖。
- **Network → Disable cache**：驗證 `?v=` 有沒有真的生效。

---

## 8. 無障礙（a11y）與漸進增強

### 8.1 專案裡確實做到的

| 做法 | 位置 |
| --- | --- |
| `aria-expanded` 同步展開狀態 | filter 面板、about 手風琴、read more |
| `aria-pressed` 表示切換鈕狀態 | grid/list 切換、gallery 切換 |
| `aria-current="page"` 標記目前 section | floating nav |
| `aria-hidden="true"` 隱藏裝飾元素與 clone | 游標、canvas、輪播 clone |
| `role="button"` + `tabindex="0"` + Enter/Space 處理 | 專案卡片、drawings 卡片 |
| 焦點管理（開啟移入、關閉還原） | 兩個 overlay |
| Escape 關閉、方向鍵切換 | 兩個 overlay |
| `aria-label` 保留被拆成 span 的文字語意 | drawings 標題、hero 標題 |
| `prefers-reduced-motion` 降級 | 全站多處 |
| `aria-live="polite"` | hero 副標 |

**`role="button"` 的完整責任（面試常考）：** 加了 role 還不夠，必須自己補上原生 `<button>` 免費給你的三件事 —— 可聚焦（`tabindex="0"`）、Enter 鍵觸發、Space 鍵觸發。專案裡兩處都有做：

```js
card.setAttribute("role", "button");
card.setAttribute("tabindex", "0");
card.addEventListener("keydown", function (event) {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openProjectDetail(index, card); }
});
```

> 但更好的答案是：「其實應該直接用 `<button>` 或 `<a>`。用 div + role 是為了排版方便，這是我在可維護性上讓步的地方。」

### 8.2 已知不足（主動說出來比被抓到好）

1. **捲動劫持**本身就是 a11y 風險（已用 reduced-motion 與觸控降級緩解，但桌機鍵盤使用者仍受影響）。
2. **進場門**強迫所有人先輸入名字才能看內容。
3. overlay 沒有做 **focus trap**（Tab 可能跑到背景元素上）。
4. 部分文字顏色（如 `#9d9a95` 於白底）**對比度可能不到 WCAG AA 的 4.5:1**。
5. 沒有 skip-to-content 連結。

### 8.3 漸進增強的現況

- **沒有 JS**：HTML 內容仍在（爬蟲與閱讀器讀得到），但 `is-locked` 是由 JS 加上的，所以無 JS 時反而不會被鎖住 —— 頁面可讀，只是沒有動畫、卡片點不開。
- **舊瀏覽器**：`type="module"` 會被不支援的瀏覽器忽略（規範設計如此），但本專案沒有 `nomodule` fallback。

---

## 9. 工具鏈與部署

### 9.1 三支 Node 腳本

它們是**純 Node、零相依**（只用 `fs`、`path`、`child_process`、`vm`）：

- **`bump-assets.js`** — 正規表示式替換版本號。有趣的是它用**兩個 pattern** 分別處理 markup 與 import specifier。
- **`generate-previews.js`** — 用 `vm.runInContext()` 在沙箱裡執行資料檔，好在 Node 端讀到 `window.MINEPORT_PROJECT_DETAIL_DATA`（因為那是給瀏覽器寫的全域腳本）。此外它還會**掃 `styles/components/project-grid.css` 的 `url()`**，因為卡片縮圖只存在於 CSS 背景圖裡，不在資料檔中。兩種來源的相對路徑寫法不同（資料檔 `../assets/…`、樣式表 `../../assets/…`），所以統一先過 `toRepoRelative()` 正規化。
- **`compress-large-project-images.js`** — 尺寸上限 → 品質階梯 `[86, 82, 78, 74, 70, 66]` 逐級嘗試直到低於 420KB。

三支都呼叫 macOS 內建的 **`sips`**，所以**在 Linux/Windows 上不能跑**。要跨平台就得換成 `sharp`（但那就需要 npm 相依）。

### 9.2 部署

`main` 分支直推即上線（repo `github.com/ylx959/portfolio-website`，線上位址 `ylx-portfolio.netlify.app`）。沒有 CI、沒有 build、沒有 preview 環境。

**如果面試官問「你會怎麼改善開發流程」：**
1. Vite（dev server + HMR + 內容雜湊檔名，取代手動 `?v=`）。
2. TypeScript 或至少 JSDoc + `checkJs`。
3. GitHub Actions：push 時跑 lint + Lighthouse CI。
4. Playwright 做關鍵路徑的視覺回歸測試（進場、開 overlay、切 filter）。
5. `sharp` 取代 `sips` 讓圖片流程跨平台。

---

## 10. 面試題庫

### 10.1 開場：「介紹一下這個專案」（60 秒版）

> 「這是我的個人作品集網站，純 HTML/CSS/Vanilla JS，沒有框架也沒有 build step。技術上比較有意思的部分有三塊：第一是 hero 的捲動敘事，我用一個狀態機把滾輪事件轉成 0 到 1 的進度值，再用 CSS 變數驅動變形，過程中滾輪會被攔截直到動畫收斂；第二是圖片管線，包含 blur-up 佔位圖、批次載入，以及輪播因為用 transform 位移所以原生 lazy loading 失效、要自己用 data-src 管理；第三是架構，因為沒有框架，我刻意設計了三個接縫來避免模組互相依賴 —— accessor、callback 註冊、還有 CustomEvent 廣播。」

### 10.2 基礎題

| 題目 | 重點答法 |
| --- | --- |
| `defer` vs `async` vs `type="module"` | defer 等 DOM 完成、依序執行；async 下載完就跑、順序不定；module 預設 defer 且有自己的 scope |
| DOMContentLoaded vs load | DOM 建好 vs 所有資源（含圖）載完 |
| 為什麼 module 不能用 `file://` | CORS，`file://` 的 origin 是 null |
| 事件冒泡與捕獲 | 捕獲由外往內、冒泡由內往外；`addEventListener` 第三參數 `true` 走捕獲 |
| 事件委派的好處 | 一個監聽處理 N 個元素、對動態新增的元素自動生效、省記憶體 |
| `==` vs `===` | 前者會型別轉換。本專案一律用 `===` |
| `var` / `let` / `const` | 函式作用域 vs 區塊作用域、TDZ、`const` 只是綁定不可變 |

### 10.3 CSS 題

| 題目 | 重點答法 |
| --- | --- |
| 哪些屬性最便宜？ | `transform` / `opacity`（只走 composite）；`width`/`top` 最貴（觸發 layout） |
| `will-change` 的副作用 | 每個提升的圖層吃 GPU 記憶體；濫用會拖垮效能，動完該移除 |
| sticky 為什麼失效 | 沒設 top/bottom；祖先有 `overflow` 非 visible；父容器高度不足 |
| `minmax(0, 1fr)` 為什麼需要 | `1fr` 的最小值預設是 `auto`，內容會撐破欄位 |
| custom property vs Sass 變數 | 前者 runtime 存在、會繼承、可被 JS 與 media query 改；後者編譯期就沒了 |
| `visibility` vs `display: none` vs `opacity: 0` | visibility 佔空間可 transition；display 不可 transition；opacity 0 仍可被點（要配 pointer-events） |
| `clamp()` 怎麼運作 | `clamp(min, preferred, max)`，preferred 通常用 vw |
| 什麼是 CLS，怎麼避免 | 版面位移；用 `aspect-ratio` / 明確寬高預留空間 |
| BEM 你怎麼看 | 本專案用命名空間前綴達到同樣的隔離效果，因為沒有 build step 做 scoping |

### 10.4 JS / 動畫題

| 題目 | 重點答法 |
| --- | --- |
| rAF vs setTimeout | rAF 與螢幕更新同步、背景分頁自動暫停 |
| 怎麼節流 scroll 事件 | rAF + ticking flag（本專案作法）；或 throttle/debounce |
| passive listener 是什麼 | 承諾不 preventDefault，讓瀏覽器不必等 JS 就能捲動 |
| lerp 的問題 | 沒有 delta-time 補償時，高刷新率螢幕上速度會變快 |
| IntersectionObserver 比 scroll 好在哪 | 非同步、不阻塞主執行緒、不觸發 layout |
| WeakMap 何時用 | key 是物件（如 DOM 節點）且不想阻止 GC 時 |
| 怎麼避免 layout thrashing | 批次讀、批次寫，都放在同一個 rAF |
| `element.closest()` 用途 | 從 event.target 往上找符合選擇器的祖先，事件委派必備 |

### 10.5 深度題（拿本專案當素材，這些最能加分）

**Q：為什麼輪播不能用 `loading="lazy"`？**
A：原生 lazy 判斷的是元素的 layout 位置是否接近 viewport。這條 track 是用 `transform: translateX()` 移動的，transform 不改變 layout box，所以所有 slide 在瀏覽器眼中都「在畫面裡」，會一次全下載。所以我把網址放在 `data-src`，只有距離目前 slide 兩格內才寫進 `src`。

**Q：hero 的滾輪什麼時候還給頁面？**
A：只有當「目標進度已經到邊界」**且**「緩動迴圈已經收斂」兩個條件同時成立。程式碼裡叫 `isSettling`。如果只看目標值，會出現動畫還在演但頁面已經滑走的狀況。

**Q：你怎麼確保沒有框架的情況下模組不互相依賴？**
A：三個接縫 —— state 用 accessor（因為 ESM 的 import 是唯讀 live binding）、scroll 用註冊 gate 做依賴反轉、跨元件廣播用 CustomEvent。依賴方向永遠指向 core，回程只有 callback 和事件。

**Q：圖片你怎麼優化？**
A：四層 —— (1) 先限尺寸再壓位元組，因為解碼成本比下載成本更容易卡住主執行緒；(2) 48px 的模糊佔位圖做 blur-up；(3) 詳細列表批次 append + 原生 lazy；(4) 輪播手動管理 src。並且每個圖片 URL 都有自己的 `?v=`。

**Q：同一段動畫在桌機順、在手機是「啪」一聲出現，為什麼？**
A：那個效果是由一個 0→1 的 CSS 變數驅動的。桌機用滾輪連續推進，手機沒有 scrub 所以一幀跳到 1。修法是只在觸控的 media query 裡補 `transition` —— 不能寫在共用規則上，否則桌機每幀改值會變成「追一個一直在跑的目標」，動畫反而遲滯。**同一個屬性，連續驅動時不能有 transition，離散驅動時必須有。**

**Q：CSS 背景圖要怎麼做 blur-up？它沒有 `load` 事件。**
A：從 `getComputedStyle` 讀回網址，用 `new Image()` 打同一個 URL 當探針 —— 命中同一個快取項目，不會多下載。載完再切 class。要記得處理 `probe.complete`（已快取就別先藏起來再淡入）和 `error`（壞檔也要放行）。

**Q：頁面第一幀就閃出動畫的結局，怎麼修？**
A：靜態 markup 跟著 HTML 畫，defer 的模組還沒跑。只能把初始狀態寫進**阻塞繪製的 CSS**（markup 上掛 `is-intro-pending`，JS 開演時移除）。`DOMContentLoaded` 救不了，它保證的是 DOM 建好，不是還沒畫。

**Q：這個網站最大的技術債是什麼？**
A：卡片 markup 和資料檔用陣列索引耦合。新增一個專案要同步改四個地方，而且錯位不會報錯、只會默默顯示錯的內容。正確做法是從資料 render 卡片。

### 10.6 行為題：「這是 vibe coding 做的，你到底懂多少？」

**不要否認，要重新定義。** 建議框架：

> 「對，我大量使用 AI 輔助開發。我的角色比較接近**技術決策者與審查者**：我決定不要框架、決定捲動劫持要在哪些條件下降級、決定圖片先限尺寸再壓縮。程式碼我讀得懂也改得動 —— 比如漣漪效果我可以現在跟你解釋波形函數為什麼要用 `cos²×cos` 而不是單純的高斯，因為要有波谷才像水。我認為 AI 讓我在同樣時間內學到更多，前提是我不接受我看不懂的程式碼。」

接著**主動提供驗證方式**：
> 「你可以隨便挑一段叫我解釋，或是給我一個修改需求我現場改。」

這句話的效果遠大於任何辯解。而這份文件就是你能說出這句話的底氣。

**衍生題「AI 寫的哪一段你當時沒看懂，後來怎麼弄懂的？」**
準備一個真實答案。建議用 `object-fit` 的放大鏡數學（§6.7）或 clip-path 無法補間（§4.7），說明你怎麼靠改參數、看 DevTools 驗證來理解它。

---

## 11. 名詞速查表

| 名詞 | 一句話定義 |
| --- | --- |
| **Reflow / Layout** | 重新計算元素的位置與尺寸，很貴 |
| **Repaint** | 重新畫像素，不改位置 |
| **Composite** | GPU 把圖層疊起來，最便宜 |
| **CRP** | Critical Rendering Path，從 bytes 到畫面的流程 |
| **FOUC / FOUT / FOIT** | 無樣式內容閃現 / 無樣式文字閃現 / 隱形文字閃現 |
| **CLS** | Cumulative Layout Shift，版面位移分數 |
| **LCP** | Largest Contentful Paint，最大內容繪製時間 |
| **TBT** | Total Blocking Time，主執行緒被阻塞的總時間 |
| **DPR** | devicePixelRatio，CSS 像素與實體像素的比 |
| **Layout thrashing** | 讀寫 layout 交錯導致重複強制重算 |
| **Live binding** | ESM 的 import 是活的參照而非值的拷貝 |
| **IoC / DI** | 控制反轉 / 依賴注入 |
| **Debounce / Throttle** | 停止後才執行 / 固定頻率執行 |
| **Lerp** | 線性插值，`a + (b-a)*t` |
| **Easing** | 動畫的速度曲線 |
| **Variable font** | 一個檔案含連續字重/字寬軸的字型 |
| **Blur-up** | 先顯示極小模糊圖，真圖載入後淡入 |
| **Cache busting** | 改網址讓瀏覽器重新下載 |
| **Focus trap** | 把鍵盤焦點限制在對話框內 |
| **Squash and stretch** | 動畫十二原則之一，變形產生重量感 |

---

## 12. 自我驗收練習

按難度排列。**每一題都不要看原始碼先自己寫，再對照。**

1. **（暖身）** 把 drawings 卡片的寬度改成 640px，並確保 1080px 斷點也跟著調整。做完後回答：為什麼改完要跑 `bump-assets.js`？
2. **（CSS）** 不看 `project-grid.css`，自己寫出「3 欄 grid、卡片正方形、欄數隨斷點變 2 再變 1」。
3. **（JS）** 自己實作一個 rAF 節流的 scroll 監聽，在元素進入畫面 40% 時加 class。再改用 IntersectionObserver 寫一次，說出兩者差異。
4. **（數學）** 給定一張 `object-fit: cover`、元素 400×300、原圖 1600×900、`object-position: center 76%` 的圖，算出圖片實際被繪製的矩形。
5. **（除錯）** 把 `scroll.js` 的 `hasScrollableAncestor` 檢查註解掉，觀察 overlay 內的圖片列表為什麼捲不動，並解釋原因。
6. **（架構）** 現在要新增一個「Awards」section，需要在進場後才顯示。寫出你會用哪個接縫、動哪些檔案，並說明為什麼不 import hero。
7. **（重構）** 把專案卡片改成由 `mineport-project-data.js` 動態產生，消除索引耦合。列出這樣做會破壞哪些現有邏輯（提示：`.image-grid-NN` 的 CSS、filter 的 `data-*`、`projectDetails` 的 slice）。
8. **（效能）** 用 DevTools Performance 錄一段從 hero 捲到 contact 的過程，找出最長的一個 task，說明它在做什麼。
9. **（降級）** 把 `hero.css` 觸控區塊裡 `.hero-visual::after` 的 `transition` 註解掉，用手機模式看黑色遮罩怎麼進場，解釋為什麼桌機不需要這行、手機需要。
10. **（載入）** 把 `project-grid.js` 裡 `probe.complete && probe.naturalWidth > 0` 的早退拿掉，重整並觀察已快取的卡片，說明為什麼「往回閃」比原本的問題更糟。

---

## 附錄：常用指令

```bash
# 本機預覽（必須，file:// 會壞）
python3 -m http.server 8000

# 任何 CSS/JS 改動後
node scripts/bump-assets.js

# 新增/更換專案圖片後
node scripts/generate-previews.js            # 只補缺的
node scripts/generate-previews.js --force    # 全部重做
node scripts/compress-large-project-images.js
```

---

*這份文件描述的是 2026-08-15 當下的程式碼狀態（資產版本 `?v=68`）。改動程式後記得回來更新對應章節 —— 一份過期的教科書比沒有更危險。*
