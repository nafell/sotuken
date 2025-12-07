{
  "stage": "diverge",
  "layout": {
    "type": "single_column"
  },
  "version": "4.0",
  "widgets": [
    {
      "id": "free_writing_0",
      "config": {
        "prompt": "研究活動の楽しさ、没頭する状況、寝食を忘れた時の感覚、そしてその後に感じることについて、自由に書き出してください。",
        "timerDuration": 300
      },
      "metadata": {
        "purpose": "ユーザーの「研究活動が楽しすぎて寝食を忘れる」という現状について、頭の中にある漠然とした思考や感情を制限なく書き出し、外部化する。思考の堰き止めを解消し、言語化の足がかりとする。"
      },
      "position": 0,
      "component": "free_writing",
      "dataBindings": [
        {
          "portId": "prompt",
          "direction": "in",
          "entityAttribute": "concern.text"
        },
        {
          "portId": "text",
          "direction": "out",
          "entityAttribute": "concern.text"
        }
      ]
    },
    {
      "id": "brainstorm_cards_1",
      "config": {
        "initialCards": []
      },
      "metadata": {
        "purpose": "フリーライティングで書き出した内容の中から、特にキーワードとなる事柄（研究の魅力、寝食を忘れる具体的な行動、身体的・精神的影響など）をカードとして抽出し、視覚的に洗い出してアイデアを広げる。"
      },
      "position": 1,
      "component": "brainstorm_cards",
      "dataBindings": []
    }
  ],
  "metadata": {
    "llmModel": "fallback",
    "generatedAt": 1764744547216
  },
  "sessionId": "4ab37af6-dbca-4c19-af73-66e46d3077cc",
  "reactiveBindings": {
    "bindings": [],
    "metadata": {
      "version": "4.0",
      "generatedAt": 1764744547216
    }
  }
}