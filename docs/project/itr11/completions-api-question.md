結論から言うと：

* **その `/chat/completions?api-version=2025-03-01-preview` の URL 形式自体は正しい**です（REST を直叩きする場合）。
* ただし **`openai` v6.10.0 から叩くときは、そのフル URL をそのまま `baseURL` にするのは NG** で、SDK に URL を組み立てさせるのが正攻法です。
* gpt-5-mini も **Chat Completions API から利用可能**で、`max_completion_tokens` など推論モデル用のパラメータで動きます。([Microsoft Learn][1])

---

## 1. エンドポイントの形はこれで合ってる？

REST 直叩き前提なら、gpt-5-mini を Chat Completions で呼ぶ URL はこの形で合っています：

```text
POST https://<リソース名>.cognitiveservices.azure.com/openai/deployments/<デプロイ名>/chat/completions?api-version=2025-03-01-preview
```

* `<リソース名>` : Azure AI Foundry / Azure OpenAI のリソース名
* `<デプロイ名>` : gpt-5-mini の「デプロイ名」
* パス：`/openai/deployments/<デプロイ名>/chat/completions`
* クエリ：`api-version=2025-03-01-preview`

これは Azure の他記事でも同じ形で紹介されています。([Qiita][2])

同様に Responses API は：

```text
POST https://<リソース名>.cognitiveservices.azure.com/openai/responses?api-version=2025-04-01-preview
```

で OK です。

> 「リソースグループ名」と書かれていましたが、実際にホスト名になるのは
> **「Azure AI Foundry / Azure OpenAI リソース名」** なのでそこだけ注意です。

---

## 2. `openai` v6.10.0 で Chat Completions を叩く書き方

### 2-1. 一番おすすめ：`AzureOpenAI` クラスを使う

`"openai": "^6.10.0"` なら、Azure 用に **`AzureOpenAI` クラス**が用意されています。([jsr.io][3])

> ✅ URL や `api-version` を自分でくっつけなくてよくなるので、Foundry の `.cognitiveservices.azure.com` でも素直に動きます。

```ts
import { AzureOpenAI } from "openai";

const client = new AzureOpenAI({
  // Foundry / Azure OpenAI のエンドポイント（末尾に /openai は付けない）
  endpoint: "https://<リソース名>.cognitiveservices.azure.com",
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  apiVersion: "2025-03-01-preview",
  // ★ デプロイ名（= gpt-5-mini のデプロイメント名）
  deployment: "gpt-5-mini",
});

async function main() {
  const completion = await client.chat.completions.create({
    // model にはデプロイ名を指定（省略しても deployment が使われる）
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: "You are a JSON-only assistant. Output ONLY valid JSON.",
      },
      {
        role: "user",
        content: "ユーザー情報 {name: '太郎', age: 24} をJSONで返して",
      },
    ],
    // 推論モデルは max_tokens ではなく max_completion_tokens
    max_completion_tokens: 256,
    // CoT を抑えたいなら minimal / low に下げる
    reasoning_effort: "minimal",
    // 必要なら JSON モード
    response_format: { type: "json_object" },
  });

  console.log(completion.choices[0]?.message?.content);
}

main().catch(console.error);
```

`AzureOpenAI` を使うと、内部で：

* `baseURL = "https://<リソース名>.cognitiveservices.azure.com/openai"`
* `?api-version=2025-03-01-preview` を自動付与
* `/deployments/<model>/chat/completions` のパス組み立て

をいい感じにやってくれます。([app.unpkg.com][4])

### 2-2. あえて生 URL を使う場合（非推奨だけど参考）

どうしても自分で URL を組みたいなら、`OpenAI` クラスに `baseURL` を渡して、「最後の `/chat/completions` だけ SDK に任せる」形にします：

```ts
import OpenAI from "openai";

const resource = "<リソース名>";
const deployment = "gpt-5-mini";
const apiVersion = "2025-03-01-preview";
const apiKey = process.env.AZURE_OPENAI_API_KEY!;

const client = new OpenAI({
  apiKey, // ここは使われるけどヘッダ名は SDK が 'api-key' にしてくれる
  baseURL: `https://${resource}.cognitiveservices.azure.com/openai/deployments/${deployment}`,
  defaultQuery: { "api-version": apiVersion },
  defaultHeaders: { "api-key": apiKey },
});

async function main() {
  const completion = await client.chat.completions.create({
    model: deployment,
    messages: [{ role: "user", content: "Hello" }],
    max_completion_tokens: 128,
    reasoning_effort: "minimal",
  });

  console.log(completion.choices[0]?.message?.content);
}

main().catch(console.error);
```

この場合、SDK が `baseURL + "/chat/completions"` を叩くので、**`baseURL` にすでに `/chat/completions` まで含めてしまうと二重になって壊れます**。([Qiita][5])

> なので、**質問に書かれていた URL をそのまま `baseURL` に入れるのはダメ**で、
> `.../deployments/<deployment>` までを `baseURL` にしておくのがポイントです。

---

## 3. Responses API でタイムアウトしがちな理由と、Completions での軽量化ポイント

gpt-5-mini は **推論モデル（reasoning model）扱い**なので、Responses API も Chat Completions API も内部的にはかなりしっかり推論してくれます。([Microsoft Learn][1])

JSON 生成用途でレスポンスが重い／ツールが timeout しがちなときは、以下を意識するとだいぶ軽くなります：

1. **`reasoning_effort` を `minimal` または `low` に落とす**

   * デフォルト `medium` 相当だと、余計なステップをかなり踏みます。

2. **`max_completion_tokens` を絞る**

   * JSON なら 256〜512 もあれば足りるケースが多いので、それより大きくしない。

3. **CoT 的な指示を書かない**

   * 「ステップ・バイ・ステップで」などの指示は避けて、
     「**スキーマに合う JSON だけを返す**」「説明文は一切出力しない」とだけ書く。

4. それでも Responses API 側が重いなら、

   * **実験用は Chat Completions（stateless）に寄せる**
   * 本番でマルチツール・マルチターンが欲しくなったタイミングで Responses に戻す

という運用がバランス良いと思います。

---

## 4. まとめ

* REST 直叩きなら、質問に書かれているような：

  ```text
  https://<resource>.cognitiveservices.azure.com/openai/deployments/<deployment>/chat/completions?api-version=2025-03-01-preview
  ```

  という URL で **gpt-5-mini を Chat Completions 経由で使えます**。([Qiita][2])

* `openai` v6.10.0 から使うなら、

  * **`AzureOpenAI` クラス + `endpoint` + `apiVersion` + `deployment`** を渡すのが一番シンプル。
  * もしくは `baseURL` を `/openai/deployments/<deployment>` までにして `defaultQuery` で `api-version` を付ける。

* JSON 生成実験でレスポンスが遅いときは、
  **`max_completion_tokens` と `reasoning_effort` を絞った Chat Completions** にするのが良さそうです。

もし今の `responses.create(...)` のコード断片を貼ってもらえれば、**それを「同じ挙動の Chat Completions 版」に書き換えた例**もそのまま出します！

[1]: https://learn.microsoft.com/ja-jp/azure/ai-foundry/openai/how-to/reasoning?view=foundry-classic&utm_source=chatgpt.com "Azure OpenAI 推論モデル - GPT-5 シリーズ、o3-mini、o1"
[2]: https://qiita.com/n0bisuke/items/e6b2b877a2b7a9dedae1?utm_source=chatgpt.com "Azure AIサービスとAzure OpenAIとAzure AI Foundryの立ち ..."
[3]: https://jsr.io/%40openai/openai?utm_source=chatgpt.com "OpenAI TypeScript and JavaScript API Library - JSR"
[4]: https://app.unpkg.com/openai%406.3.0/files/azure.mjs?utm_source=chatgpt.com "openai"
[5]: https://qiita.com/n0bisuke/items/9ee0627ea79ccc414b84?utm_source=chatgpt.com "OpenAI公式npmモジュールでAzure Open AIのGPT APIを ..."
